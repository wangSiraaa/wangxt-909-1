from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./settlement.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False)
    phone = Column(String(20))
    email = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    role_permissions = relationship("RolePermission", back_populates="user")


class RolePermission(Base):
    __tablename__ = "role_permissions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    menu_code = Column(String(50), nullable=False)
    can_view = Column(Boolean, default=True)
    can_edit = Column(Boolean, default=False)
    can_approve = Column(Boolean, default=False)
    can_pay = Column(Boolean, default=False)
    can_export = Column(Boolean, default=False)

    user = relationship("User", back_populates="role_permissions")


class Leader(Base):
    __tablename__ = "leaders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    leader_code = Column(String(50), unique=True, nullable=False)
    level_id = Column(Integer, ForeignKey("leader_levels.id"))
    total_commission = Column(Float, default=0.0)
    settled_commission = Column(Float, default=0.0)
    pending_commission = Column(Float, default=0.0)
    joined_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    level = relationship("LeaderLevel")


class LeaderLevel(Base):
    __tablename__ = "leader_levels"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
    min_orders = Column(Integer, default=0)
    commission_rate = Column(Float, nullable=False)
    bonus_rate = Column(Float, default=0.0)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    supplier_code = Column(String(50), unique=True, nullable=False)
    supplier_name = Column(String(200), nullable=False)
    contact_person = Column(String(100))
    contact_phone = Column(String(20))
    bank_account = Column(String(100))
    bank_name = Column(String(200))
    total_payable = Column(Float, default=0.0)
    paid_amount = Column(Float, default=0.0)
    pending_amount = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class GroupOrder(Base):
    __tablename__ = "group_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String(50), unique=True, nullable=False, index=True)
    leader_id = Column(Integer, ForeignKey("leaders.id"))
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    product_name = Column(String(200), nullable=False)
    product_code = Column(String(50))
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, nullable=False)
    order_amount = Column(Float, nullable=False)
    cost_amount = Column(Float, nullable=False)
    commission_rate = Column(Float, default=0.0)
    commission_amount = Column(Float, default=0.0)
    order_status = Column(String(20), default="completed")
    refund_amount = Column(Float, default=0.0)
    aftersale_status = Column(String(20), default="none")
    customer_service_note = Column(Text)
    dispute_flag = Column(Boolean, default=False)
    dispute_confirmed = Column(Boolean, default=True)
    settlement_batch_id = Column(Integer, ForeignKey("settlement_batches.id"), nullable=True)
    order_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    leader = relationship("Leader")
    supplier = relationship("Supplier")
    aftersales = relationship("AfterSaleOrder", back_populates="order")
    settlement_batch = relationship("SettlementBatch", back_populates="orders")


class AfterSaleOrder(Base):
    __tablename__ = "aftersale_orders"

    id = Column(Integer, primary_key=True, index=True)
    aftersale_no = Column(String(50), unique=True, nullable=False)
    order_id = Column(Integer, ForeignKey("group_orders.id"), nullable=False)
    aftersale_type = Column(String(20), nullable=False)
    reason = Column(Text)
    refund_amount = Column(Float, default=0.0)
    deduction_commission = Column(Float, default=0.0)
    refund_status = Column(String(20), default="pending")
    customer_service_id = Column(Integer, ForeignKey("users.id"))
    customer_service_note = Column(Text)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)

    order = relationship("GroupOrder", back_populates="aftersales")
    customer_service = relationship("User")


class SettlementBatch(Base):
    __tablename__ = "settlement_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(50), unique=True, nullable=False, index=True)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    period_code = Column(String(20), nullable=False)
    total_orders = Column(Integer, default=0)
    total_amount = Column(Float, default=0.0)
    total_commission = Column(Float, default=0.0)
    total_supplier_payable = Column(Float, default=0.0)
    total_refund = Column(Float, default=0.0)
    total_deduction = Column(Float, default=0.0)
    net_commission = Column(Float, default=0.0)
    status = Column(String(20), default="draft")
    is_locked = Column(Boolean, default=False)
    version = Column(Integer, default=1)
    trial_snapshot = Column(JSON)
    created_by = Column(Integer, ForeignKey("users.id"))
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    finance_approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    paid_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    finance_approved_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    note = Column(Text)

    orders = relationship("GroupOrder", back_populates="settlement_batch")
    deductions = relationship("DeductionDetail", back_populates="batch")
    payments = relationship("PaymentRecord", back_populates="batch")
    version_logs = relationship("BatchVersionLog", back_populates="batch")


class DeductionDetail(Base):
    __tablename__ = "deduction_details"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("settlement_batches.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("group_orders.id"))
    aftersale_id = Column(Integer, ForeignKey("aftersale_orders.id"))
    deduction_type = Column(String(30), nullable=False)
    description = Column(String(500))
    order_amount = Column(Float, default=0.0)
    original_commission = Column(Float, default=0.0)
    refund_amount = Column(Float, default=0.0)
    deduction_commission = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("SettlementBatch", back_populates="deductions")
    order = relationship("GroupOrder")
    aftersale = relationship("AfterSaleOrder")


class PaymentRecord(Base):
    __tablename__ = "payment_records"

    id = Column(Integer, primary_key=True, index=True)
    payment_no = Column(String(50), unique=True, nullable=False)
    batch_id = Column(Integer, ForeignKey("settlement_batches.id"), nullable=False)
    payee_type = Column(String(20), nullable=False)
    payee_id = Column(Integer, nullable=False)
    payee_name = Column(String(200))
    bank_account = Column(String(100))
    bank_name = Column(String(200))
    amount = Column(Float, nullable=False)
    payment_status = Column(String(20), default="pending")
    payment_method = Column(String(30))
    transaction_no = Column(String(100))
    paid_at = Column(DateTime)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    note = Column(Text)

    batch = relationship("SettlementBatch", back_populates="payments")


class BatchVersionLog(Base):
    __tablename__ = "batch_version_logs"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("settlement_batches.id"), nullable=False)
    version = Column(Integer, nullable=False)
    operation_type = Column(String(30), nullable=False)
    operator_id = Column(Integer, ForeignKey("users.id"))
    change_summary = Column(Text)
    old_snapshot = Column(JSON)
    new_snapshot = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("SettlementBatch", back_populates="version_logs")
    operator = relationship("User", foreign_keys=[operator_id])


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    username = Column(String(50))
    role = Column(String(20))
    action = Column(String(50), nullable=False)
    target_type = Column(String(50))
    target_id = Column(Integer)
    target_no = Column(String(50))
    detail = Column(Text)
    ip_address = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)


class CommissionRule(Base):
    __tablename__ = "commission_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_code = Column(String(50), unique=True, nullable=False)
    rule_name = Column(String(100), nullable=False)
    product_category = Column(String(50))
    base_rate = Column(Float, default=0.10)
    level_bonus_rates = Column(JSON, default={})
    min_order_amount = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    effective_from = Column(DateTime, default=datetime.utcnow)
    effective_to = Column(DateTime, nullable=True)
