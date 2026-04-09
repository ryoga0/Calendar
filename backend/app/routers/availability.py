from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.availability import AvailabilityResponse
from app.services.availability import build_daily_availability

router = APIRouter(prefix="/availability", tags=["availability"])


@router.get("", response_model=AvailabilityResponse)
def read_availability(
    department_id: str = Query(..., min_length=1),
    target_date: date = Query(..., alias="date"),
    exclude_appointment_id: str | None = Query(None),
    db: Session = Depends(get_db),
) -> AvailabilityResponse:
    return build_daily_availability(
        db=db,
        department_id=department_id,
        target_date=target_date,
        exclude_appointment_id=exclude_appointment_id,
    )
