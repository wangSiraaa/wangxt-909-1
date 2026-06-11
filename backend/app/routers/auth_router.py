from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import timedelta

from ..database import get_db
from ..schemas import UserLogin, Token
from ..auth import authenticate_user, create_access_token, build_user_response, create_audit_log

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/login", response_model=Token)
def login(
    request: Request,
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=timedelta(days=1)
    )

    try:
        client_ip = request.client.host if request.client else None
    except Exception:
        client_ip = None

    create_audit_log(
        db=db,
        user=user,
        action="USER_LOGIN",
        target_type="User",
        target_id=user.id,
        target_no=user.username,
        detail=f"用户 {user.username} 登录系统",
        ip_address=client_ip,
    )
    db.commit()

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=build_user_response(user)
    )
