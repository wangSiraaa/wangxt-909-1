from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    phone: Optional[str] = None
    email: Optional[str] = None
    menus: List[Dict[str, Any]] = []


class LeaderInfo(BaseModel):
    id: int
    leader_code: str
    level_name: str
    commission_rate: float
    total_commission: float
    settled_commission: float
    pending_commission: float
    joined_at: datetime


class SupplierInfo(BaseModel):
    id: int
    supplier_code: str
    supplier_name: str
    contact_person: str
    total_payable: float
    paid_amount: float
    pending_amount: float


class GroupOrderSimple(BaseModel):
    id: int
    order_no: str
    product_name: str
    order_amount: float
    commission_amount: float
    order_status: str
    aftersale_status: str
    order_date: datetime


class AfterSaleInfo(BaseModel):
    id: int
    aftersale_no: str
    order_no: str
    aftersale_type: str
    refund_amount: float
    deduction_commission: float
    refund_status: str
    is_completed: bool
    created_at: datetime


class SettlementCreate(BaseModel):
    period_start: date
    period_end: date
    note: Optional[str] = None


class SettlementBatchResponse(BaseModel):
    id: int
    batch_no: str
    period_code: str
    period_start: datetime
    period_end: datetime
    total_orders: int
    total_amount: float
    total_commission: float
    total_supplier_payable: float
    total_refund: float
    total_deduction: float
    net_commission: float
    status: str
    is_locked: bool
    version: int
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    finance_approved_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None


class TrialCalculationResponse(BaseModel):
    period_code: str
    period_start: datetime
    period_end: datetime
    summary: Dict[str, Any]
    eligible_orders: List[Dict[str, Any]]
    excluded_orders: List[Dict[str, Any]]
    deduction_details: List[Dict[str, Any]]
    leader_settlements: List[Dict[str, Any]]
    supplier_settlements: List[Dict[str, Any]]


class DeductionDetailResponse(BaseModel):
    id: int
    deduction_type: str
    description: str
    order_no: str
    order_amount: float
    original_commission: float
    refund_amount: float
    deduction_commission: float
    created_at: datetime


class PaymentRecordResponse(BaseModel):
    id: int
    payment_no: str
    payee_type: str
    payee_name: str
    amount: float
    payment_status: str
    paid_at: Optional[datetime] = None
    note: Optional[str] = None


class AuditLogResponse(BaseModel):
    id: int
    username: str
    role: str
    action: str
    target_type: str
    target_no: Optional[str] = None
    detail: Optional[str] = None
    created_at: datetime


class MenuConfig(BaseModel):
    code: str
    name: str
    path: str
    icon: str
    children: Optional[List[Dict[str, Any]]] = None
    permissions: Dict[str, bool]
