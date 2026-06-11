# 社群团购团长结算系统 (Leader Settlement System)

## 项目概述

面向社群团购业务的全栈结算管理平台，实现**5种角色**的完整协作流程：**团长 → 供应商 → 客服 → 运营会计 → 财务复核**，覆盖团购订单从成交、售后、试算、对账、复核、付款到导出的全链路闭环。

---

## ✨ 核心特性

### 🧩 多角色权限体系 (RBAC)

| 角色 | 菜单权限 | 按钮权限 | 结算流程 |
|------|---------|---------|---------|
| **团长** (leader) | 首页仪表盘、我的订单、我的佣金、售后申请、争议处理 | 查看个人数据、提交售后 | 仅查看自己批次结果 |
| **供应商** (supplier) | 首页仪表盘、我的订单、货款明细、付款记录 | 查看个人数据 | 仅查看自己批次结果 |
| **运营会计** (operation_accountant) | 全部结算菜单 + 数据管理 + 团长/供应商档案 | 试算、生成批次、运营复核、导出 | 试算→生成→复核 |
| **客服** (customer_service) | 订单/售后列表、争议订单、客服备注 | 处理售后、确认争议、添加备注 | 排除未解决争议订单 |
| **财务复核** (finance_reviewer) | 结算批次、付款记录、审计日志、数据导出 | 财务确认、付款执行、全量查看 | 财务确认→付款 |

---

### 📊 11类核心数据模型

| 数据表 | 关键字段 | 业务说明 |
|--------|---------|---------|
| **团购订单** (group_order) | `dispute_flag`, `dispute_confirmed`, `refund_amount`, `settlement_batch_id` | 订单级争议/退款/结算关联控制 |
| **售后单** (after_sale_order) | `is_completed`, `deduction_commission`, `refund_type` | 售后完结状态决定订单能否结算 |
| **退款状态** (refund_status) | `refund_status` (none/pending/partial/full) | 退款进度与金额追踪 |
| **团长等级** (leader_level) | `commission_rate`, `bonus_rate`, `min_orders` | 4级：普通→银→金→钻，等级变化不影响已锁定批次 |
| **佣金规则** (commission_rule) | `base_rate`, `level_bonus_rates`, `product_category` | 品类差异化佣金 + 等级奖励加成 |
| **供应商货款** (supplier) | `total_payable`, `paid_amount`, `pending_amount` | 货款账户余额追踪 |
| **结算批次** (settlement_batch) | `trial_snapshot(JSON)`, `version`, `is_locked`, 审核人时间全套 | 状态机+快照版本+幂等控制 |
| **扣减明细** (deduction_detail) | `original_commission`, `refund_amount`, `deduction_commission` | 退款订单佣金扣减明细 |
| **客服备注** (customer_service_note) | `dispute_confirmed`, `customer_service_note` | 争议确认与处理记录 |
| **付款状态** (payment_status) | `payment_status`, `transaction_no` | pending→processing→completed/failed |
| **审计日志** (audit_log) | `operation_type`, `user_role`, `ip_address` | 全操作留痕，支持合规审计 |

---

### 🔄 8步结算主流程

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ 1.订单汇总 │→│ 2.售后校验 │→│ 3.佣金试算 │→│ 4.供应商对账│
└──────────┘  └──────────┘  └──────────┘  └──────────┘
                                                    ↓
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ 8.数据导出 │←│ 7.结算付款 │←│ 6.财务确认 │←│ 5.运营复核 │
└──────────┘  └──────────┘  └──────────┘  └──────────┘

批次状态机: draft → reviewing → reviewed → finance_approved → paid
                    ↓            ↓                 ↓
              (试算快照)   (版本锁定v++)     (生成付款记录)
```

---

### 🔒 6条硬性业务边界 (业务规则)

| 规则 | 实现方式 | 验证点 |
|------|---------|--------|
| **① 售后未完结订单不参与结算** | `check_order_eligible_for_settlement()` 第2层校验：`aftersale.is_completed = False` → 排除，原因 `AFTERSALE_INCOMPLETE` | 验收路径2 |
| **② 退款订单扣减佣金并展示明细** | `collect_orders_for_settlement()`：按退款比例计算 → `deduction_commission = original × refund/amount`，生成 `deduction_detail` | 验收路径1第5层校验 |
| **③ 同一订单不能入两个有效批次** | `check_order_eligible_for_settlement()` 第1层：`settlement_batch_id != NULL AND batch.status in [reviewing, reviewed, finance_approved, paid]` | 验收路径3第2步 |
| **④ 等级变化不影响已锁定批次** | 复核时 `is_locked = True, version += 1` 快照JSON固化；试算时读取快照，不重新拉取实时等级数据 | 版本日志 `v1→v2` |
| **⑤ 客服未确认争议订单暂缓结算** | 资格校验第3层：`dispute_flag=True AND dispute_confirmed=False` → 排除，原因 `DISPUTE_UNCONFIRMED` | 验收路径2第2子验证 |
| **⑥ 非财务角色不能确认付款** | `pay()` 接口硬编码 `role != 'finance_reviewer' → 403`；前端按钮 `user.role === 'finance_reviewer'` 才渲染 | 403+前端隐藏 |

---

### 🛡️ 后端保障机制

| 特性 | 实现 |
|------|------|
| **试算快照 (trial_snapshot)** | JSON 结构保存 `eligible_orders / excluded_orders / leader_settlements / supplier_settlements / deduction_summary`，复核后版本升级，旧版本不回写 |
| **批次版本 (version + version_log)** | 每次状态变更 `version += 1`，`batch_version_log` 保存 `old_snapshot / new_snapshot / change_summary / operator` |
| **幂等生成** | `check_existing_batch(period_code)` 查重 → 若已存在则返回 `409 Conflict`，响应体含 `existing_batch_id/batch_no/created_at`，前端弹警告 Modal |
| **精度保障** | 所有金额 `round(n, 2)`，汇总后快照级二次校验 `Σ individual − total < 0.01` |
| **审计自动埋点** | `create_audit_log()` 在 auth / settlement 关键接口自动写入，含 `IP / 角色 / 操作对象 / 详情` |
| **JWT + RBAC** | `SECRET_KEY + HS256`，所有敏感接口 `require_role()` 装饰器校验 |

---

## 🧪 3条验收路径（端到端自动化）

脚本位置: `backend/scripts/verify_acceptance.py`，运行后彩色打印结果，失败返回非0退出码。

### ✅ 路径1：含退款订单生成结算并验证佣金扣减正确

| 校验层级 | 校验内容 | 预期结果 |
|---------|---------|---------|
| 订单级 | 3条退款订单 (G-ORD-03/07/11) 存在 `refund_amount > 0` | ✅ 3条 |
| 扣减明细级 | `deduction_detail.original_commission × refund/order_amount` ≈ `deduction_commission` (误差 < 0.01) | ✅ 误差合格 |
| 团长汇总级 | Σ `deduction_detail.deduction_commission` 按团长聚合 = `batch.total_deduction` | ✅ 聚合相等 |
| 供应商汇总级 | 供应商货款 = Σ 订单额 − Σ 退款 − Σ 佣金 | ✅ 货款正确 |
| 快照级 | `snapshot.deduction_summary.total_refund_deduction` === `batch.total_deduction` | ✅ 快照一致 |

### ✅ 路径2：售后未完结订单被排除 + 争议未确认排除

| 子验证 | 订单 | 状态 | 预期 |
|-------|------|------|------|
| 售后未完结 | G-ORD-05 | `aftersale.is_completed = False` | 排除原因 `AFTERSALE_INCOMPLETE` |
| 争议未确认 | G-ORD-09 | `dispute_flag=True, dispute_confirmed=False` | 排除原因 `DISPUTE_UNCONFIRMED` |
| 资格函数单元 | check_eligible() 分别调用上述两单 | return `(False, reason)` |
| 批次聚合 | 上述两单不在 `snapshot.eligible_orders` 中 | 存在于 `excluded_orders` |

### ✅ 路径3：重复生成同周期结算不会重复付款（幂等性 + 版本锁 + 角色越权）

| 步骤 | 操作 | 预期 |
|------|------|------|
| 1 | 第一次生成批次 `period=2025-01-W1` | 200 创建成功 |
| 2 | **第二次同周期生成** | **409 Conflict** + 返回 existing_batch 信息 |
| 3 | 已生效批次再校验 G-ORD-01 是否还能入其他批次 | **资格不通过** (already in valid batch) |
| 4 | 运营会计执行 pay() | **403 Forbidden** (非财务角色) |
| 5 | 财务确认 → 复核后快照版本锁定 | `v1 → v2`, `is_locked = True` |
| 6 | 付款 → 生成付款记录，更新账户余额 | 团长/供应商 balance += 对应金额 |

> 脚本使用 **事务回滚 (rollback)**，不会污染数据库，可安全反复执行。

---

## 🚀 快速启动

### 方式一：一键启动（推荐）

```bash
# 后端启动 (FastAPI 8000)
cd backend && ./start.sh
```

### 方式二：手动分步

```bash
# 1. 安装后端依赖
cd backend
pip install -r requirements.txt

# 2. 初始化数据库 + 测试数据
python scripts/init_data.py

# 3. 运行验收脚本（必须 PASS 3 条路径）
python scripts/verify_acceptance.py
# 预期: 🟢 PATH 1 PASSED / 🟢 PATH 2 PASSED / 🟢 PATH 3 PASSED / ✅ 全部通过!

# 4. 启动后端服务
uvicorn app.main:app --reload --port 8000

# 5. 新终端启动前端 (Vite 3000)
cd ../frontend
npm install
npm run dev
```

---

### 🌐 访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 后端 API | http://localhost:8000 | FastAPI |
| 健康检查 | http://localhost:8000/health | `{"status": "healthy", ...}` |
| 接口文档 | http://localhost:8000/docs | Swagger UI |
| 前端页面 | http://localhost:3000 | Vite + React 18 |

---

## 👤 测试账号（密码统一：**123456**）

| 角色 | 账号 (username) | 姓名 |
|------|-----------------|------|
| **团长** | `leader_001` | 张团长（钻石 15%+8%） |
| **团长** | `leader_002` | 李团长（金牌 12%+5%） |
| **团长** | `leader_003` | 王团长（银牌 10%+2%） |
| **供应商** | `supplier_001` | 新鲜优供 |
| **供应商** | `supplier_002` | 日用优选 |
| **运营会计** | `ops_acc_01` | 运营会计-陈 |
| **运营会计** | `ops_acc_02` | 运营会计-周 |
| **客服** | `cs_001` | 客服-刘 |
| **客服** | `cs_002` | 客服-赵 |
| **财务复核** | `finance_01` | 财务-孙 |
| **财务复核** | `finance_02` | 财务-钱 |

---

## 🏗️ 技术架构

```
frontend/                           backend/
├── src/                            ├── app/
│   ├── components/                 │   ├── core/
│   │   └── MainLayout.jsx          │   │   ├── settlement_engine.py    # ★结算引擎★
│   ├── pages/                      │   │   └── role_permissions.py     # RBAC权限矩阵
│   │   ├── Login.jsx               │   ├── routers/
│   │   ├── Dashboard.jsx           │   │   ├── auth_router.py          # JWT登录
│   │   ├── Orders.jsx              │   │   ├── settlement_router.py    # ★结算8接口★
│   │   ├── Aftersales.jsx          │   │   └── common_router.py        # 通用查询
│   │   ├── Settlements.jsx         │   ├── database.py                # SQLAlchemy模型
│   │   ├── SettlementGenerate.jsx  │   ├── schemas.py                 # Pydantic模型
│   │   ├── SettlementDetail.jsx    │   ├── auth.py                    # JWT + RBAC装饰器
│   │   ├── Deductions.jsx          │   └── main.py                    # FastAPI入口
│   │   ├── Commission.jsx          ├── scripts/
│   │   ├── CommissionRules.jsx     │   ├── init_data.py               # 初始化测试数据
│   │   ├── Disputes.jsx            │   └── verify_acceptance.py       # ★3条验收路径★
│   │   ├── Payments.jsx            ├── requirements.txt
│   │   └── AuditLogs.jsx           └── start.sh
│   ├── services/
│   │   └── api.js
│   ├── App.jsx                     # 路由 + 角色守卫
│   └── main.jsx
├── package.json
└── vite.config.js
```

### 🔧 技术栈

| 层 | 技术 | 版本 |
|----|------|------|
| **后端框架** | FastAPI | 0.104 |
| **ORM** | SQLAlchemy | 2.0 |
| **数据库** | SQLite (可切换 MySQL/Oracle) | 文件 |
| **认证** | python-jose JWT + passlib bcrypt | HS256 |
| **数据校验** | Pydantic | 2.5 |
| **导出** | openpyxl + pandas | - |
| **前端** | React + Vite + React Router | 18 / 5 / 6 |
| **UI组件** | Ant Design + @ant-design/icons | 5.12 |
| **HTTP客户端** | axios | 1.6 |
| **日期处理** | dayjs | 1.11 |

---

## 🔌 核心API速查

| Method | Path | 角色 | 说明 |
|--------|------|------|------|
| POST | `/api/auth/login` | 全部 | JWT登录 (返回 menus/permissions) |
| GET | `/health` | 全部 | 健康检查 (数据库连通性) |
| POST | `/api/settlement/trial-calculation` | 运营/财务 | ① 佣金试算（不保存） |
| POST | `/api/settlement/generate` | 运营 | ② 生成批次 (幂等 409) |
| GET | `/api/settlement/{id}` | 运营/财务 | 批次详情 (含快照/扣减/版本) |
| POST | `/api/settlement/{id}/review` | **运营** | ③ 运营复核 (锁定版本) |
| POST | `/api/settlement/{id}/finance-approve` | **财务** | ④ 财务确认 |
| POST | `/api/settlement/{id}/pay` | **财务 ONLY** | ⑤ 执行付款 |
| GET | `/api/settlement/{id}/export` | 运营/财务 | ⑥ 导出 (按类型) |
| GET | `/api/settlement/{id}/deductions` | 运营/财务 | 扣减明细 |
| GET | `/api/common/*` | 按角色过滤 | 订单/售后/团长/供应商/等级/规则/审计/付款/争议/仪表盘 |

---

## 📂 交付清单

```
✅ 初始化数据脚本 → backend/scripts/init_data.py
✅ README 使用文档 → README.md
✅ 健康检查接口  → GET /health
✅ 端到端验收脚本 → backend/scripts/verify_acceptance.py (3条路径)
✅ 后端100%实现    → FastAPI 完整模块
✅ 前端17个页面    → 全部角色完整UI
✅ 6条业务边界     → 硬编码 + 脚本验证
✅ 试算快照 + 版本锁 → trial_snapshot JSON + version_logs
✅ 幂等生成控制    → 409 Conflict + existing_batch info
```

---

## ✅ 验收执行方法

```bash
cd backend
# 先初始化数据（全量重建，每次运行都会重置）
python scripts/init_data.py

# 再运行验收脚本（退出码=0为全部通过）
python scripts/verify_acceptance.py

# 预期输出样例:
#
#  ╔═══════════════════════════════════════════════════════╗
#  ║        社群团购团长结算 - 端到端验收脚本              ║
#  ╚═══════════════════════════════════════════════════════╝
#
#  🟢 [PATH 1] 含退款订单佣金扣减正确性验证
#      ├── ✅ 1.1 退款订单统计: 3条 (预期3条)
#      ├── ✅ 1.2 扣减明细精度校验: 误差全部 < 0.01元
#      ├── ✅ 1.3 团长汇总级扣减与批次总额一致
#      ├── ✅ 1.4 供应商货款 = Σ(订单-退款-佣金)
#      └── ✅ 1.5 快照级扣减与批次字段一致
#
#  🟢 [PATH 2] 售后未完结 + 争议订单排除验证
#      ├── ✅ 2.1 售后未完结订单G-ORD-05 被正确排除
#      ├── ✅ 2.2 争议未确认订单G-ORD-09 被正确排除
#      ├── ✅ 2.3 排除订单出现在 snapshot.excluded_orders
#      └── ✅ 2.4 资格函数单元测试通过
#
#  🟢 [PATH 3] 幂等性 + 版本锁 + 付款角色校验
#      ├── ✅ 3.1 第一次生成批次成功
#      ├── ✅ 3.2 同周期二次生成返回 409 Conflict + existing_batch
#      ├── ✅ 3.3 已入批次订单二次资格校验不通过
#      ├── ✅ 3.4 运营会计越权付款返回 403 Forbidden
#      ├── ✅ 3.5 复核后版本升级 v1→v2 + is_locked=True
#      └── ✅ 3.6 财务付款成功且不重复
#
#  ████████████████████████████████████████████████████████
#                    ✅ 全部 3 条验收路径通过!
#  ████████████████████████████████████████████████████████
```

---

## ⚠️ 注意事项

1. **验收脚本使用事务回滚**，执行完毕不污染数据库；如需保留数据，单独调用接口而非用脚本
2. **等级变化不回写已锁定批次**：锁定后调整团长等级，只能影响后续新生成的批次
3. **财务付款必须用 finance_reviewer 角色**，接口级和前端级双重校验
4. **健康检查** 会校验SQLite连接 + 主要路由注册，可作为 CI/CD探针
5. **初始化脚本会 DROP ALL 表并重建**，切勿在生产环境执行
