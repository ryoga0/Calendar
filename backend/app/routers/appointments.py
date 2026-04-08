import uuid
from datetime import datetime, date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.exceptions import AppError
from app.models import Appointment, Department, User
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentListResponse,
    AppointmentOut,
)
from app.utils.timeutil import utcnow

router = APIRouter(prefix="/appointments", tags=["appointments"])


def _to_out(db: Session, appt: Appointment) -> AppointmentOut:
    dept = db.get(Department, appt.department_id)
    return AppointmentOut(
        id=appt.id,
        user_id=appt.user_id,
        department_id=appt.department_id,
        department_name=dept.name if dept else None,
        slot_id="",  # 使わないので空
        status=appt.status,
        start_at=appt.start_at,
        end_at=appt.start_at,
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
        .where(Appointment.user_id == user.id)
        .order_by(Appointment.created_at.desc())
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


@router.post("", response_model=AppointmentOut)
def create_appointment(
    body: AppointmentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AppointmentOut:

    # 同じ診療科の予約制限
    exists = db.scalar(
        select(func.count())
        .select_from(Appointment)
        .where(
            Appointment.user_id == user.id,
            Appointment.department_id == body.department_id,
            Appointment.status == "confirmed",
        )
    )
    if exists and exists > 0:
        raise AppError("ALREADY_EXISTS", "この診療科は既に予約済みです", 400)

    now = utcnow()

    appt = Appointment(
        id=str(uuid.uuid4()),
        user_id=user.id,
        department_id=body.department_id,
        status="confirmed",
        start_at=body.start_at,
        created_at=now,
        updated_at=now,
    )

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

    if not appt or appt.user_id != user.id:
        raise AppError("NOT_FOUND", "予約が見つかりません", 404)

    appt.status = "cancelled"
    appt.updated_at = utcnow()

    db.add(appt)
    db.commit()

    return {"status": "ok"}