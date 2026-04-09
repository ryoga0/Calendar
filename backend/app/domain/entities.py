from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class UserRecord:
    id: str
    email: str
    password_hash: str
    user_name: str
    phone: str | None
    created_at: datetime
    updated_at: datetime


@dataclass(slots=True)
class DepartmentRecord:
    id: str
    name: str
    sort_order: int
    is_active: bool


@dataclass(slots=True)
class AppointmentRecord:
    id: str
    user_id: str
    department_id: str
    status: str
    start_at: datetime
    created_at: datetime
    updated_at: datetime
