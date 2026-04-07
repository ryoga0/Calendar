from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.exceptions import AppError
from app.models import User
from app.security import get_sub_from_token

security = HTTPBearer(auto_error=False)


def get_current_user_id(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> str:
    if creds is None or creds.scheme.lower() != "bearer":
        raise AppError("UNAUTHORIZED", "ログインが必要です。", 401)
    try:
        return get_sub_from_token(creds.credentials)
    except ValueError as e:
        raise AppError("UNAUTHORIZED", "ログイン情報が無効です。再度ログインしてください。", 401) from e


def get_current_user(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> User:
    user = db.get(User, user_id)
    if not user:
        raise AppError("UNAUTHORIZED", "ユーザーが見つかりません。", 401)
    return user
