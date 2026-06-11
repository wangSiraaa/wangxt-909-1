from datetime import datetime
from typing import Dict, List, Any, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from ..database import (
    GroupOrder, AfterSaleOrder, SettlementBatch, DeductionDetail,
    Leader, LeaderLevel, Supplier, CommissionRule, BatchVersionLog
)


def generate_period_code(period_start: datetime, period_end: datetime) -> str:
    return f"{period_start.strftime('%Y%m%d')}-{period_end.strftime('%Y%m%d')}"


def generate_batch_no(period_code: str) -> str:
    ts = datetime.utcnow().strftime('%H%M%S')
    return f"SB{period_code}{ts}"


def calculate_commission(order_amount: float, rate: float, level_bonus: float = 0.0) -> float:
    commission = order_amount * rate
    if level_bonus > 0:
        commission += order_amount * level_bonus
    return round(commission, 2)


def get_leader_commission_rate(db: Session, leader_id: int) -> Tuple[float, float]:
    leader = db.query(Leader).filter(Leader.id == leader_id).first()
    if not leader or not leader.level:
        return 0.10, 0.0
    return leader.level.commission_rate, leader.level.bonus_rate


def check_order_eligible_for_settlement(db: Session, order: GroupOrder) -> Tuple[bool, str]:
    if order.settlement_batch_id is not None:
        batch = db.query(SettlementBatch).filter(
            SettlementBatch.id == order.settlement_batch_id
        ).first()
        if batch and batch.status in ["draft", "reviewing", "reviewed", "finance_approved", "paid"]:
            return False, f"订单已在结算批次 {batch.batch_no} 中"

    pending_aftersales = db.query(AfterSaleOrder).filter(
        and_(
            AfterSaleOrder.order_id == order.id,
            AfterSaleOrder.is_completed == False
        )
    ).all()
    if pending_aftersales:
        return False, f"售后未完结：{len(pending_aftersales)}条售后待处理"

    if order.dispute_flag and not order.dispute_confirmed:
        return False, "存在争议订单，客服未确认"

    if order.order_status not in ["completed", "delivered"]:
        return False, f"订单状态为{order.order_status}，不参与结算"

    return True, "符合条件"


def collect_orders_for_settlement(
    db: Session,
    period_start: datetime,
    period_end: datetime
) -> Tuple[List[Dict], List[Dict], List[Dict]]:
    orders = db.query(GroupOrder).filter(
        and_(
            GroupOrder.order_date >= period_start,
            GroupOrder.order_date <= period_end,
        )
    ).order_by(GroupOrder.order_date.desc()).all()

    eligible_orders = []
    excluded_orders = []
    deduction_details = []

    for order in orders:
        eligible, reason = check_order_eligible_for_settlement(db, order)

        order_data = {
            "order_id": order.id,
            "order_no": order.order_no,
            "product_name": order.product_name,
            "product_code": order.product_code,
            "quantity": order.quantity,
            "unit_price": order.unit_price,
            "order_amount": order.order_amount,
            "cost_amount": order.cost_amount,
            "leader_id": order.leader_id,
            "supplier_id": order.supplier_id,
            "order_date": order.order_date.isoformat() if order.order_date else None,
            "order_status": order.order_status,
            "aftersale_status": order.aftersale_status,
            "refund_amount": order.refund_amount,
        }

        if not eligible:
            excluded_orders.append({**order_data, "exclude_reason": reason})
            continue

        commission_rate, level_bonus = get_leader_commission_rate(db, order.leader_id)
        base_commission = calculate_commission(order.order_amount, commission_rate, level_bonus)

        order_data["commission_rate"] = commission_rate
        order_data["level_bonus"] = level_bonus
        order_data["original_commission"] = base_commission
        order_data["final_commission"] = base_commission

        if order.refund_amount > 0 and order.aftersale_status in ["refunded", "partial_refund"]:
            aftersales = db.query(AfterSaleOrder).filter(
                and_(
                    AfterSaleOrder.order_id == order.id,
                    AfterSaleOrder.is_completed == True
                )
            ).all()

            total_refund = 0.0
            total_deduction = 0.0

            for aso in aftersales:
                total_refund += aso.refund_amount
                total_deduction += aso.deduction_commission

                deduction_details.append({
                    "order_id": order.id,
                    "aftersale_id": aso.id,
                    "deduction_type": "REFUND_COMMISSION",
                    "description": f"售后退款扣减佣金（{aso.aftersale_no}）: {aso.reason or '售后退款'}",
                    "order_amount": order.order_amount,
                    "original_commission": base_commission,
                    "refund_amount": aso.refund_amount,
                    "deduction_commission": round(aso.deduction_commission, 2),
                })

            order_data["refund_amount"] = total_refund
            order_data["deduction_commission"] = round(total_deduction, 2)
            order_data["final_commission"] = round(base_commission - total_deduction, 2)
            if order_data["final_commission"] < 0:
                order_data["final_commission"] = 0.0

        supplier_payable = order.order_amount - order.refund_amount - order_data["final_commission"]
        order_data["supplier_payable"] = round(supplier_payable, 2)

        eligible_orders.append(order_data)

    return eligible_orders, excluded_orders, deduction_details


def aggregate_leader_settlements(eligible_orders: List[Dict]) -> List[Dict]:
    leader_map: Dict[int, Dict] = {}

    for order in eligible_orders:
        leader_id = order["leader_id"]
        if leader_id not in leader_map:
            leader_map[leader_id] = {
                "leader_id": leader_id,
                "total_orders": 0,
                "order_amount_sum": 0.0,
                "refund_sum": 0.0,
                "original_commission_sum": 0.0,
                "deduction_sum": 0.0,
                "net_commission": 0.0,
            }

        lm = leader_map[leader_id]
        lm["total_orders"] += 1
        lm["order_amount_sum"] += order["order_amount"]
        lm["refund_sum"] += order.get("refund_amount", 0.0)
        lm["original_commission_sum"] += order["original_commission"]
        lm["deduction_sum"] += order.get("deduction_commission", 0.0)
        lm["net_commission"] += order["final_commission"]

    for leader_id in leader_map:
        lm = leader_map[leader_id]
        lm["order_amount_sum"] = round(lm["order_amount_sum"], 2)
        lm["refund_sum"] = round(lm["refund_sum"], 2)
        lm["original_commission_sum"] = round(lm["original_commission_sum"], 2)
        lm["deduction_sum"] = round(lm["deduction_sum"], 2)
        lm["net_commission"] = round(lm["net_commission"], 2)

    return list(leader_map.values())


def aggregate_supplier_settlements(eligible_orders: List[Dict]) -> List[Dict]:
    supplier_map: Dict[int, Dict] = {}

    for order in eligible_orders:
        supplier_id = order["supplier_id"]
        if supplier_id not in supplier_map:
            supplier_map[supplier_id] = {
                "supplier_id": supplier_id,
                "total_orders": 0,
                "order_amount_sum": 0.0,
                "refund_sum": 0.0,
                "commission_sum": 0.0,
                "payable_amount": 0.0,
            }

        sm = supplier_map[supplier_id]
        sm["total_orders"] += 1
        sm["order_amount_sum"] += order["order_amount"]
        sm["refund_sum"] += order.get("refund_amount", 0.0)
        sm["commission_sum"] += order["final_commission"]
        sm["payable_amount"] += order["supplier_payable"]

    for supplier_id in supplier_map:
        sm = supplier_map[supplier_id]
        sm["order_amount_sum"] = round(sm["order_amount_sum"], 2)
        sm["refund_sum"] = round(sm["refund_sum"], 2)
        sm["commission_sum"] = round(sm["commission_sum"], 2)
        sm["payable_amount"] = round(sm["payable_amount"], 2)

    return list(supplier_map.values())


def build_trial_snapshot(
    eligible_orders: List[Dict],
    excluded_orders: List[Dict],
    deduction_details: List[Dict],
    leader_settlements: List[Dict],
    supplier_settlements: List[Dict],
) -> Dict[str, Any]:
    total_order_amount = sum(o["order_amount"] for o in eligible_orders)
    total_refund = sum(o.get("refund_amount", 0.0) for o in eligible_orders)
    total_original_commission = sum(o["original_commission"] for o in eligible_orders)
    total_deduction = sum(d["deduction_commission"] for d in deduction_details)
    total_net_commission = sum(o["final_commission"] for o in eligible_orders)
    total_supplier_payable = sum(o["supplier_payable"] for o in eligible_orders)

    return {
        "summary": {
            "eligible_order_count": len(eligible_orders),
            "excluded_order_count": len(excluded_orders),
            "total_order_amount": round(total_order_amount, 2),
            "total_refund": round(total_refund, 2),
            "total_original_commission": round(total_original_commission, 2),
            "total_deduction": round(total_deduction, 2),
            "total_net_commission": round(total_net_commission, 2),
            "total_supplier_payable": round(total_supplier_payable, 2),
            "net_amount": round(total_order_amount - total_refund, 2),
        },
        "eligible_orders": eligible_orders,
        "excluded_orders": excluded_orders,
        "deduction_details": deduction_details,
        "leader_settlements": leader_settlements,
        "supplier_settlements": supplier_settlements,
        "generated_at": datetime.utcnow().isoformat(),
    }


def check_existing_batch(db: Session, period_start: datetime, period_end: datetime) -> Optional[SettlementBatch]:
    period_code = generate_period_code(period_start, period_end)
    return db.query(SettlementBatch).filter(
        SettlementBatch.period_code == period_code,
        SettlementBatch.status.in_(["draft", "reviewing", "reviewed", "finance_approved", "paid"])
    ).first()


def create_version_log(
    db: Session,
    batch_id: int,
    version: int,
    operation_type: str,
    operator_id: int,
    old_snapshot: Dict = None,
    new_snapshot: Dict = None,
    change_summary: str = ""
) -> BatchVersionLog:
    log = BatchVersionLog(
        batch_id=batch_id,
        version=version,
        operation_type=operation_type,
        operator_id=operator_id,
        old_snapshot=old_snapshot,
        new_snapshot=new_snapshot,
        change_summary=change_summary,
    )
    db.add(log)
    db.flush()
    return log
