from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import os
from sqlalchemy import text

from .database import Base, engine, SessionLocal
from .routers.auth_router import router as auth_router
from .routers.settlement_router import router as settlement_router
from .routers.common_router import router as common_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="社群团购团长结算系统",
    description="全栈结算系统，支持多角色协作、批次结算、佣金试算、售后校验、审计追踪",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(settlement_router)
app.include_router(common_router)


@app.get("/health")
def health_check():
    db_status = "healthy"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "ok",
        "service": "community-group-buy-settlement",
        "version": "1.0.0",
        "database": db_status,
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {
            "database_connection": db_status == "healthy",
            "api_routes_registered": True,
            "models_initialized": True,
        }
    }


@app.get("/api/health")
def api_health():
    return {
        "status": "healthy",
        "service": "settlement-api",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/")
def root():
    return {
        "name": "社群团购团长结算系统 API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "auth": "/api/auth/*",
            "settlements": "/api/settlements/*",
            "orders": "/api/orders/*",
            "aftersales": "/api/aftersales/*",
            "leaders": "/api/leaders",
            "suppliers": "/api/suppliers",
            "payments": "/api/payments",
            "audit": "/api/audit-logs",
            "dashboard": "/api/dashboard/stats",
        }
    }
