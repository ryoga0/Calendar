from __future__ import annotations

import uuid
from datetime import date, datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain import AppointmentRecord, DepartmentRecord, UserRecord
from app.models import Appointment, Department, User
from app.utils.timeutil import utcnow


def _to_user_record(user: User) -> UserRecord:
    return UserRecord(
        id=user.id,
        email=user.email,
        password_hash=user.password_hash,
        user_name=user.user_name,
        phone=user.phone,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


def _to_department_record(department: Department) -> DepartmentRecord:
    return DepartmentRecord(
        id=department.id,
        name=department.name,
        sort_order=department.sort_order,
        is_active=department.is_active,
    )


def _to_appointment_record(appointment: Appointment) -> AppointmentRecord:
    return AppointmentRecord(
        id=appointment.id,
        user_id=appointment.user_id,
        department_id=appointment.department_id,
        status=appointment.status,
        start_at=appointment.start_at,
        created_at=appointment.created_at,
        updated_at=appointment.updated_at,
    )


class SqlAlchemyUserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, user_id: str) -> UserRecord | None:
        user = self.db.get(User, user_id)
        return _to_user_record(user) if user else None

    def get_by_email(self, email: str) -> UserRecord | None:
        user = self.db.scalar(select(User).where(User.email == email))
        return _to_user_record(user) if user else None

    def create(
        self,
        *,
        user_id: str | None = None,
        email: str,
        password_hash: str,
        user_name: str,
        phone: str | None,
    ) -> UserRecord:
        now = utcnow()
        user = User(
            id=user_id or str(uuid.uuid4()),
            email=email,
            password_hash=password_hash,
            user_name=user_name,
            phone=phone,
            created_at=now,
            updated_at=now,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return _to_user_record(user)

    def upsert_identity(
        self,
        *,
        user_id: str,
        email: str,
        user_name: str,
        phone: str | None,
    ) -> UserRecord:
        user = self.db.get(User, user_id)
        if user is None:
            return self.create(
                user_id=user_id,
                email=email,
                password_hash="",
                user_name=user_name,
                phone=phone,
            )

        user.email = email
        if user_name:
            user.user_name = user_name
        if phone is not None:
            user.phone = phone
        user.updated_at = utcnow()
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return _to_user_record(user)

    def update_profile(
        self,
        user_id: str,
        *,
        user_name: str | None,
        phone: str | None,
    ) -> UserRecord:
        user = self.db.get(User, user_id)
        if user_name is not None:
            user.user_name = user_name
        if phone is not None:
            user.phone = phone
        user.updated_at = utcnow()
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return _to_user_record(user)


class SqlAlchemyDepartmentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_active(self) -> list[DepartmentRecord]:
        rows = self.db.scalars(
            select(Department)
            .where(Department.is_active.is_(True))
            .order_by(Department.sort_order.asc())
        ).all()
        return [_to_department_record(row) for row in rows]

    def get_by_id(self, department_id: str) -> DepartmentRecord | None:
        department = self.db.get(Department, department_id)
        return _to_department_record(department) if department else None


class SqlAlchemyAppointmentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_confirmed_by_user(self, user_id: str) -> list[AppointmentRecord]:
        rows = self.db.scalars(
            select(Appointment)
            .where(
                Appointment.user_id == user_id,
                Appointment.status == "confirmed",
            )
            .order_by(Appointment.start_at.asc())
        ).all()
        return [_to_appointment_record(row) for row in rows]

    def get_by_id(self, appointment_id: str) -> AppointmentRecord | None:
        appointment = self.db.get(Appointment, appointment_id)
        return _to_appointment_record(appointment) if appointment else None

    def list_confirmed_for_department_on_date(
        self,
        department_id: str,
        target_date: date,
        *,
        exclude_appointment_id: str | None = None,
    ) -> list[AppointmentRecord]:
        day_start = datetime.combine(target_date, time.min)
        day_end = day_start + timedelta(days=1)
        rows = self.db.scalars(
            select(Appointment)
            .where(
                Appointment.department_id == department_id,
                Appointment.status == "confirmed",
                Appointment.start_at >= day_start,
                Appointment.start_at < day_end,
            )
            .order_by(Appointment.start_at.asc())
        ).all()
        return [
            _to_appointment_record(row)
            for row in rows
            if row.id != exclude_appointment_id
        ]

    def count_confirmed_by_user_and_department(
        self,
        user_id: str,
        department_id: str,
        *,
        exclude_appointment_id: str | None = None,
    ) -> int:
        stmt = (
            select(func.count())
            .select_from(Appointment)
            .where(
                Appointment.user_id == user_id,
                Appointment.department_id == department_id,
                Appointment.status == "confirmed",
            )
        )
        if exclude_appointment_id:
            stmt = stmt.where(Appointment.id != exclude_appointment_id)
        return int(self.db.scalar(stmt) or 0)

    def count_confirmed_by_user_and_start(
        self,
        user_id: str,
        start_at: datetime,
        *,
        exclude_appointment_id: str | None = None,
    ) -> int:
        stmt = (
            select(func.count())
            .select_from(Appointment)
            .where(
                Appointment.user_id == user_id,
                Appointment.start_at == start_at,
                Appointment.status == "confirmed",
            )
        )
        if exclude_appointment_id:
            stmt = stmt.where(Appointment.id != exclude_appointment_id)
        return int(self.db.scalar(stmt) or 0)

    def create(
        self,
        *,
        user_id: str,
        department_id: str,
        status: str,
        start_at: datetime,
    ) -> AppointmentRecord:
        now = utcnow()
        appointment = Appointment(
            id=str(uuid.uuid4()),
            user_id=user_id,
            department_id=department_id,
            status=status,
            start_at=start_at,
            created_at=now,
            updated_at=now,
        )
        self.db.add(appointment)
        self.db.commit()
        self.db.refresh(appointment)
        return _to_appointment_record(appointment)

    def update_start_at(self, appointment_id: str, start_at: datetime) -> AppointmentRecord:
        appointment = self.db.get(Appointment, appointment_id)
        appointment.start_at = start_at
        appointment.updated_at = utcnow()
        self.db.add(appointment)
        self.db.commit()
        self.db.refresh(appointment)
        return _to_appointment_record(appointment)

    def delete(self, appointment_id: str) -> None:
        appointment = self.db.get(Appointment, appointment_id)
        self.db.delete(appointment)
        self.db.commit()
