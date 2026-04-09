from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query

from app.deps import get_appointment_repository, get_current_user, get_department_repository
from app.domain import AppointmentRecord, UserRecord
from app.exceptions import AppError
from app.repositories import AppointmentRepository, DepartmentRepository
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentListResponse,
    AppointmentOut,
    AppointmentPatch,
)
from app.services.availability import ensure_reservable_datetime, normalize_local_datetime

router = APIRouter(prefix="/appointments", tags=["appointments"])


def _to_out(appt: AppointmentRecord, department_name: str | None = None) -> AppointmentOut:
    return AppointmentOut(
        id=appt.id,
        user_id=appt.user_id,
        department_id=appt.department_id,
        department_name=department_name,
        status=appt.status,
        start_at=appt.start_at,
        end_at=appt.start_at + timedelta(hours=1),
        created_at=appt.created_at,
        updated_at=appt.updated_at,
    )


@router.get("", response_model=AppointmentListResponse)
def list_appointments(
    user: UserRecord = Depends(get_current_user),
    appointments: AppointmentRepository = Depends(get_appointment_repository),
    departments: DepartmentRepository = Depends(get_department_repository),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
) -> AppointmentListResponse:
    rows = appointments.list_confirmed_by_user(user.id)

    items = []
    for appointment in rows:
        target_date = appointment.start_at.date()
        if from_date and target_date < from_date:
            continue
        if to_date and target_date > to_date:
            continue
        department = departments.get_by_id(appointment.department_id)
        items.append(_to_out(appointment, department.name if department else None))

    return AppointmentListResponse(items=items)


@router.get("/{appointment_id}", response_model=AppointmentOut)
def read_appointment(
    appointment_id: str,
    user: UserRecord = Depends(get_current_user),
    appointments: AppointmentRepository = Depends(get_appointment_repository),
    departments: DepartmentRepository = Depends(get_department_repository),
) -> AppointmentOut:
    appointment = appointments.get_by_id(appointment_id)
    if not appointment or appointment.user_id != user.id or appointment.status != "confirmed":
        raise AppError("NOT_FOUND", "予約が見つかりません。", 404)

    department = departments.get_by_id(appointment.department_id)
    return _to_out(appointment, department.name if department else None)


@router.post("", response_model=AppointmentOut)
def create_appointment(
    body: AppointmentCreate,
    user: UserRecord = Depends(get_current_user),
    appointments: AppointmentRepository = Depends(get_appointment_repository),
    departments: DepartmentRepository = Depends(get_department_repository),
) -> AppointmentOut:
    start_at = ensure_reservable_datetime(
        departments=departments,
        appointments=appointments,
        department_id=body.department_id,
        requested_start_at=body.start_at,
    )

    same_department_count = appointments.count_confirmed_by_user_and_department(
        user.id,
        body.department_id,
    )
    if same_department_count > 0:
        raise AppError(
            "ALREADY_EXISTS",
            "この診療科はすでに予約済みです。変更する場合は予約一覧からお進みください。",
            400,
        )

    overlap_count = appointments.count_confirmed_by_user_and_start(user.id, start_at)
    if overlap_count > 0:
        raise AppError(
            "TIME_CONFLICT",
            "同じ時間に別の予約があります。別の時間をお選びください。",
            400,
        )

    appointment = appointments.create(
        user_id=user.id,
        department_id=body.department_id,
        status="confirmed",
        start_at=start_at,
    )
    department = departments.get_by_id(appointment.department_id)
    return _to_out(appointment, department.name if department else None)


@router.patch("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(
    appointment_id: str,
    body: AppointmentPatch,
    user: UserRecord = Depends(get_current_user),
    appointments: AppointmentRepository = Depends(get_appointment_repository),
    departments: DepartmentRepository = Depends(get_department_repository),
) -> AppointmentOut:
    appointment = appointments.get_by_id(appointment_id)

    if not appointment or appointment.user_id != user.id or appointment.status != "confirmed":
        raise AppError("NOT_FOUND", "予約が見つかりません。", 404)

    start_at = ensure_reservable_datetime(
        departments=departments,
        appointments=appointments,
        department_id=appointment.department_id,
        requested_start_at=body.start_at,
        exclude_appointment_id=appointment.id,
    )

    if normalize_local_datetime(appointment.start_at) == start_at:
        raise AppError("NO_CHANGE", "同じ日時は選択できません。別の日時をお選びください。", 400)

    overlap_count = appointments.count_confirmed_by_user_and_start(
        user.id,
        start_at,
        exclude_appointment_id=appointment.id,
    )
    if overlap_count > 0:
        raise AppError(
            "TIME_CONFLICT",
            "同じ時間に別の予約があります。別の時間をお選びください。",
            400,
        )

    updated = appointments.update_start_at(appointment.id, start_at)
    department = departments.get_by_id(updated.department_id)
    return _to_out(updated, department.name if department else None)


@router.delete("/{appointment_id}")
def delete_appointment(
    appointment_id: str,
    user: UserRecord = Depends(get_current_user),
    appointments: AppointmentRepository = Depends(get_appointment_repository),
):
    appointment = appointments.get_by_id(appointment_id)

    if not appointment or appointment.user_id != user.id or appointment.status != "confirmed":
        raise AppError("NOT_FOUND", "予約が見つかりません。", 404)

    appointments.delete(appointment.id)
    return {"status": "ok"}
