from datetime import date, datetime

from pydantic import BaseModel


class AvailabilityItemOut(BaseModel):
    time: str
    start_at: datetime
    available: bool
    reason: str | None = None


class AvailabilityResponse(BaseModel):
    department_id: str
    date: date
    items: list[AvailabilityItemOut]
