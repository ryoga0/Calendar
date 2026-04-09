import uuid
from sqlalchemy import select
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends

from app.config import settings
from app.database import get_db
from app.exceptions import AppError
from app.models import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserOut
from app.security import create_access_token, hash_password, verify_password
from app.utils.timeutil import utcnow

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
def register(body: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    exists = db.scalar(select(User.id).where(User.email == body.email))
    if exists:
        raise AppError("CONFLICT", "このメールアドレスは既に登録されています。", 409)

    now = utcnow()

    user = User(
        id=str(uuid.uuid4()),
        email=body.email,
        password_hash=hash_password(body.password),
        user_name=body.user_name,
        phone=body.phone,
        created_at=now,
        updated_at=now,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    expires_in = settings.access_token_expire_minutes * 60

    return TokenResponse(
        access_token=token,
        expires_in=expires_in,
        user=UserOut.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == body.email))

    if not user or not verify_password(body.password, user.password_hash):
        raise AppError("UNAUTHORIZED", "メールアドレスまたはパスワードが正しくありません。", 401)

    token = create_access_token(user.id)
    expires_in = settings.access_token_expire_minutes * 60

    return TokenResponse(
        access_token=token,
        expires_in=expires_in,
        user=UserOut.model_validate(user),
    )
