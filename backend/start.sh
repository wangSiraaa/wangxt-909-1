#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=============================================="
echo "  后端启动脚本 - 社群团购团长结算系统"
echo "=============================================="
echo ""

if [ ! -f "requirements_installed.flag" ]; then
    echo "[1/3] 安装 Python 依赖..."
    pip install -r requirements.txt
    touch requirements_installed.flag
else
    echo "[1/3] 依赖已安装，跳过"
fi

if [ ! -f "settlement.db" ]; then
    echo ""
    echo "[2/3] 初始化数据库并插入测试数据..."
    python scripts/init_data.py
else
    echo "[2/3] 数据库已存在，跳过初始化 (如需重置请删除 settlement.db)"
fi

echo ""
echo "[3/3] 启动 FastAPI 服务..."
echo "  API 文档: http://localhost:8000/docs"
echo "  健康检查: http://localhost:8000/health"
echo "  前端地址: http://localhost:3000"
echo ""

exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
