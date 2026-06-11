from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from datetime import datetime

from ..database import (
    get_db, GroupOrder, AfterSaleOrder, Leader, Supplier, User,
    LeaderLevel, CommissionRule, AuditLog, PaymentRecord
)
from ..auth import get_current_user, create_audit_log
from ..core.role_permissions import check_role_permission

router = APIRouter(prefix="/api", tags=["通用查询"])


@router.get("/orders")
def list_orders(
    status: Optional[str] = None,
    aftersale_status: Optional[str] = None,
    leader_id: Optional[int] = None,
    supplier_id: Optional[int] = None,
    period_start: Optional[str] = None,
    period_end: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(GroupOrder)

    if current_user.role == "leader":
        leader = db.query(Leader).filter(Leader.user_id == current_user.id).first()
        if leader:
            query = query.filter(GroupOrder.leader_id == leader.id)
    elif current_user.role == "supplier":
        supplier = db.query(Supplier).filter(Supplier.user_id == current_user.id).first()
        if supplier:
            query = query.filter(GroupOrder.supplier_id == supplier.id)

    if status:
        query = query.filter(GroupOrder.order_status == status)
    if aftersale_status:
        query = query.filter(GroupOrder.aftersale_status == aftersale_status)
    if leader_id:
        query = query.filter(GroupOrder.leader_id == leader_id)
    if supplier_id:
        query = query.filter(GroupOrder.supplier_id == supplier_id)
    if period_start:
        query = query.filter(GroupOrder.order_date >= datetime.fromisoformat(period_start))
    if period_end:
        query = query.filter(GroupOrder.order_date <= datetime.fromisoformat(period_end))

    orders = query.order_by(GroupOrder.order_date.desc()).offset(skip).limit(limit).all()

    result = []
    for o in orders:
        item = {
            "id": o.id,
            "order_no": o.order_no,
            "product_name": o.product_name,
            "product_code": o.product_code,
            "quantity": o.quantity,
            "unit_price": o.unit_price,
            "order_amount": o.order_amount,
            "cost_amount": o.cost_amount,
            "commission_rate": o.commission_rate,
            "commission_amount": o.commission_amount,
            "order_status": o.order_status,
            "refund_amount": o.refund_amount,
            "aftersale_status": o.aftersale_status,
            "dispute_flag": o.dispute_flag,
            "dispute_confirmed": o.dispute_confirmed,
            "customer_service_note": o.customer_service_note,
            "settlement_batch_id": o.settlement_batch_id,
            "settlement_status": o.settlement_status,
            "order_date": o.order_date,
        }
        if o.leader and o.leader.user:
            item["leader_name"] = o.leader.user.full_name
            item["leader_code"] = o.leader.leader_code
        if o.supplier:
            item["supplier_name"] = o.supplier.supplier_name
            item["supplier_code"] = o.supplier.supplier_code
        result.append(item)

    return result


@router.get("/orders/{order_id}")
def get_order_detail(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    o = db.query(GroupOrder).filter(GroupOrder.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="订单不存在")

    aftersales = db.query(AfterSaleOrder).filter(AfterSaleOrder.order_id == o.id).all()

    return {
        "id": o.id,
        "order_no": o.order_no,
        "product_name": o.product_name,
        "quantity": o.quantity,
        "unit_price": o.unit_price,
        "order_amount": o.order_amount,
        "commission_amount": o.commission_amount,
        "order_status": o.order_status,
        "refund_amount": o.refund_amount,
        "aftersale_status": o.aftersale_status,
        "dispute_flag": o.dispute_flag,
        "dispute_confirmed": o.dispute_confirmed,
        "customer_service_note": o.customer_service_note,
        "settlement_status": o.settlement_status,
        "order_date": o.order_date,
        "leader_name": o.leader.user.full_name if o.leader and o.leader.user else "",
        "supplier_name": o.supplier.supplier_name if o.supplier else "",
        "aftersales": [
            {
                "id": a.id,
                "aftersale_no": a.aftersale_no,
                "aftersale_type": a.aftersale_type,
                "reason": a.reason,
                "refund_amount": a.refund_amount,
                "deduction_commission": a.deduction_commission,
                "refund_status": a.refund_status,
                "is_completed": a.is_completed,
                "customer_service_note": a.customer_service_note,
                "created_at": a.created_at,
            } for a in aftersales
        ]
    }


@router.put("/orders/{order_id}/dispute")
def update_order_dispute(
    order_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "customer_service":
        raise HTTPException(status_code=403, detail="仅客服可处理争议订单")

    order = db.query(GroupOrder).filter(GroupOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    order.dispute_confirmed = data.get("dispute_confirmed", True)
    order.customer_service_note = data.get("customer_service_note", order.customer_service_note)

    create_audit_log(
        db, current_user, "DISPUTE_RESOLVED",
        "GroupOrder", order.id, order.order_no,
        f"客服处理争议订单 {order.order_no}，确认状态：{order.dispute_confirmed}",
        None
    )
    db.commit()

    return {"message": "争议订单处理成功", "order_id": order.id}


@router.get("/aftersales")
def list_aftersales(
    refund_status: Optional[str] = None,
    is_completed: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(AfterSaleOrder)
    if refund_status:
        query = query.filter(AfterSaleOrder.refund_status == refund_status)
    if is_completed is not None:
        query = query.filter(AfterSaleOrder.is_completed == is_completed)

    if current_user.role == "leader":
        pass

    aftersales = query.order_by(AfterSaleOrder.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for a in aftersales:
        item = {
            "id": a.id,
            "aftersale_no": a.aftersale_no,
            "order_no": a.order.order_no if a.order else "",
            "aftersale_type": a.aftersale_type,
            "reason": a.reason,
            "refund_amount": a.refund_amount,
            "deduction_commission": a.deduction_commission,
            "refund_status": a.refund_status,
            "is_completed": a.is_completed,
            "customer_service_note": a.customer_service_note,
            "created_at": a.created_at,
        }
        if a.order and a.order.leader and a.order.leader.user:
            item["leader_name"] = a.order.leader.user.full_name
        result.append(item)
    return result


@router.post("/aftersales/{aftersale_id}/process")
def process_aftersale(
    aftersale_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "customer_service":
        raise HTTPException(status_code=403, detail="仅客服可处理售后")

    aftersale = db.query(AfterSaleOrder).filter(AfterSaleOrder.id == aftersale_id).first()
    if not aftersale:
        raise HTTPException(status_code=404, detail="售后单不存在")

    aftersale.refund_status = data.get("refund_status", aftersale.refund_status)
    aftersale.customer_service_note = data.get("customer_service_note", aftersale.customer_service_note)
    aftersale.is_completed = data.get("is_completed", aftersale.is_completed)
    if aftersale.is_completed:
        aftersale.completed_at = datetime.utcnow()

    if aftersale.order:
        aftersale.order.aftersale_status = aftersale.refund_status
        aftersale.order.refund_amount += aftersale.refund_amount

    create_audit_log(
        db, current_user, "AFTERSALE_PROCESSED",
        "AfterSaleOrder", aftersale.id, aftersale.aftersale_no,
        f"处理售后单 {aftersale.aftersale_no}，状态：{aftersale.refund_status}",
        None
    )
    db.commit()

    return {"message": "售后处理成功", "aftersale_id": aftersale.id}


@router.get("/leaders")
def list_leaders(
    level_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Leader)
    if level_id:
        query = query.filter(Leader.level_id == level_id)

    leaders = query.offset(skip).limit(limit).all()
    result = []
    for l in leaders:
        item = {
            "id": l.id,
            "leader_code": l.leader_code,
            "total_commission": l.total_commission,
            "settled_commission": l.settled_commission,
            "pending_commission": l.pending_commission,
            "joined_at": l.joined_at,
        }
        if l.user:
            item["username"] = l.user.username
            item["full_name"] = l.user.full_name
            item["phone"] = l.user.phone
        if l.level:
            item["level_id"] = l.level.id
            item["level_name"] = l.level.name
            item["commission_rate"] = l.level.commission_rate
        result.append(item)
    return result


@router.get("/suppliers")
def list_suppliers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    suppliers = db.query(Supplier).offset(skip).limit(limit).all()
    result = []
    for s in suppliers:
        item = {
            "id": s.id,
            "supplier_code": s.supplier_code,
            "supplier_name": s.supplier_name,
            "contact_person": s.contact_person,
            "contact_phone": s.contact_phone,
            "total_payable": s.total_payable,
            "paid_amount": s.paid_amount,
            "pending_amount": s.pending_amount,
            "created_at": s.created_at,
        }
        if s.user:
            item["username"] = s.user.username
        result.append(item)
    return result


@router.get("/leader-levels")
def list_leader_levels(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    levels = db.query(LeaderLevel).all()
    return [
        {
            "id": l.id,
            "name": l.name,
            "min_orders": l.min_orders,
            "commission_rate": l.commission_rate,
            "bonus_rate": l.bonus_rate,
            "description": l.description,
        } for l in levels
    ]


@router.get("/commission-rules")
def list_commission_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rules = db.query(CommissionRule).filter(CommissionRule.is_active == True).all()
    return [
        {
            "id": r.id,
            "rule_code": r.rule_code,
            "rule_name": r.rule_name,
            "product_category": r.product_category,
            "base_rate": r.base_rate,
            "level_bonus_rates": r.level_bonus_rates,
            "min_order_amount": r.min_order_amount,
        } for r in rules
    ]


@router.get("/audit-logs")
def list_audit_logs(
    action: Optional[str] = None,
    role: Optional[str] = None,
    target_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["operation_accountant", "finance_reviewer"]:
        raise HTTPException(status_code=403, detail="无权限查看审计日志")

    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if role:
        query = query.filter(AuditLog.role == role)
    if target_type:
        query = query.filter(AuditLog.target_type == target_type)

    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": l.id,
            "username": l.username,
            "role": l.role,
            "action": l.action,
            "target_type": l.target_type,
            "target_no": l.target_no,
            "detail": l.detail,
            "ip_address": l.ip_address,
            "created_at": l.created_at,
        } for l in logs
    ]


@router.get("/payments")
def list_payments(
    payment_status: Optional[str] = None,
    payee_type: Optional[str] = None,
    batch_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["finance_reviewer", "operation_accountant"]:
        if current_user.role == "leader":
            leader = db.query(Leader).filter(Leader.user_id == current_user.id).first()
            if leader:
                query = db.query(PaymentRecord).filter(
                    and_(PaymentRecord.payee_type == "leader", PaymentRecord.payee_id == leader.id)
                )
            else:
                return []
        elif current_user.role == "supplier":
            supplier = db.query(Supplier).filter(Supplier.user_id == current_user.id).first()
            if supplier:
                query = db.query(PaymentRecord).filter(
                    and_(PaymentRecord.payee_type == "supplier", PaymentRecord.payee_id == supplier.id)
                )
            else:
                return []
        else:
            raise HTTPException(status_code=403, detail="无权限查看付款记录")
    else:
        query = db.query(PaymentRecord)

    if payment_status:
        query = query.filter(PaymentRecord.payment_status == payment_status)
    if payee_type:
        query = query.filter(PaymentRecord.payee_type == payee_type)
    if batch_id:
        query = query.filter(PaymentRecord.batch_id == batch_id)

    payments = query.order_by(PaymentRecord.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for p in payments:
        item = {
            "id": p.id,
            "payment_no": p.payment_no,
            "batch_id": p.batch_id,
            "batch_no": p.batch.batch_no if p.batch else "",
            "payee_type": p.payee_type,
            "payee_name": p.payee_name,
            "amount": p.amount,
            "payment_status": p.payment_status,
            "payment_method": p.payment_method,
            "transaction_no": p.transaction_no,
            "paid_at": p.paid_at,
            "note": p.note,
            "created_at": p.created_at,
        }
        result.append(item)
    return result


@router.get("/disputes")
def list_dispute_orders(
    dispute_confirmed: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "customer_service":
        raise HTTPException(status_code=403, detail="仅客服可查看争议订单")

    query = db.query(GroupOrder).filter(GroupOrder.dispute_flag == True)
    if dispute_confirmed is not None:
        query = query.filter(GroupOrder.dispute_confirmed == dispute_confirmed)

    orders = query.order_by(GroupOrder.order_date.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": o.id,
            "order_no": o.order_no,
            "product_name": o.product_name,
            "order_amount": o.order_amount,
            "refund_amount": o.refund_amount,
            "aftersale_status": o.aftersale_status,
            "dispute_confirmed": o.dispute_confirmed,
            "customer_service_note": o.customer_service_note,
            "leader_name": o.leader.user.full_name if o.leader and o.leader.user else "",
            "supplier_name": o.supplier.supplier_name if o.supplier else "",
            "order_date": o.order_date,
        } for o in orders
    ]


@router.get("/me/leader-info")
def get_my_leader_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    leader = db.query(Leader).filter(Leader.user_id == current_user.id).first()
    if not leader:
        raise HTTPException(status_code=404, detail="您不是团长")

    return {
        "id": leader.id,
        "leader_code": leader.leader_code,
        "level_name": leader.level.name if leader.level else "",
        "commission_rate": leader.level.commission_rate if leader.level else 0,
        "bonus_rate": leader.level.bonus_rate if leader.level else 0,
        "total_commission": leader.total_commission,
        "settled_commission": leader.settled_commission,
        "pending_commission": leader.pending_commission,
        "joined_at": leader.joined_at,
    }


@router.get("/me/supplier-info")
def get_my_supplier_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    supplier = db.query(Supplier).filter(Supplier.user_id == current_user.id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="您不是供应商")

    return {
        "id": supplier.id,
        "supplier_code": supplier.supplier_code,
        "supplier_name": supplier.supplier_name,
        "contact_person": supplier.contact_person,
        "contact_phone": supplier.contact_phone,
        "bank_account": supplier.bank_account,
        "bank_name": supplier.bank_name,
        "total_payable": supplier.total_payable,
        "paid_amount": supplier.paid_amount,
        "pending_amount": supplier.pending_amount,
        "created_at": supplier.created_at,
    }


@router.get("/me/commission-summary")
def get_my_commission_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    leader = db.query(Leader).filter(Leader.user_id == current_user.id).first()
    if not leader:
        raise HTTPException(status_code=404, detail="您不是团长")

    orders = db.query(GroupOrder).filter(GroupOrder.leader_id == leader.id).all()
    total_orders = len(orders)
    total_refund_count = sum(1 for o in orders if o.aftersale_status in ["refunded", "partial_refund"])

    settlement_batches = {}
    for o in orders:
        if o.settlement_batch_id:
            bid = o.settlement_batch_id
            if bid not in settlement_batches:
                b = db.query(GroupOrder).filter(GroupOrder.settlement_batch_id == bid).first()
                if b and b.settlement_batch:
                    settlement_batches[bid] = b.settlement_batch.batch_no

    return {
        "total_orders": total_orders,
        "refund_order_count": total_refund_count,
        "total_commission": leader.total_commission,
        "settled_commission": leader.settled_commission,
        "pending_commission": leader.pending_commission,
        "settlement_batches": list(settlement_batches.values()),
    }


@router.get("/dashboard/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role = current_user.role

    if role == "leader":
        leader = db.query(Leader).filter(Leader.user_id == current_user.id).first()
        if not leader:
            return {}
        orders = db.query(GroupOrder).filter(GroupOrder.leader_id == leader.id).count()
        pending_aftersales = db.query(AfterSaleOrder).join(GroupOrder).filter(
            GroupOrder.leader_id == leader.id,
            AfterSaleOrder.is_completed == False
        ).count()
        return {
            "role": "leader",
            "total_orders": orders,
            "pending_aftersales": pending_aftersales,
            "total_commission": leader.total_commission,
            "settled_commission": leader.settled_commission,
            "pending_commission": leader.pending_commission,
        }

    elif role == "supplier":
        supplier = db.query(Supplier).filter(Supplier.user_id == current_user.id).first()
        if not supplier:
            return {}
        orders = db.query(GroupOrder).filter(GroupOrder.supplier_id == supplier.id).count()
        return {
            "role": "supplier",
            "total_orders": orders,
            "total_payable": supplier.total_payable,
            "paid_amount": supplier.paid_amount,
            "pending_amount": supplier.pending_amount,
        }

    elif role == "customer_service":
        pending_aftersales = db.query(AfterSaleOrder).filter(AfterSaleOrder.is_completed == False).count()
        pending_disputes = db.query(GroupOrder).filter(
            GroupOrder.dispute_flag == True,
            GroupOrder.dispute_confirmed == False
        ).count()
        today_aftersales = db.query(AfterSaleOrder).count()
        return {
            "role": "customer_service",
            "pending_aftersales": pending_aftersales,
            "pending_disputes": pending_disputes,
            "today_processed": 0,
        }

    elif role == "operation_accountant":
        draft_batches = db.query(SettlementBatch).filter(SettlementBatch.status == "reviewing").count()
        reviewed_batches = db.query(SettlementBatch).filter(SettlementBatch.status == "reviewed").count()
        paid_batches = db.query(SettlementBatch).filter(SettlementBatch.status == "paid").count()
        pending_aftersales = db.query(AfterSaleOrder).filter(AfterSaleOrder.is_completed == False).count()
        return {
            "role": "operation_accountant",
            "draft_batches": draft_batches,
            "reviewed_batches": reviewed_batches,
            "paid_batches": paid_batches,
            "pending_aftersales": pending_aftersales,
            "total_leaders": db.query(Leader).count(),
            "total_suppliers": db.query(Supplier).count(),
        }

    elif role == "finance_reviewer":
        pending_review = db.query(SettlementBatch).filter(SettlementBatch.status == "reviewed").count()
        approved_batches = db.query(SettlementBatch).filter(SettlementBatch.status == "finance_approved").count()
        paid_batches = db.query(SettlementBatch).filter(SettlementBatch.status == "paid").count()
        total_pending_payment = sum(
            b.total_commission + b.total_supplier_payable
            for b in db.query(SettlementBatch).filter(SettlementBatch.status == "finance_approved").all()
        )
        return {
            "role": "finance_reviewer",
            "pending_review": pending_review,
            "approved_batches": approved_batches,
            "paid_batches": paid_batches,
            "total_pending_payment": round(total_pending_payment, 2),
        }

    return {}
