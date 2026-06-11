from typing import Dict, List, Any

ROLE_MENUS: Dict[str, List[Dict[str, Any]]] = {
    "leader": [
        {
            "code": "dashboard",
            "name": "工作台",
            "path": "/dashboard",
            "icon": "dashboard",
            "permissions": {"can_view": True, "can_edit": False, "can_approve": False, "can_pay": False, "can_export": False}
        },
        {
            "code": "my_orders",
            "name": "我的订单",
            "path": "/orders",
            "icon": "shopping",
            "permissions": {"can_view": True, "can_edit": False, "can_approve": False, "can_pay": False, "can_export": True}
        },
        {
            "code": "my_commission",
            "name": "佣金明细",
            "path": "/commission",
            "icon": "money",
            "permissions": {"can_view": True, "can_edit": False, "can_approve": False, "can_pay": False, "can_export": True}
        },
        {
            "code": "my_aftersales",
            "name": "售后申请",
            "path": "/aftersales",
            "icon": "sync",
            "permissions": {"can_view": True, "can_edit": True, "can_approve": False, "can_pay": False, "can_export": False}
        },
        {
            "code": "my_settlements",
            "name": "结算记录",
            "path": "/settlements",
            "icon": "file-done",
            "permissions": {"can_view": True, "can_edit": False, "can_approve": False, "can_pay": False, "can_export": True}
        },
    ],
    "supplier": [
        {
            "code": "dashboard",
            "name": "工作台",
            "path": "/dashboard",
            "icon": "dashboard",
            "permissions": {"can_view": True, "can_edit": False, "can_approve": False, "can_pay": False, "can_export": False}
        },
        {
            "code": "my_orders",
            "name": "供货订单",
            "path": "/orders",
            "icon": "shopping",
            "permissions": {"can_view": True, "can_edit": False, "can_approve": False, "can_pay": False, "can_export": True}
        },
        {
            "code": "my_payables",
            "name": "货款对账",
            "path": "/payables",
            "icon": "calculator",
            "permissions": {"can_view": True, "can_edit": False, "can_approve": False, "can_pay": False, "can_export": True}
        },
        {
            "code": "my_settlements",
            "name": "结算记录",
            "path": "/settlements",
            "icon": "file-done",
            "permissions": {"can_view": True, "can_edit": False, "can_approve": False, "can_pay": False, "can_export": True}
        },
    ],
    "operation_accountant": [
        {
            "code": "dashboard",
            "name": "工作台",
            "path": "/dashboard",
            "icon": "dashboard",
            "permissions": {"can_view": True, "can_edit": False, "can_approve": False, "can_pay": False, "can_export": False}
        },
        {
            "code": "order_management",
            "name": "订单管理",
            "path": "/orders",
            "icon": "shopping",
            "permissions": {"can_view": True, "can_edit": True, "can_approve": False, "can_pay": False, "can_export": True}
        },
        {
            "code": "aftersale_management",
            "name": "售后管理",
            "path": "/aftersales",
            "icon": "sync",
            "permissions": {"can_view": True, "can_edit": True, "can_approve": False, "can_pay": False, "can_export": True}
        },
        {
            "code": "settlement_management",
            "name": "结算管理",
            "path": "/settlements",
            "icon": "file-done",
            "children": [
                {
                    "code": "settlement_generate",
                    "name": "生成结算",
                    "path": "/settlements/generate",
                    "icon": "plus",
                    "permissions": {"can_view": True, "can_edit": True, "can_approve": True, "can_pay": False, "can_export": True}
                },
                {
                    "code": "settlement_list",
                    "name": "结算批次",
                    "path": "/settlements/list",
                    "icon": "list",
                    "permissions": {"can_view": True, "can_edit": True, "can_approve": True, "can_pay": False, "can_export": True}
                },
                {
                    "code": "deduction_details",
                    "name": "扣减明细",
                    "path": "/settlements/deductions",
                    "icon": "minus-circle",
                    "permissions": {"can_view": True, "can_edit": False, "can_approve": False, "can_pay": False, "can_export": True}
                },
            ],
            "permissions": {"can_view": True, "can_edit": True, "can_approve": True, "can_pay": False, "can_export": True}
        },
        {
            "code": "leader_management",
            "name": "团长管理",
            "path": "/leaders",
            "icon": "team",
            "permissions": {"can_view": True, "can_edit": True, "can_approve": False, "can_pay": False, "can_export": True}
        },
        {
            "code": "supplier_management",
            "name": "供应商管理",
            "path": "/suppliers",
            "icon": "shop",
            "permissions": {"can_view": True, "can_edit": True, "can_approve": False, "can_pay": False, "can_export": True}
        },
        {
            "code": "commission_rules",
            "name": "佣金规则",
            "path": "/commission-rules",
            "icon": "setting",
            "permissions": {"can_view": True, "can_edit": True, "can_approve": False, "can_pay": False, "can_export": True}
        },
        {
            "code": "audit_logs",
            "name": "审计日志",
            "path": "/audit-logs",
            "icon": "history",
            "permissions": {"can_view": True, "can_edit": False, "can_approve": False, "can_pay": False, "can_export": True}
        },
    ],
    "customer_service": [
        {
            "code": "dashboard",
            "name": "工作台",
            "path": "/dashboard",
            "icon": "dashboard",
            "permissions": {"can_view": True, "can_edit": False, "can_approve": False, "can_pay": False, "can_export": False}
        },
        {
            "code": "aftersale_management",
            "name": "售后处理",
            "path": "/aftersales",
            "icon": "sync",
            "permissions": {"can_view": True, "can_edit": True, "can_approve": True, "can_pay": False, "can_export": True}
        },
        {
            "code": "dispute_management",
            "name": "争议订单",
            "path": "/disputes",
            "icon": "warning",
            "permissions": {"can_view": True, "can_edit": True, "can_approve": True, "can_pay": False, "can_export": True}
        },
        {
            "code": "order_management",
            "name": "订单查询",
            "path": "/orders",
            "icon": "shopping",
            "permissions": {"can_view": True, "can_edit": True, "can_approve": False, "can_pay": False, "can_export": True}
        },
        {
            "code": "settlement_list",
            "name": "结算查询",
            "path": "/settlements/list",
            "icon": "file-done",
            "permissions": {"can_view": True, "can_edit": False, "can_approve": False, "can_pay": False, "can_export": True}
        },
    ],
    "finance_reviewer": [
        {
            "code": "dashboard",
            "name": "工作台",
            "path": "/dashboard",
            "icon": "dashboard",
            "permissions": {"can_view": True, "can_edit": False, "can_approve": False, "can_pay": False, "can_export": False}
        },
        {
            "code": "settlement_management",
            "name": "结算管理",
            "path": "/settlements",
            "icon": "file-done",
            "children": [
                {
                    "code": "settlement_pending",
                    "name": "待复核结算",
                    "path": "/settlements/pending",
                    "icon": "clock-circle",
                    "permissions": {"can_view": True, "can_edit": False, "can_approve": True, "can_pay": True, "can_export": True}
                },
                {
                    "code": "settlement_list",
                    "name": "结算批次",
                    "path": "/settlements/list",
                    "icon": "list",
                    "permissions": {"can_view": True, "can_edit": False, "can_approve": True, "can_pay": True, "can_export": True}
                },
                {
                    "code": "payment_records",
                    "name": "付款记录",
                    "path": "/payments",
                    "icon": "bank",
                    "permissions": {"can_view": True, "can_edit": False, "can_approve": False, "can_pay": True, "can_export": True}
                },
            ],
            "permissions": {"can_view": True, "can_edit": False, "can_approve": True, "can_pay": True, "can_export": True}
        },
        {
            "code": "deduction_details",
            "name": "扣减明细",
            "path": "/settlements/deductions",
            "icon": "minus-circle",
            "permissions": {"can_view": True, "can_edit": False, "can_approve": False, "can_pay": False, "can_export": True}
        },
        {
            "code": "leader_commission",
            "name": "团长佣金",
            "path": "/leaders/commission",
            "icon": "team",
            "permissions": {"can_view": True, "can_edit": False, "can_approve": False, "can_pay": False, "can_export": True}
        },
        {
            "code": "supplier_payables",
            "name": "供应商货款",
            "path": "/suppliers/payables",
            "icon": "shop",
            "permissions": {"can_view": True, "can_edit": False, "can_approve": False, "can_pay": False, "can_export": True}
        },
        {
            "code": "audit_logs",
            "name": "审计日志",
            "path": "/audit-logs",
            "icon": "history",
            "permissions": {"can_view": True, "can_edit": False, "can_approve": False, "can_pay": False, "can_export": True}
        },
    ],
}


ROLE_NAMES = {
    "leader": "团长",
    "supplier": "供应商",
    "operation_accountant": "运营会计",
    "customer_service": "客服",
    "finance_reviewer": "财务复核",
}


def get_role_menus(role: str) -> List[Dict[str, Any]]:
    return ROLE_MENUS.get(role, [])


def get_role_name(role: str) -> str:
    return ROLE_NAMES.get(role, role)


def check_role_permission(role: str, menu_code: str, permission: str) -> bool:
    menus = ROLE_MENUS.get(role, [])
    for menu in menus:
        if menu["code"] == menu_code:
            return menu.get("permissions", {}).get(permission, False)
        if "children" in menu:
            for child in menu["children"]:
                if child["code"] == menu_code:
                    return child.get("permissions", {}).get(permission, False)
    return False


BATCH_STATUS_FLOW = {
    "draft": {
        "next": ["reviewing"],
        "allowed_roles": ["operation_accountant"],
        "display_name": "草稿",
    },
    "reviewing": {
        "next": ["reviewed", "draft"],
        "allowed_roles": ["operation_accountant"],
        "display_name": "试算中",
    },
    "reviewed": {
        "next": ["finance_approved", "reviewing"],
        "allowed_roles": ["operation_accountant"],
        "display_name": "运营已复核",
    },
    "finance_approved": {
        "next": ["paid", "reviewed"],
        "allowed_roles": ["finance_reviewer"],
        "display_name": "财务已确认",
    },
    "paid": {
        "next": [],
        "allowed_roles": [],
        "display_name": "已付款",
    },
    "rejected": {
        "next": ["draft"],
        "allowed_roles": ["operation_accountant", "finance_reviewer"],
        "display_name": "已驳回",
    },
}


def can_transition_status(current_status: str, target_status: str, role: str) -> bool:
    if current_status not in BATCH_STATUS_FLOW:
        return False
    flow = BATCH_STATUS_FLOW[current_status]
    if target_status not in flow["next"]:
        return False
    if role not in flow["allowed_roles"] and flow["allowed_roles"]:
        return False
    return True


def get_batch_status_display(status: str) -> str:
    return BATCH_STATUS_FLOW.get(status, {}).get("display_name", status)
