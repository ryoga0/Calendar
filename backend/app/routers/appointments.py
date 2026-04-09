import uuid
from datetime import datetime, date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.exceptions import AppError
from app.models import Appointment, Department, User
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentPatch,
    AppointmentListResponse,
    AppointmentOut,
)
from app.services.availability import ensure_reservable_datetime, normalize_local_datetime
from app.utils.timeutil import utcnow

router = APIRouter(prefix="/appointments", tags=["appointments"])


def _to_out(db: Session, appt: Appointment) -> AppointmentOut:
    dept = db.get(Department, appt.department_id)
    return AppointmentOut(
        id=appt.id,
        user_id=appt.user_id,
        department_id=appt.department_id,
        department_name=dept.name if dept else None,
        status=appt.status,
        start_at=appt.start_at,
        end_at=appt.start_at + timedelta(hours=1),
        created_at=appt.created_at,
        updated_at=appt.updated_at,
    )


@router.get("", response_model=AppointmentListResponse)
def list_appointments(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
) -> AppointmentListResponse:

    rows = db.scalars(
        select(Appointment)
        .where(
            Appointment.user_id == user.id,
            Appointment.status == "confirmed",
        )
        .order_by(Appointment.start_at.asc())
    ).all()

    items = []
    for a in rows:
        d = a.start_at.date()
        if from_date and d < from_date:
            continue
        if to_date and d > to_date:
            continue
        items.append(_to_out(db, a))

    return AppointmentListResponse(items=items)


@router.get("/{appointment_id}", response_model=AppointmentOut)
def read_appointment(
    appointment_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AppointmentOut:
    appt = db.get(Appointment, appointment_id)
    if not appt or appt.user_id != user.id or appt.status != "confirmed":
        raise AppError("NOT_FOUND", "予約が見つかりません。", 404)
    return _to_out(db, appt)


@router.post("", response_model=AppointmentOut)
def create_appointment(
    body: AppointmentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AppointmentOut:
    start_at = ensure_reservable_datetime(db, body.department_id, body.start_at)

    same_department_count = db.scalar(
        select(func.count())
        .select_from(Appointment)
        .where(
            Appointment.user_id == user.id,
            Appointment.department_id == body.department_id,
            Appointment.status == "confirmed",
        )
    )
    if same_department_count and same_department_count > 0:
        raise AppError(
            "ALREADY_EXISTS",
            "この診療科はすでに予約済みです。変更する場合は予約一覧からお進みください。",
            400,
        )

    overlap_count = db.scalar(
        select(func.count())
        .select_from(Appointment)
        .where(
            Appointment.user_id == user.id,
            Appointment.start_at == start_at,
            Appointment.status == "confirmed",
        )
    )
    if overlap_count and overlap_count > 0:
        raise AppError(
            "TIME_CONFLICT",
            "同じ時間に別の予約があります。別の時間をお選びください。",
            400,
        )

    now = utcnow()

    appt = Appointment(
        id=str(uuid.uuid4()),
        user_id=user.id,
        department_id=body.department_id,
        status="confirmed",
        start_at=start_at,
        created_at=now,
        updated_at=now,
    )

    db.add(appt)
    db.commit()
    db.refresh(appt)

    return _to_out(db, appt)


@router.patch("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(
    appointment_id: str,
    body: AppointmentPatch,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AppointmentOut:
    appt = db.get(Appointment, appointment_id)

    if not appt or appt.user_id != user.id or appt.status != "confirmed":
        raise AppError("NOT_FOUND", "予約が見つかりません。", 404)

    start_at = ensure_reservable_datetime(
        db=db,
        department_id=appt.department_id,
        requested_start_at=body.start_at,
        exclude_appointment_id=appt.id,
    )

    if normalize_local_datetime(appt.start_at) == start_at:
        raise AppError("NO_CHANGE", "同じ日時は選択できません。別の日時をお選びください。", 400)

    overlap_count = db.scalar(
        select(func.count())
        .select_from(Appointment)
        .where(
            Appointment.user_id == user.id,
            Appointment.start_at == start_at,
            Appointment.status == "confirmed",
            Appointment.id != appt.id,
        )
    )
    if overlap_count and overlap_count > 0:
        raise AppError(
            "TIME_CONFLICT",
            "同じ時間に別の予約があります。別の時間をお選びください。",
            400,
        )

    appt.start_at = start_at
    appt.updated_at = utcnow()
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return _to_out(db, appt)


@router.delete("/{appointment_id}")
def delete_appointment(
    appointment_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appt = db.get(Appointment, appointment_id)

    if not appt or appt.user_id != user.id or appt.status != "confirmed":
        raise AppError("NOT_FOUND", "予約が見つかりません。", 404)

    db.delete(appt)
    db.commit()

    return {"status": "ok"}
