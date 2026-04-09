from datetime import date

from fastapi import APIRouter, Depends, Query

from app.deps import get_appointment_repository, get_department_repository
from app.repositories import AppointmentRepository, DepartmentRepository
from app.schemas.availability import AvailabilityResponse
from app.services.availability import build_daily_availability

router = APIRouter(prefix="/availability", tags=["availability"])


@router.get("", response_model=AvailabilityResponse)
def read_availability(
    department_id: str = Query(..., min_length=1),
    target_date: date = Query(..., alias="date"),
    exclude_appointment_id: str | None = Query(None),
    departments: DepartmentRepository = Depends(get_department_repository),
    appointments: AppointmentRepository = Depends(get_appointment_repository),
) -> AvailabilityResponse:
    return build_daily_availability(
        departments=departments,
        appointments=appointments,
        department_id=department_id,
        target_date=target_date,
        exclude_appointment_id=exclude_appointment_id,
    )
