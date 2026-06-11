import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, Base, engine
from app.database import (
    User, RolePermission, LeaderLevel, Leader, Supplier,
    GroupOrder, AfterSaleOrder, CommissionRule
)
from app.auth import hash_password


def init_database():
    print("=" * 60)
    print("  社群团购团长结算系统 - 初始化数据脚本")
    print("=" * 60)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("[1/6] 数据库表结构已重建")

    db = SessionLocal()

    try:
        users_data = [
            {"username": "leader001", "password": "123456", "full_name": "张小明团长", "role": "leader", "phone": "13800000001"},
            {"username": "leader002", "password": "123456", "full_name": "李雪团长", "role": "leader", "phone": "13800000002"},
            {"username": "leader003", "password": "123456", "full_name": "王大力团长", "role": "leader", "phone": "13800000003"},
            {"username": "supplier01", "password": "123456", "full_name": "优选生鲜", "role": "supplier", "phone": "13900000001"},
            {"username": "supplier02", "password": "123456", "full_name": "品质日用", "role": "supplier", "phone": "13900000002"},
            {"username": "op_acc01", "password": "123456", "full_name": "赵会计", "role": "operation_accountant", "phone": "13700000001"},
            {"username": "op_acc02", "password": "123456", "full_name": "钱运营", "role": "operation_accountant", "phone": "13700000002"},
            {"username": "cs01", "password": "123456", "full_name": "孙客服", "role": "customer_service", "phone": "13600000001"},
            {"username": "cs02", "password": "123456", "full_name": "周客服", "role": "customer_service", "phone": "13600000002"},
            {"username": "fin01", "password": "123456", "full_name": "吴财务", "role": "finance_reviewer", "phone": "13500000001"},
            {"username": "fin02", "password": "123456", "full_name": "郑财务经理", "role": "finance_reviewer", "phone": "13500000002"},
        ]

        created_users = {}
        for ud in users_data:
            user = User(
                username=ud["username"],
                password_hash=hash_password(ud["password"]),
                full_name=ud["full_name"],
                role=ud["role"],
                phone=ud["phone"],
                email=f"{ud['username']}@example.com",
                is_active=True,
            )
            db.add(user)
            db.flush()
            created_users[ud["username"]] = user
        print(f"[2/6] 已创建 {len(users_data)} 个用户账户")

        levels_data = [
            {"name": "普通团长", "min_orders": 0, "commission_rate": 0.08, "bonus_rate": 0.00, "description": "入门等级，享受基础佣金"},
            {"name": "银牌团长", "min_orders": 50, "commission_rate": 0.10, "bonus_rate": 0.02, "description": "累计订单50以上，额外2%奖励"},
            {"name": "金牌团长", "min_orders": 200, "commission_rate": 0.12, "bonus_rate": 0.05, "description": "累计订单200以上，额外5%奖励"},
            {"name": "钻石团长", "min_orders": 500, "commission_rate": 0.15, "bonus_rate": 0.08, "description": "累计订单500以上，额外8%奖励"},
        ]
        created_levels = {}
        for ld in levels_data:
            level = LeaderLevel(**ld)
            db.add(level)
            db.flush()
            created_levels[ld["name"]] = level
        print(f"[2/6] 已创建 {len(levels_data)} 个团长等级")

        leaders_data = [
            {"user_key": "leader001", "leader_code": "L20240001", "level_name": "金牌团长", "total_commission": 3500.0, "settled_commission": 2800.0, "pending_commission": 700.0},
            {"user_key": "leader002", "leader_code": "L20240002", "level_name": "银牌团长", "total_commission": 1800.0, "settled_commission": 1200.0, "pending_commission": 600.0},
            {"user_key": "leader003", "leader_code": "L20240003", "level_name": "普通团长", "total_commission": 500.0, "settled_commission": 200.0, "pending_commission": 300.0},
        ]
        created_leaders = {}
        for ld in leaders_data:
            leader = Leader(
                user_id=created_users[ld["user_key"]].id,
                leader_code=ld["leader_code"],
                level_id=created_levels[ld["level_name"]].id,
                total_commission=ld["total_commission"],
                settled_commission=ld["settled_commission"],
                pending_commission=ld["pending_commission"],
            )
            db.add(leader)
            db.flush()
            created_leaders[ld["user_key"]] = leader
        print(f"[2/6] 已创建 {len(leaders_data)} 个团长档案")

        suppliers_data = [
            {"user_key": "supplier01", "supplier_code": "S20240001", "supplier_name": "优选生鲜供应链", "contact_person": "陈经理", "contact_phone": "13911110001", "bank_account": "6222000011112222", "bank_name": "工商银行 北京朝阳支行", "total_payable": 25000, "paid_amount": 18000, "pending_amount": 7000},
            {"user_key": "supplier02", "supplier_code": "S20240002", "supplier_name": "品质日用品有限公司", "contact_person": "林总", "contact_phone": "13911110002", "bank_account": "6222000033334444", "bank_name": "建设银行 上海浦东支行", "total_payable": 15000, "paid_amount": 10000, "pending_amount": 5000},
        ]
        created_suppliers = {}
        for sd in suppliers_data:
            supplier = Supplier(
                user_id=created_users[sd["user_key"]].id,
                supplier_code=sd["supplier_code"],
                supplier_name=sd["supplier_name"],
                contact_person=sd["contact_person"],
                contact_phone=sd["contact_phone"],
                bank_account=sd["bank_account"],
                bank_name=sd["bank_name"],
                total_payable=sd["total_payable"],
                paid_amount=sd["paid_amount"],
                pending_amount=sd["pending_amount"],
            )
            db.add(supplier)
            db.flush()
            created_suppliers[sd["user_key"]] = supplier
        print(f"[2/6] 已创建 {len(suppliers_data)} 个供应商档案")

        rules_data = [
            {"rule_code": "CR-FRESH-001", "rule_name": "生鲜类标准佣金", "product_category": "生鲜", "base_rate": 0.10, "min_order_amount": 0.0},
            {"rule_code": "CR-DAILY-001", "rule_name": "日用品类标准佣金", "product_category": "日用", "base_rate": 0.08, "min_order_amount": 0.0},
            {"rule_code": "CR-PREMIUM-001", "rule_name": "精品类高佣金", "product_category": "精品", "base_rate": 0.15, "min_order_amount": 100.0},
        ]
        for rd in rules_data:
            rule = CommissionRule(**rd, level_bonus_rates={"银牌团长": 0.02, "金牌团长": 0.05, "钻石团长": 0.08})
            db.add(rule)
        print(f"[2/6] 已创建 {len(rules_data)} 条佣金规则")

        now = datetime.utcnow()
        period_start = now - timedelta(days=15)

        products = [
            {"name": "有机蔬菜套餐(5斤)", "code": "PRD-VEG-001", "price": 99.0, "cost": 70.0, "supplier": "supplier01", "category": "生鲜"},
            {"name": "进口车厘子(2斤)", "code": "PRD-FRU-002", "price": 158.0, "cost": 110.0, "supplier": "supplier01", "category": "生鲜"},
            {"name": "散养土鸡蛋(30枚)", "code": "PRD-EGG-003", "price": 58.0, "cost": 40.0, "supplier": "supplier01", "category": "生鲜"},
            {"name": "抽纸(10包/提)", "code": "PRD-PPR-004", "price": 39.9, "cost": 25.0, "supplier": "supplier02", "category": "日用"},
            {"name": "洗衣液(5kg)", "code": "PRD-WSH-005", "price": 89.0, "cost": 55.0, "supplier": "supplier02", "category": "日用"},
            {"name": "厨房清洁套装", "code": "PRD-KCH-006", "price": 128.0, "cost": 80.0, "supplier": "supplier02", "category": "日用"},
            {"name": "五常大米(10斤)", "code": "PRD-RCE-007", "price": 88.0, "cost": 60.0, "supplier": "supplier01", "category": "生鲜"},
            {"name": "高端坚果礼盒", "code": "PRD-NUT-008", "price": 268.0, "cost": 170.0, "supplier": "supplier02", "category": "精品"},
        ]

        orders_data = []
        order_counter = 1

        for leader_key in ["leader001", "leader002", "leader003"]:
            leader = created_leaders[leader_key]
            level = leader.level
            rate = level.commission_rate + level.bonus_rate

            for i in range(6):
                product = products[(order_counter - 1) % len(products)]
                supplier = created_suppliers[product["supplier"]]
                qty = (order_counter % 3) + 1
                order_amount = round(product["price"] * qty, 2)
                cost_amount = round(product["cost"] * qty, 2)
                commission = round(order_amount * rate, 2)

                order_date = period_start + timedelta(
                    days=(order_counter % 14),
                    hours=(order_counter % 10),
                    minutes=(order_counter * 17 % 60)
                )

                has_refund = order_counter in [3, 7, 11]
                has_uncompleted_aftersale = order_counter == 5
                has_dispute = order_counter == 9

                order_no = f"GO{now.strftime('%Y%m%d')}{order_counter:06d}"

                order = GroupOrder(
                    order_no=order_no,
                    leader_id=leader.id,
                    supplier_id=supplier.id,
                    product_name=product["name"],
                    product_code=product["code"],
                    quantity=qty,
                    unit_price=product["price"],
                    order_amount=order_amount,
                    cost_amount=cost_amount,
                    commission_rate=rate,
                    commission_amount=commission,
                    order_status="completed",
                    refund_amount=0.0,
                    aftersale_status="none",
                    dispute_flag=has_dispute,
                    dispute_confirmed=not has_dispute,
                    customer_service_note="存在价格争议，待客服确认" if has_dispute else None,
                    settlement_batch_id=None,
                    order_date=order_date,
                )
                db.add(order)
                db.flush()

                if has_refund:
                    refund_amount = round(order_amount * 0.5, 2)
                    deduction_commission = round(commission * 0.5, 2)
                    aso = AfterSaleOrder(
                        aftersale_no=f"AS{now.strftime('%Y%m%d')}{order_counter:06d}",
                        order_id=order.id,
                        aftersale_type="partial_refund",
                        reason="客户收到部分商品破损，申请部分退款",
                        refund_amount=refund_amount,
                        deduction_commission=deduction_commission,
                        refund_status="refunded",
                        customer_service_id=created_users["cs01"].id,
                        customer_service_note="核实属实，同意部分退款，佣金按比例扣减",
                        is_completed=True,
                        completed_at=order_date + timedelta(hours=6),
                    )
                    db.add(aso)
                    order.aftersale_status = "partial_refund"
                    order.refund_amount = refund_amount

                if has_uncompleted_aftersale:
                    aso = AfterSaleOrder(
                        aftersale_no=f"AS{now.strftime('%Y%m%d')}U{order_counter:05d}",
                        order_id=order.id,
                        aftersale_type="return_refund",
                        reason="商品质量问题，客户要求全额退货退款",
                        refund_amount=order_amount,
                        deduction_commission=commission,
                        refund_status="processing",
                        customer_service_id=created_users["cs02"].id,
                        customer_service_note="已上门取件，待商家确认收货",
                        is_completed=False,
                    )
                    db.add(aso)
                    order.aftersale_status = "processing"

                order_counter += 1

        print(f"[3/6] 已创建 {order_counter - 1} 条团购订单（含退款、售后未完结、争议订单）")

        print()
        print("=" * 60)
        print("  初始化完成！以下是测试账户：")
        print("=" * 60)
        print()
        role_display = {
            "leader": "团长",
            "supplier": "供应商",
            "operation_accountant": "运营会计",
            "customer_service": "客服",
            "finance_reviewer": "财务复核",
        }
        for ud in users_data:
            print(f"  [{role_display.get(ud['role'], ud['role']):>6}] {ud['username']:<15} 密码: 123456  ({ud['full_name']})")
        print()
        print("=" * 60)
        print("  数据概览：")
        print("=" * 60)
        print(f"  团长等级: {len(levels_data)} 个")
        print(f"  团长档案: {len(leaders_data)} 个")
        print(f"  供应商档案: {len(suppliers_data)} 个")
        print(f"  团购订单: {order_counter - 1} 条")
        print(f"  佣金规则: {len(rules_data)} 条")
        print(f"  含退款订单: 3 条（佣金按比例扣减）")
        print(f"  售后未完结: 1 条（不参与结算）")
        print(f"  争议未确认: 1 条（暂缓结算）")
        print()

        db.commit()
        print("[4/6] 数据已提交到数据库")
        print("[5/6] 数据库路径: ./backend/settlement.db")
        print("[6/6] 初始化完成！")
        print()

    except Exception as e:
        db.rollback()
        print(f"  [错误] 初始化失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    init_database()
