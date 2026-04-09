from datetime import datetime

from pydantic import BaseModel, Field


class AppointmentCreate(BaseModel):
    department_id: str = Field(min_length=1)
    start_at: datetime


class AppointmentPatch(BaseModel):
    start_at: datetime


class AppointmentOut(BaseModel):
    id: str
    user_id: str
    department_id: str
    department_name: str | None = None
    status: str
    start_at: datetime
    end_at: datetime
    created_at: datetime
    updated_at: datetime


class AppointmentListResponse(BaseModel):
    items: list[AppointmentOut]
