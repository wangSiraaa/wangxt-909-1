#!/usr/bin/env python3
"""后端核心API冒烟测试"""
import sys, json, urllib.request, urllib.error

BASE = "http://localhost:8765"
TOKEN_FILE = "/tmp/smoke_token.txt"

def request(method, path, data=None, token=None):
    url = BASE + path
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")

def main():
    print("=" * 60)
    print("🔥 后端核心API冒烟测试")
    print("=" * 60)

    # 1. 健康检查
    print("\n[1/7] GET /health ...")
    code, data = request("GET", "/health")
    assert code == 200, f"健康检查失败 HTTP={code}"
    assert data["status"] == "ok", f"状态异常: {data['status']}"
    assert data["checks"]["database_connection"], "数据库连接失败: " + str(data["database"])
    print(f"  ✅ PASS - {data['service']} v{data['version']}")

    # 2. 登录 - 运营会计
    print("\n[2/7] POST /api/auth/login (运营会计 op_acc01) ...")
    code, data = request("POST", "/api/auth/login", {"username": "op_acc01", "password": "123456"})
    assert code == 200, f"登录失败 HTTP={code}: {data}"
    token = data["access_token"]
    user = data["user"]
    assert user["role"] == "operation_accountant", f"角色不匹配: {user['role']}"
    assert len(user["menus"]) > 0, "菜单为空"
    with open(TOKEN_FILE, "w") as f:
        f.write(token)
    print(f"  ✅ PASS - 用户={user['username']}, 菜单数={len(user['menus'])}, 角色权限已返回")

    # 3. 佣金试算
    print("\n[3/7] POST /api/settlements/trial-calculation ...")
    code, data = request("POST", "/api/settlements/trial-calculation",
                        {"period_start": "2026-05-12", "period_end": "2026-06-10"}, token=token)
    assert code == 200, f"试算失败 HTTP={code}: {data}"
    s = data["summary"]
    eligible = s["eligible_order_count"]
    excluded = s["excluded_order_count"]
    deduction_count = len(data.get("deduction_details", []))
    print(f"  ✅ PASS - 符合={eligible}, 排除={excluded}, 扣减={deduction_count}")
    print(f"       净佣金=¥{s['total_net_commission']:.2f}, 供应商货款=¥{s['total_supplier_payable']:.2f}")

    # 检查排除原因
    exc = data.get("excluded_orders", [])
    for o in exc:
        print(f"       🚫 {o['order_no']} -> {o['exclude_reason']}")
    assert len(exc) == 2, f"排除订单数量应为2, 实际={len(exc)}"
    assert any("售后未完结" in o["exclude_reason"] for o in exc), "未找到售后未完结排除"
    assert any("争议" in o["exclude_reason"] for o in exc), "未找到争议订单排除"

    # 4. 生成结算批次
    print("\n[4/7] POST /api/settlements/generate ...")
    code, data = request("POST", "/api/settlements/generate",
                        {"period_start": "2026-05-12", "period_end": "2026-06-10",
                         "note": "API冒烟测试批次"}, token=token)
    assert code in (200, 201), f"生成失败 HTTP={code}: {data}"
    batch = data.get("batch") or data
    batch_id = batch["id"]
    print(f"  ✅ PASS - 批次号={batch['batch_no']}, 订单={batch['total_orders']}, v{batch['version']}")

    # 5. 幂等测试 - 同周期二次生成应409
    print("\n[5/7] POST /api/settlements/generate (同周期第二次 - 幂等性) ...")
    code, data = request("POST", "/api/settlements/generate",
                        {"period_start": "2026-05-12", "period_end": "2026-06-10"}, token=token)
    assert code == 409, f"幂等失败! 期望409, 实际={code}"
    print(f"  ✅ PASS - HTTP 409 Conflict - existing_batch_id={data.get('existing_batch_id')}")

    # 6. 运营会计复核 (is_locked=True, version++)
    print(f"\n[6/7] POST /api/settlements/{batch_id}/review (运营复核-锁批次) ...")
    code, data = request("POST", f"/api/settlements/{batch_id}/review",
                        {"note": "运营复核通过"}, token=token)
    assert code == 200, f"复核失败 HTTP={code}: {data}"
    b = data.get("batch") or data
    assert b["is_locked"] == True, "锁定状态未设置"
    assert b["version"] >= 2, f"版本未升级: {b['version']}"
    print(f"  ✅ PASS - 已锁定, 版本 v{b['version']}, 状态={b['status']}")

    # 7. 非财务角色付款测试 - 应返回403
    print("\n[7/7] POST /api/settlements/{id}/pay (运营会计越权付款) ...")
    code, data = request("POST", f"/api/settlements/{batch_id}/pay",
                        {"payment_method": "bank_transfer"}, token=token)
    assert code == 403, f"越权付款未被拦截! 期望403, 实际={code}"
    print(f"  ✅ PASS - HTTP 403 Forbidden - {data.get('detail','')}")

    print()
    print("=" * 60)
    print("🎯 全部 7 项核心API冒烟测试通过!")
    print("=" * 60)
    print()
    print("💡 下一步：")
    print("   - 登录财务账号 fin01/123456 完成财务确认 + 实际付款")
    print("   - 启动前端: cd frontend && npm install && npm run dev")
    print("   - 访问 http://localhost:3000")
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError as e:
        print(f"\n❌ 测试失败: {e}")
        sys.exit(1)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"\n❌ 运行异常: {e}")
        sys.exit(2)
