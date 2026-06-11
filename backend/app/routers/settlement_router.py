from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from datetime import datetime
import json

from ..database import (
    get_db, SettlementBatch, GroupOrder, DeductionDetail,
    PaymentRecord, Leader, Supplier, User, BatchVersionLog
)
from ..schemas import (
    SettlementCreate, SettlementBatchResponse, TrialCalculationResponse,
    DeductionDetailResponse, PaymentRecordResponse
)
from ..auth import get_current_user, create_audit_log
from ..core.role_permissions import (
    can_transition_status, get_batch_status_display,
    check_role_permission
)
from ..core.settlement_engine import (
    generate_period_code, generate_batch_no,
    collect_orders_for_settlement, aggregate_leader_settlements,
    aggregate_supplier_settlements, build_trial_snapshot,
    check_existing_batch, create_version_log
)

router = APIRouter(prefix="/api/settlements", tags=["结算管理"])


@router.post("/trial-calculation", response_model=TrialCalculationResponse)
def trial_calculation(
    request: Request,
    data: SettlementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    allowed = check_role_permission(current_user.role, "settlement_generate", "can_edit")
    if not allowed and current_user.role not in ["operation_accountant", "finance_reviewer"]:
        raise HTTPException(status_code=403, detail="无权限进行结算试算")

    period_code = generate_period_code(data.period_start, data.period_end)
    existing = check_existing_batch(db, data.period_start, data.period_end)

    eligible_orders, excluded_orders, deduction_details = collect_orders_for_settlement(
        db, data.period_start, data.period_end
    )

    leader_settlements = aggregate_leader_settlements(eligible_orders)
    for ls in leader_settlements:
        leader = db.query(Leader).filter(Leader.id == ls["leader_id"]).first()
        if leader and leader.user:
            ls["leader_code"] = leader.leader_code
            ls["leader_name"] = leader.user.full_name
            if leader.level:
                ls["level_name"] = leader.level.name

    supplier_settlements = aggregate_supplier_settlements(eligible_orders)
    for ss in supplier_settlements:
        supplier = db.query(Supplier).filter(Supplier.id == ss["supplier_id"]).first()
        if supplier:
            ss["supplier_code"] = supplier.supplier_code
            ss["supplier_name"] = supplier.supplier_name

    snapshot = build_trial_snapshot(
        eligible_orders, excluded_orders, deduction_details,
        leader_settlements, supplier_settlements
    )

    snapshot["period_code"] = period_code
    snapshot["existing_batch_id"] = existing.id if existing else None
    snapshot["existing_batch_no"] = existing.batch_no if existing else None

    create_audit_log(
        db, current_user, "TRIAL_CALCULATION",
        "SettlementBatch", None, period_code,
        f"试算周期 {period_code}：符合条件订单{snapshot['summary']['eligible_order_count']}条，排除{snapshot['summary']['excluded_order_count']}条",
        None
    )
    db.commit()

    return TrialCalculationResponse(
        period_code=period_code,
        period_start=data.period_start,
        period_end=data.period_end,
        summary=snapshot["summary"],
        eligible_orders=eligible_orders,
        excluded_orders=excluded_orders,
        deduction_details=deduction_details,
        leader_settlements=leader_settlements,
        supplier_settlements=supplier_settlements,
    )


@router.post("/generate", response_model=SettlementBatchResponse)
def generate_settlement(
    request: Request,
    data: SettlementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "operation_accountant":
        raise HTTPException(status_code=403, detail="仅运营会计可生成结算批次")

    period_code = generate_period_code(data.period_start, data.period_end)
    existing = check_existing_batch(db, data.period_start, data.period_end)

    if existing:
        raise HTTPException(
            status_code=409,
            detail={
                "message": f"该周期已存在结算批次 {existing.batch_no}，请直接使用该批次或删除后重新生成",
                "existing_batch_id": existing.id,
                "existing_batch_no": existing.batch_no,
                "existing_status": existing.status,
            }
        )

    eligible_orders, excluded_orders, deduction_details = collect_orders_for_settlement(
        db, data.period_start, data.period_end
    )
    leader_settlements = aggregate_leader_settlements(eligible_orders)
    supplier_settlements = aggregate_supplier_settlements(eligible_orders)
    snapshot = build_trial_snapshot(
        eligible_orders, excluded_orders, deduction_details,
        leader_settlements, supplier_settlements
    )

    batch = SettlementBatch(
        batch_no=generate_batch_no(period_code),
        period_start=data.period_start,
        period_end=data.period_end,
        period_code=period_code,
        total_orders=snapshot["summary"]["eligible_order_count"],
        total_amount=snapshot["summary"]["total_order_amount"],
        total_commission=snapshot["summary"]["total_net_commission"],
        total_supplier_payable=snapshot["summary"]["total_supplier_payable"],
        total_refund=snapshot["summary"]["total_refund"],
        total_deduction=snapshot["summary"]["total_deduction"],
        net_commission=snapshot["summary"]["total_net_commission"],
        status="reviewing",
        is_locked=False,
        version=1,
        trial_snapshot=snapshot,
        created_by=current_user.id,
    )
    db.add(batch)
    db.flush()

    order_ids = [o["order_id"] for o in eligible_orders]
    if order_ids:
        db.query(GroupOrder).filter(GroupOrder.id.in_(order_ids)).update(
            {GroupOrder.settlement_batch_id: batch.id},
            synchronize_session=False
        )

    for d in deduction_details:
        ded = DeductionDetail(
            batch_id=batch.id,
            order_id=d.get("order_id"),
            aftersale_id=d.get("aftersale_id"),
            deduction_type=d["deduction_type"],
            description=d["description"],
            order_amount=d["order_amount"],
            original_commission=d["original_commission"],
            refund_amount=d["refund_amount"],
            deduction_commission=d["deduction_commission"],
        )
        db.add(ded)

    create_version_log(
        db, batch.id, 1, "BATCH_CREATED", current_user.id,
        None, snapshot, "创建结算批次并生成试算快照"
    )

    create_audit_log(
        db, current_user, "SETTLEMENT_GENERATED",
        "SettlementBatch", batch.id, batch.batch_no,
        f"生成结算批次 {batch.batch_no}，周期 {period_code}，订单{snapshot['summary']['eligible_order_count']}条",
        None
    )
    db.commit()
    db.refresh(batch)

    return batch


@router.get("", response_model=List[SettlementBatchResponse])
def list_settlements(
    status: Optional[str] = None,
    period_code: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(SettlementBatch)
    if status:
        query = query.filter(SettlementBatch.status == status)
    if period_code:
        query = query.filter(SettlementBatch.period_code.like(f"%{period_code}%"))

    if current_user.role == "leader":
        pass
    elif current_user.role == "supplier":
        pass

    return query.order_by(SettlementBatch.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{batch_id}")
def get_settlement_detail(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    batch = db.query(SettlementBatch).filter(SettlementBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="结算批次不存在")

    deductions = db.query(DeductionDetail).filter(DeductionDetail.batch_id == batch_id).all()
    payments = db.query(PaymentRecord).filter(PaymentRecord.batch_id == batch_id).all()
    version_logs = db.query(BatchVersionLog).filter(BatchVersionLog.batch_id == batch_id).order_by(BatchVersionLog.version).all()

    snapshot = batch.trial_snapshot or {}

    return {
        "batch": {
            "id": batch.id,
            "batch_no": batch.batch_no,
            "period_code": batch.period_code,
            "period_start": batch.period_start,
            "period_end": batch.period_end,
            "total_orders": batch.total_orders,
            "total_amount": batch.total_amount,
            "total_commission": batch.total_commission,
            "total_supplier_payable": batch.total_supplier_payable,
            "total_refund": batch.total_refund,
            "total_deduction": batch.total_deduction,
            "net_commission": batch.net_commission,
            "status": batch.status,
            "status_display": get_batch_status_display(batch.status),
            "is_locked": batch.is_locked,
            "version": batch.version,
            "created_at": batch.created_at,
            "reviewed_at": batch.reviewed_at,
            "finance_approved_at": batch.finance_approved_at,
            "paid_at": batch.paid_at,
            "note": batch.note,
        },
        "snapshot": snapshot,
        "deductions": [
            {
                "id": d.id,
                "deduction_type": d.deduction_type,
                "description": d.description,
                "order_no": d.order.order_no if d.order else None,
                "order_amount": d.order_amount,
                "original_commission": d.original_commission,
                "refund_amount": d.refund_amount,
                "deduction_commission": d.deduction_commission,
                "created_at": d.created_at,
            } for d in deductions
        ],
        "payments": [
            {
                "id": p.id,
                "payment_no": p.payment_no,
                "payee_type": p.payee_type,
                "payee_name": p.payee_name,
                "amount": p.amount,
                "payment_status": p.payment_status,
                "paid_at": p.paid_at,
            } for p in payments
        ],
        "version_logs": [
            {
                "id": v.id,
                "version": v.version,
                "operation_type": v.operation_type,
                "operator_name": v.operator.full_name if v.operator else None,
                "change_summary": v.change_summary,
                "created_at": v.created_at,
            } for v in version_logs
        ],
    }


@router.post("/{batch_id}/review")
def review_settlement(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "operation_accountant":
        raise HTTPException(status_code=403, detail="仅运营会计可执行复核")

    batch = db.query(SettlementBatch).filter(SettlementBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="结算批次不存在")

    if not can_transition_status(batch.status, "reviewed", current_user.role):
        raise HTTPException(
            status_code=400,
            detail=f"当前状态为 {get_batch_status_display(batch.status)}，无法执行复核"
        )

    old_snapshot = batch.trial_snapshot
    batch.status = "reviewed"
    batch.reviewed_by = current_user.id
    batch.reviewed_at = datetime.utcnow()
    batch.is_locked = True
    batch.version += 1

    create_version_log(
        db, batch.id, batch.version, "OPERATION_REVIEWED", current_user.id,
        old_snapshot, batch.trial_snapshot,
        f"运营会计 {current_user.full_name} 复核通过，批次锁定，版本升级到 v{batch.version}"
    )
    create_audit_log(
        db, current_user, "SETTLEMENT_REVIEWED",
        "SettlementBatch", batch.id, batch.batch_no,
        f"运营会计复核通过结算批次 {batch.batch_no}",
        None
    )
    db.commit()

    return {"message": "运营复核成功，批次已锁定", "batch_id": batch.id, "status": batch.status}


@router.post("/{batch_id}/finance-approve")
def finance_approve(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "finance_reviewer":
        raise HTTPException(status_code=403, detail="仅财务复核可执行财务确认")

    batch = db.query(SettlementBatch).filter(SettlementBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="结算批次不存在")

    if not can_transition_status(batch.status, "finance_approved", current_user.role):
        raise HTTPException(
            status_code=400,
            detail=f"当前状态为 {get_batch_status_display(batch.status)}，无法执行财务确认"
        )

    batch.status = "finance_approved"
    batch.finance_approved_by = current_user.id
    batch.finance_approved_at = datetime.utcnow()
    batch.version += 1

    create_version_log(
        db, batch.id, batch.version, "FINANCE_APPROVED", current_user.id,
        batch.trial_snapshot, batch.trial_snapshot,
        f"财务 {current_user.full_name} 确认通过，版本升级到 v{batch.version}"
    )
    create_audit_log(
        db, current_user, "SETTLEMENT_FINANCE_APPROVED",
        "SettlementBatch", batch.id, batch.batch_no,
        f"财务确认通过结算批次 {batch.batch_no}",
        None
    )
    db.commit()

    return {"message": "财务确认成功", "batch_id": batch.id, "status": batch.status}


@router.post("/{batch_id}/pay")
def confirm_payment(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "finance_reviewer":
        raise HTTPException(status_code=403, detail="仅财务复核可确认付款")

    batch = db.query(SettlementBatch).filter(SettlementBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="结算批次不存在")

    if not can_transition_status(batch.status, "paid", current_user.role):
        raise HTTPException(
            status_code=400,
            detail=f"当前状态为 {get_batch_status_display(batch.status)}，无法确认付款"
        )

    snapshot = batch.trial_snapshot or {}
    leader_settlements = snapshot.get("leader_settlements", [])
    supplier_settlements = snapshot.get("supplier_settlements", [])
    ts = datetime.utcnow().strftime('%Y%m%d%H%M%S')

    for i, ls in enumerate(leader_settlements):
        leader = db.query(Leader).filter(Leader.id == ls["leader_id"]).first()
        if leader:
            pay = PaymentRecord(
                payment_no=f"PAY-L-{ts}-{i+1:03d}",
                batch_id=batch.id,
                payee_type="leader",
                payee_id=leader.id,
                payee_name=leader.user.full_name if leader.user else f"团长{leader.leader_code}",
                bank_account="",
                bank_name="",
                amount=ls["net_commission"],
                payment_status="completed",
                payment_method="bank_transfer",
                transaction_no=f"TXN-L-{ts}-{i+1:03d}",
                paid_at=datetime.utcnow(),
                created_by=current_user.id,
                note=f"结算批次 {batch.batch_no} - 团长佣金",
            )
            db.add(pay)
            leader.settled_commission += ls["net_commission"]
            leader.pending_commission -= ls["net_commission"]
            if leader.pending_commission < 0:
                leader.pending_commission = 0

    for i, ss in enumerate(supplier_settlements):
        supplier = db.query(Supplier).filter(Supplier.id == ss["supplier_id"]).first()
        if supplier:
            pay = PaymentRecord(
                payment_no=f"PAY-S-{ts}-{i+1:03d}",
                batch_id=batch.id,
                payee_type="supplier",
                payee_id=supplier.id,
                payee_name=supplier.supplier_name,
                bank_account=supplier.bank_account or "",
                bank_name=supplier.bank_name or "",
                amount=ss["payable_amount"],
                payment_status="completed",
                payment_method="bank_transfer",
                transaction_no=f"TXN-S-{ts}-{i+1:03d}",
                paid_at=datetime.utcnow(),
                created_by=current_user.id,
                note=f"结算批次 {batch.batch_no} - 供应商货款",
            )
            db.add(pay)
            supplier.paid_amount += ss["payable_amount"]
            supplier.pending_amount -= ss["payable_amount"]
            if supplier.pending_amount < 0:
                supplier.pending_amount = 0

    batch.status = "paid"
    batch.paid_by = current_user.id
    batch.paid_at = datetime.utcnow()
    batch.version += 1

    create_version_log(
        db, batch.id, batch.version, "PAYMENT_CONFIRMED", current_user.id,
        batch.trial_snapshot, batch.trial_snapshot,
        f"财务 {current_user.full_name} 确认付款完成，版本升级到 v{batch.version}"
    )
    create_audit_log(
        db, current_user, "SETTLEMENT_PAID",
        "SettlementBatch", batch.id, batch.batch_no,
        f"确认付款结算批次 {batch.batch_no}，生成{len(leader_settlements)+len(supplier_settlements)}条付款记录",
        None
    )
    db.commit()

    return {"message": "付款确认成功", "batch_id": batch.id, "status": batch.status}


@router.get("/{batch_id}/deductions", response_model=List[DeductionDetailResponse])
def get_batch_deductions(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    batch = db.query(SettlementBatch).filter(SettlementBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="结算批次不存在")

    deductions = db.query(DeductionDetail).filter(DeductionDetail.batch_id == batch_id).all()
    result = []
    for d in deductions:
        result.append({
            "id": d.id,
            "deduction_type": d.deduction_type,
            "description": d.description,
            "order_no": d.order.order_no if d.order else "",
            "order_amount": d.order_amount,
            "original_commission": d.original_commission,
            "refund_amount": d.refund_amount,
            "deduction_commission": d.deduction_commission,
            "created_at": d.created_at,
        })
    return result


@router.get("/{batch_id}/export")
def export_settlement(
    batch_id: int,
    export_type: str = Query("all", description="all/leaders/suppliers/deductions"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    batch = db.query(SettlementBatch).filter(SettlementBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="结算批次不存在")

    can_export = check_role_permission(current_user.role, "settlement_list", "can_export")
    if not can_export and current_user.role not in ["operation_accountant", "finance_reviewer"]:
        raise HTTPException(status_code=403, detail="无导出权限")

    snapshot = batch.trial_snapshot or {}
    result = {
        "batch_no": batch.batch_no,
        "period_code": batch.period_code,
        "status": get_batch_status_display(batch.status),
        "exported_at": datetime.utcnow().isoformat(),
        "exported_by": current_user.full_name,
    }

    if export_type in ["all", "leaders"]:
        result["leader_settlements"] = snapshot.get("leader_settlements", [])
    if export_type in ["all", "suppliers"]:
        result["supplier_settlements"] = snapshot.get("supplier_settlements", [])
    if export_type in ["all", "deductions"]:
        result["deductions"] = snapshot.get("deduction_details", [])
    if export_type == "all":
        result["eligible_orders"] = snapshot.get("eligible_orders", [])
        result["excluded_orders"] = snapshot.get("excluded_orders", [])
        result["summary"] = snapshot.get("summary", {})

    create_audit_log(
        db, current_user, "SETTLEMENT_EXPORTED",
        "SettlementBatch", batch.id, batch.batch_no,
        f"导出结算批次 {batch.batch_no}，类型 {export_type}",
        None
    )
    db.commit()

    return result
