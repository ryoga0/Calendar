from __future__ import annotations

from datetime import datetime, timezone
from functools import lru_cache
from typing import Any

from app.config import settings


def _require(setting_value: str | None, setting_name: str) -> str:
    if setting_value:
        return setting_value
    raise RuntimeError(f"{setting_name} が未設定のため Firebase を利用できません。")


def _import_httpx():
    try:
        import httpx
    except ImportError as exc:
        raise RuntimeError("httpx が未インストールのため Firebase REST API を利用できません。") from exc

    return httpx


def _import_firebase_admin():
    try:
        import firebase_admin
        from firebase_admin import auth, credentials, firestore
    except ImportError as exc:
        raise RuntimeError("firebase-admin が未インストールのため Firebase を利用できません。") from exc

    return firebase_admin, auth, credentials, firestore


@lru_cache(maxsize=1)
def get_firebase_app():
    firebase_admin, _, credentials, _ = _import_firebase_admin()

    project_id = _require(settings.firebase_project_id, "FIREBASE_PROJECT_ID")

    if settings.firebase_credentials_path:
        cred = credentials.Certificate(settings.firebase_credentials_path)
        return firebase_admin.initialize_app(cred, {"projectId": project_id}, name="calendar-app")

    try:
        return firebase_admin.get_app("calendar-app")
    except ValueError:
        return firebase_admin.initialize_app(options={"projectId": project_id}, name="calendar-app")


def get_firestore_client():
    _, _, _, firestore = _import_firebase_admin()
    app = get_firebase_app()
    return firestore.client(app=app)


def verify_firebase_id_token(token: str) -> dict[str, Any]:
    _, auth, _, _ = _import_firebase_admin()
    app = get_firebase_app()
    return auth.verify_id_token(token, app=app)


def register_with_email_password(email: str, password: str) -> dict[str, Any]:
    httpx = _import_httpx()
    api_key = _require(settings.firebase_web_api_key, "FIREBASE_WEB_API_KEY")
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={api_key}"
    response = httpx.post(
        url,
        json={
            "email": email,
            "password": password,
            "returnSecureToken": True,
        },
        timeout=15.0,
    )
    response.raise_for_status()
    return response.json()


def login_with_email_password(email: str, password: str) -> dict[str, Any]:
    httpx = _import_httpx()
    api_key = _require(settings.firebase_web_api_key, "FIREBASE_WEB_API_KEY")
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
    response = httpx.post(
        url,
        json={
            "email": email,
            "password": password,
            "returnSecureToken": True,
        },
        timeout=15.0,
    )
    response.raise_for_status()
    return response.json()


def refresh_firebase_id_token(refresh_token: str) -> dict[str, Any]:
    httpx = _import_httpx()
    api_key = _require(settings.firebase_web_api_key, "FIREBASE_WEB_API_KEY")
    url = f"https://securetoken.googleapis.com/v1/token?key={api_key}"
    response = httpx.post(
        url,
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        },
        timeout=15.0,
    )
    response.raise_for_status()
    return response.json()


def firestore_now() -> datetime:
    return datetime.now(timezone.utc)
