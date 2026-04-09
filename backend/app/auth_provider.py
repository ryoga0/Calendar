from __future__ import annotations

from functools import lru_cache
from typing import Any, Protocol

from app.config import settings
from app.firebase_support import verify_firebase_id_token
from app.security import create_access_token, get_sub_from_token


class AccessTokenProvider(Protocol):
    def issue_token(self, subject: str, extra: dict[str, Any] | None = None) -> str:
        ...

    def get_subject(self, token: str) -> str:
        ...

    def expires_in_seconds(self) -> int:
        ...


class JwtAccessTokenProvider:
    def issue_token(self, subject: str, extra: dict[str, Any] | None = None) -> str:
        return create_access_token(subject, extra)

    def get_subject(self, token: str) -> str:
        return get_sub_from_token(token)

    def expires_in_seconds(self) -> int:
        return settings.access_token_expire_minutes * 60


class FirebaseAccessTokenProvider:
    def issue_token(self, subject: str, extra: dict[str, Any] | None = None) -> str:
        raise NotImplementedError("Firebase Authentication への移行は Phase 5 で実装します。")

    def get_subject(self, token: str) -> str:
        try:
            payload = verify_firebase_id_token(token)
        except RuntimeError:
            raise
        except Exception as e:
            raise ValueError("invalid firebase token") from e
        uid = payload.get("uid") or payload.get("sub")
        if not isinstance(uid, str) or not uid:
            raise ValueError("invalid firebase token")
        return uid

    def expires_in_seconds(self) -> int:
        return settings.access_token_expire_minutes * 60


@lru_cache(maxsize=1)
def get_access_token_provider() -> AccessTokenProvider:
    if settings.auth_provider == "local_jwt":
        return JwtAccessTokenProvider()
    if settings.auth_provider == "firebase":
        return FirebaseAccessTokenProvider()
    raise ValueError(f"Unsupported auth_provider: {settings.auth_provider}")
