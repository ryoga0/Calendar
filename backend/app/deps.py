from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth_provider import AccessTokenProvider, get_access_token_provider
from app.config import settings
from app.database import get_db
from app.domain import UserRecord
from app.exceptions import AppError
from app.repositories import (
    AppointmentRepository,
    DepartmentRepository,
    FirestoreAppointmentRepository,
    FirestoreDepartmentRepository,
    FirestoreUserRepository,
    SqlAlchemyAppointmentRepository,
    SqlAlchemyDepartmentRepository,
    SqlAlchemyUserRepository,
    UserRepository,
)

security = HTTPBearer(auto_error=False)


def get_token_provider() -> AccessTokenProvider:
    return get_access_token_provider()


def get_user_repository(db: Session = Depends(get_db)) -> UserRepository:
    if settings.data_provider == "sqlalchemy":
        return SqlAlchemyUserRepository(db)
    if settings.data_provider == "firebase":
        return FirestoreUserRepository()
    raise AppError("INVALID_CONFIG", "未対応の data_provider です。", 500)


def get_department_repository(db: Session = Depends(get_db)) -> DepartmentRepository:
    if settings.data_provider == "sqlalchemy":
        return SqlAlchemyDepartmentRepository(db)
    if settings.data_provider == "firebase":
        return FirestoreDepartmentRepository()
    raise AppError("INVALID_CONFIG", "未対応の data_provider です。", 500)


def get_appointment_repository(db: Session = Depends(get_db)) -> AppointmentRepository:
    if settings.data_provider == "sqlalchemy":
        return SqlAlchemyAppointmentRepository(db)
    if settings.data_provider == "firebase":
        return FirestoreAppointmentRepository()
    raise AppError("INVALID_CONFIG", "未対応の data_provider です。", 500)


def get_current_user_id(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    token_provider: AccessTokenProvider = Depends(get_token_provider),
) -> str:
    if creds is None or creds.scheme.lower() != "bearer":
        raise AppError("UNAUTHORIZED", "ログインが必要です。", 401)
    try:
        return token_provider.get_subject(creds.credentials)
    except ValueError as e:
        raise AppError("UNAUTHORIZED", "ログイン情報が無効です。再度ログインしてください。", 401) from e
    except NotImplementedError as e:
        raise AppError("NOT_IMPLEMENTED", str(e), 501) from e
    except RuntimeError as e:
        raise AppError("INVALID_CONFIG", str(e), 500) from e


def get_current_user(
    user_id: str = Depends(get_current_user_id),
    users: UserRepository = Depends(get_user_repository),
) -> UserRecord:
    user = users.get_by_id(user_id)
    if not user:
        raise AppError("UNAUTHORIZED", "ユーザーが見つかりません。", 401)
    return user
