from datetime import datetime

from pydantic import BaseModel, Field


class AppointmentCreate(BaseModel):
    department_id: str = Field(min_length=1)
    slot_id: str = Field(min_length=1)


class AppointmentPatch(BaseModel):
    slot_id: str = Field(min_length=1)


class AppointmentOut(BaseModel):
    id: str
    user_id: str
    department_id: str
    department_name: str | None = None
    slot_id: str
    status: str
    start_at: datetime
    end_at: datetime
    created_at: datetime
    updated_at: datetime


class AppointmentListResponse(BaseModel):
    items: list[AppointmentOut]
