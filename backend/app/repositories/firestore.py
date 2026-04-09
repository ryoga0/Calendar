from __future__ import annotations

import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

from app.config import settings
from app.domain import AppointmentRecord, DepartmentRecord, UserRecord
from app.firebase_support import firestore_now, get_firestore_client

TZ = ZoneInfo(settings.timezone)


def _as_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    return datetime.now(timezone.utc)


def _user_record(doc_id: str, payload: dict[str, Any]) -> UserRecord:
    return UserRecord(
        id=doc_id,
        email=str(payload.get("email", "")),
        password_hash=str(payload.get("password_hash", "")),
        user_name=str(payload.get("user_name", "")),
        phone=payload.get("phone"),
        created_at=_as_datetime(payload.get("created_at")),
        updated_at=_as_datetime(payload.get("updated_at")),
    )


def _department_record(doc_id: str, payload: dict[str, Any]) -> DepartmentRecord:
    return DepartmentRecord(
        id=doc_id,
        name=str(payload.get("name", "")),
        sort_order=int(payload.get("sort_order", 0)),
        is_active=bool(payload.get("is_active", False)),
    )


def _appointment_record(doc_id: str, payload: dict[str, Any]) -> AppointmentRecord:
    return AppointmentRecord(
        id=doc_id,
        user_id=str(payload.get("user_id", "")),
        department_id=str(payload.get("department_id", "")),
        status=str(payload.get("status", "")),
        start_at=_as_datetime(payload.get("start_at")),
        created_at=_as_datetime(payload.get("created_at")),
        updated_at=_as_datetime(payload.get("updated_at")),
    )


def _to_store_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=TZ).astimezone(timezone.utc)
    return value.astimezone(timezone.utc)


class FirestoreUserRepository:
    def __init__(self) -> None:
        self.client = get_firestore_client()
        self.collection = self.client.collection("users")

    def get_by_id(self, user_id: str) -> UserRecord | None:
        snapshot = self.collection.document(user_id).get()
        if not snapshot.exists:
            return None
        return _user_record(snapshot.id, snapshot.to_dict() or {})

    def get_by_email(self, email: str) -> UserRecord | None:
        docs = self.collection.where("email", "==", email).limit(1).stream()
        for snapshot in docs:
            return _user_record(snapshot.id, snapshot.to_dict() or {})
        return None

    def create(
        self,
        *,
        user_id: str | None = None,
        email: str,
        password_hash: str,
        user_name: str,
        phone: str | None,
    ) -> UserRecord:
        doc_id = user_id or str(uuid.uuid4())
        now = firestore_now()
        payload = {
            "email": email,
            "password_hash": password_hash,
            "user_name": user_name,
            "phone": phone,
            "created_at": now,
            "updated_at": now,
        }
        self.collection.document(doc_id).set(payload)
        return _user_record(doc_id, payload)

    def upsert_identity(
        self,
        *,
        user_id: str,
        email: str,
        user_name: str,
        phone: str | None,
    ) -> UserRecord:
        existing = self.get_by_id(user_id)
        if existing is None:
            return self.create(
                user_id=user_id,
                email=email,
                password_hash="",
                user_name=user_name,
                phone=phone,
            )

        payload = {
            "email": email,
            "user_name": user_name or existing.user_name,
            "phone": phone if phone is not None else existing.phone,
            "updated_at": firestore_now(),
        }
        self.collection.document(user_id).set(payload, merge=True)
        return self.get_by_id(user_id) or _user_record(user_id, payload)

    def update_profile(
        self,
        user_id: str,
        *,
        user_name: str | None,
        phone: str | None,
    ) -> UserRecord:
        payload: dict[str, Any] = {"updated_at": firestore_now()}
        if user_name is not None:
            payload["user_name"] = user_name
        if phone is not None:
            payload["phone"] = phone
        self.collection.document(user_id).set(payload, merge=True)
        return self.get_by_id(user_id) or _user_record(user_id, payload)


class FirestoreDepartmentRepository:
    def __init__(self) -> None:
        self.client = get_firestore_client()
        self.collection = self.client.collection("departments")

    def list_active(self) -> list[DepartmentRecord]:
        docs = (
            self.collection.where("is_active", "==", True)
            .order_by("sort_order")
            .stream()
        )
        return [_department_record(snapshot.id, snapshot.to_dict() or {}) for snapshot in docs]

    def get_by_id(self, department_id: str) -> DepartmentRecord | None:
        snapshot = self.collection.document(department_id).get()
        if not snapshot.exists:
            return None
        return _department_record(snapshot.id, snapshot.to_dict() or {})


class FirestoreAppointmentRepository:
    def __init__(self) -> None:
        self.client = get_firestore_client()
        self.collection = self.client.collection("appointments")

    def list_confirmed_by_user(self, user_id: str) -> list[AppointmentRecord]:
        docs = (
            self.collection.where("user_id", "==", user_id)
            .where("status", "==", "confirmed")
            .order_by("start_at")
            .stream()
        )
        return [_appointment_record(snapshot.id, snapshot.to_dict() or {}) for snapshot in docs]

    def get_by_id(self, appointment_id: str) -> AppointmentRecord | None:
        snapshot = self.collection.document(appointment_id).get()
        if not snapshot.exists:
            return None
        return _appointment_record(snapshot.id, snapshot.to_dict() or {})

    def list_confirmed_for_department_on_date(
        self,
        department_id: str,
        target_date: date,
        *,
        exclude_appointment_id: str | None = None,
    ) -> list[AppointmentRecord]:
        local_day_start = datetime.combine(target_date, time.min).replace(tzinfo=TZ)
        day_start = local_day_start.astimezone(timezone.utc)
        day_end = (local_day_start + timedelta(days=1)).astimezone(timezone.utc)
        docs = (
            self.collection.where("department_id", "==", department_id)
            .where("status", "==", "confirmed")
            .where("start_at", ">=", day_start)
            .where("start_at", "<", day_end)
            .order_by("start_at")
            .stream()
        )
        return [
            _appointment_record(snapshot.id, snapshot.to_dict() or {})
            for snapshot in docs
            if snapshot.id != exclude_appointment_id
        ]

    def count_confirmed_by_user_and_department(
        self,
        user_id: str,
        department_id: str,
        *,
        exclude_appointment_id: str | None = None,
    ) -> int:
        docs = (
            self.collection.where("user_id", "==", user_id)
            .where("department_id", "==", department_id)
            .where("status", "==", "confirmed")
            .stream()
        )
        return sum(1 for snapshot in docs if snapshot.id != exclude_appointment_id)

    def count_confirmed_by_user_and_start(
        self,
        user_id: str,
        start_at: datetime,
        *,
        exclude_appointment_id: str | None = None,
    ) -> int:
        docs = (
            self.collection.where("user_id", "==", user_id)
            .where("start_at", "==", _to_store_datetime(start_at))
            .where("status", "==", "confirmed")
            .stream()
        )
        return sum(1 for snapshot in docs if snapshot.id != exclude_appointment_id)

    def create(
        self,
        *,
        user_id: str,
        department_id: str,
        status: str,
        start_at: datetime,
    ) -> AppointmentRecord:
        appointment_id = str(uuid.uuid4())
        now = firestore_now()
        payload = {
            "user_id": user_id,
            "department_id": department_id,
            "status": status,
            "start_at": _to_store_datetime(start_at),
            "created_at": now,
            "updated_at": now,
        }
        self.collection.document(appointment_id).set(payload)
        return _appointment_record(appointment_id, payload)

    def update_start_at(self, appointment_id: str, start_at: datetime) -> AppointmentRecord:
        payload = {
            "start_at": _to_store_datetime(start_at),
            "updated_at": firestore_now(),
        }
        self.collection.document(appointment_id).set(payload, merge=True)
        return self.get_by_id(appointment_id) or _appointment_record(appointment_id, payload)

    def delete(self, appointment_id: str) -> None:
        self.collection.document(appointment_id).delete()
