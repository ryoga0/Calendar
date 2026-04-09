from __future__ import annotations

from datetime import date, datetime
from typing import Protocol

from app.domain import AppointmentRecord, DepartmentRecord, UserRecord


class UserRepository(Protocol):
    def get_by_id(self, user_id: str) -> UserRecord | None:
        ...

    def get_by_email(self, email: str) -> UserRecord | None:
        ...

    def create(
        self,
        *,
        user_id: str | None = None,
        email: str,
        password_hash: str,
        user_name: str,
        phone: str | None,
    ) -> UserRecord:
        ...

    def upsert_identity(
        self,
        *,
        user_id: str,
        email: str,
        user_name: str,
        phone: str | None,
    ) -> UserRecord:
        ...

    def update_profile(
        self,
        user_id: str,
        *,
        user_name: str | None,
        phone: str | None,
    ) -> UserRecord:
        ...


class DepartmentRepository(Protocol):
    def list_active(self) -> list[DepartmentRecord]:
        ...

    def get_by_id(self, department_id: str) -> DepartmentRecord | None:
        ...


class AppointmentRepository(Protocol):
    def list_confirmed_by_user(self, user_id: str) -> list[AppointmentRecord]:
        ...

    def get_by_id(self, appointment_id: str) -> AppointmentRecord | None:
        ...

    def list_confirmed_for_department_on_date(
        self,
        department_id: str,
        target_date: date,
        *,
        exclude_appointment_id: str | None = None,
    ) -> list[AppointmentRecord]:
        ...

    def count_confirmed_by_user_and_department(
        self,
        user_id: str,
        department_id: str,
        *,
        exclude_appointment_id: str | None = None,
    ) -> int:
        ...

    def count_confirmed_by_user_and_start(
        self,
        user_id: str,
        start_at: datetime,
        *,
        exclude_appointment_id: str | None = None,
    ) -> int:
        ...

    def create(
        self,
        *,
        user_id: str,
        department_id: str,
        status: str,
        start_at: datetime,
    ) -> AppointmentRecord:
        ...

    def update_start_at(self, appointment_id: str, start_at: datetime) -> AppointmentRecord:
        ...

    def delete(self, appointment_id: str) -> None:
        ...
