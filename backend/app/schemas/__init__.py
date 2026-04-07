from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentOut,
    AppointmentPatch,
    AppointmentListResponse,
)
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.department import DepartmentOut, DepartmentListResponse
from app.schemas.slot import SlotOut, SlotListResponse
from app.schemas.user import UserOut, UserUpdate

__all__ = [
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
    "UserOut",
    "UserUpdate",
    "DepartmentOut",
    "DepartmentListResponse",
    "SlotOut",
    "SlotListResponse",
    "AppointmentCreate",
    "AppointmentPatch",
    "AppointmentOut",
    "AppointmentListResponse",
]
