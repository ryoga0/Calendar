from typing import Any

from fastapi import APIRouter, Depends

from app.auth_provider import AccessTokenProvider
from app.config import settings
from app.deps import get_token_provider, get_user_repository
from app.domain import UserRecord
from app.exceptions import AppError
from app.firebase_support import (
    login_with_email_password,
    refresh_firebase_id_token,
    register_with_email_password,
    verify_firebase_id_token,
)
from app.repositories import UserRepository
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserOut
from app.security import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _to_user_out(user: UserRecord) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        user_name=user.user_name,
        phone=user.phone,
    )


def _to_token_response(
    *,
    access_token: str,
    expires_in: int,
    user: UserRecord,
    refresh_token: str | None = None,
) -> TokenResponse:
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        user=_to_user_out(user),
    )


def _firebase_user_name(email: str, payload: dict[str, Any], existing: UserRecord | None = None) -> str:
    if existing and existing.user_name:
        return existing.user_name
    display_name = payload.get("displayName")
    if isinstance(display_name, str) and display_name.strip():
        return display_name.strip()
    return email.split("@")[0]


def _raise_firebase_error(exc: Exception, fallback_message: str) -> None:
    if isinstance(exc, RuntimeError):
        raise AppError("INVALID_CONFIG", str(exc), 500)

    response = getattr(exc, "response", None)
    code = "FIREBASE_ERROR"
    status_code = 400
    message = fallback_message

    if response is not None:
        status_code = getattr(response, "status_code", 400) or 400
        try:
            error_code = response.json().get("error", {}).get("message", "")
        except Exception:
            error_code = ""

        if error_code == "EMAIL_EXISTS":
            code = "CONFLICT"
            status_code = 409
            message = "このメールアドレスは既に登録されています。"
        elif error_code in {"EMAIL_NOT_FOUND", "INVALID_PASSWORD", "INVALID_LOGIN_CREDENTIALS"}:
            code = "UNAUTHORIZED"
            status_code = 401
            message = "メールアドレスまたはパスワードが正しくありません。"
        elif error_code == "INVALID_REFRESH_TOKEN":
            code = "UNAUTHORIZED"
            status_code = 401
            message = "ログイン情報が無効です。再度ログインしてください。"
        elif error_code == "TOKEN_EXPIRED":
            code = "UNAUTHORIZED"
            status_code = 401
            message = "ログインの有効期限が切れました。再度ログインしてください。"
        elif error_code == "WEAK_PASSWORD : Password should be at least 6 characters":
            code = "INVALID_PASSWORD"
            status_code = 400
            message = "パスワードは6文字以上で入力してください。"
        elif error_code == "USER_DISABLED":
            code = "FORBIDDEN"
            status_code = 403
            message = "このアカウントは現在利用できません。"

    raise AppError(code, message, status_code)


def _issue_local_token_response(
    user: UserRecord,
    token_provider: AccessTokenProvider,
) -> TokenResponse:
    token = token_provider.issue_token(user.id)
    expires_in = token_provider.expires_in_seconds()
    return _to_token_response(access_token=token, expires_in=expires_in, user=user)


@router.post("/register", response_model=TokenResponse)
def register(
    body: RegisterRequest,
    users: UserRepository = Depends(get_user_repository),
    token_provider: AccessTokenProvider = Depends(get_token_provider),
) -> TokenResponse:
    if settings.auth_provider == "firebase":
        try:
            auth_result = register_with_email_password(body.email, body.password)
        except Exception as exc:
            _raise_firebase_error(exc, "Firebase へのユーザー登録に失敗しました。")

        user = users.upsert_identity(
            user_id=auth_result["localId"],
            email=auth_result["email"],
            user_name=body.user_name,
            phone=body.phone,
        )
        return _to_token_response(
            access_token=auth_result["idToken"],
            refresh_token=auth_result.get("refreshToken"),
            expires_in=int(auth_result["expiresIn"]),
            user=user,
        )

    exists = users.get_by_email(body.email)
    if exists:
        raise AppError("CONFLICT", "このメールアドレスは既に登録されています。", 409)

    user = users.create(
        email=body.email,
        password_hash=hash_password(body.password),
        user_name=body.user_name,
        phone=body.phone,
    )
    return _issue_local_token_response(user, token_provider)


@router.post("/login", response_model=TokenResponse)
def login(
    body: LoginRequest,
    users: UserRepository = Depends(get_user_repository),
    token_provider: AccessTokenProvider = Depends(get_token_provider),
) -> TokenResponse:
    if settings.auth_provider == "firebase":
        try:
            auth_result = login_with_email_password(body.email, body.password)
        except Exception as exc:
            _raise_firebase_error(exc, "Firebase ログインに失敗しました。")

        existing = users.get_by_id(auth_result["localId"]) or users.get_by_email(auth_result["email"])
        user = users.upsert_identity(
            user_id=auth_result["localId"],
            email=auth_result["email"],
            user_name=_firebase_user_name(auth_result["email"], auth_result, existing),
            phone=existing.phone if existing else None,
        )
        return _to_token_response(
            access_token=auth_result["idToken"],
            refresh_token=auth_result.get("refreshToken"),
            expires_in=int(auth_result["expiresIn"]),
            user=user,
        )

    user = users.get_by_email(body.email)
    if not user or not verify_password(body.password, user.password_hash):
        raise AppError("UNAUTHORIZED", "メールアドレスまたはパスワードが正しくありません。", 401)

    return _issue_local_token_response(user, token_provider)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    body: RefreshRequest,
    users: UserRepository = Depends(get_user_repository),
) -> TokenResponse:
    if settings.auth_provider != "firebase":
        raise AppError("NOT_SUPPORTED", "現在の認証方式ではトークン更新は利用しません。", 400)

    try:
        auth_result = refresh_firebase_id_token(body.refresh_token)
    except Exception as exc:
        _raise_firebase_error(exc, "トークン更新に失敗しました。")

    try:
        token_payload = verify_firebase_id_token(auth_result["id_token"])
    except RuntimeError as exc:
        raise AppError("INVALID_CONFIG", str(exc), 500) from exc
    except Exception as exc:
        raise AppError("UNAUTHORIZED", "ログイン情報が無効です。再度ログインしてください。", 401) from exc
    email = token_payload.get("email")
    if not isinstance(email, str) or not email:
        raise AppError("UNAUTHORIZED", "ログイン情報が無効です。再度ログインしてください。", 401)

    existing = users.get_by_id(auth_result["user_id"]) or users.get_by_email(email)
    user = users.upsert_identity(
        user_id=auth_result["user_id"],
        email=email,
        user_name=_firebase_user_name(email, token_payload, existing),
        phone=existing.phone if existing else None,
    )

    return _to_token_response(
        access_token=auth_result["id_token"],
        refresh_token=auth_result.get("refresh_token"),
        expires_in=int(auth_result["expires_in"]),
        user=user,
    )
