import uuid
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.exceptions import AppError
from app.models import Appointment, Department, DepartmentClosure, Slot, User
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentListResponse,
    AppointmentOut,
    AppointmentPatch,
)
from app.utils.timeutil import aware_utc, is_one_hour_slot, to_local_date, utcnow
from app.utils.timeutil import deadline_ok as slot_deadline_ok

router = APIRouter(prefix="/appointments", tags=["appointments"])


def _slot_bookable_for_patient(
    db: Session,
    slot: Slot,
    department_id: str,
) -> None:
    if slot.department_id != department_id:
        raise AppError("VALIDATION_ERROR", "診療科と枠が一致しません。", 422)
    if slot.is_blocked:
        raise AppError("SLOT_UNAVAILABLE", "この枠は現在予約を受け付けていません。", 400)
    if slot.booked_count >= slot.capacity:
        raise AppError("SLOT_FULL", "この時間は埋まりました。別の時間を選んでください。", 409)
    if not is_one_hour_slot(aware_utc(slot.start_at), aware_utc(slot.end_at)):
        raise AppError("VALIDATION_ERROR", "予約枠のデータが不正です。", 500)
    now = utcnow()
    if aware_utc(slot.start_at) <= now:
        raise AppError("SLOT_UNAVAILABLE", "過去の枠は選べません。", 400)
    local_d = to_local_date(aware_utc(slot.start_at))
    exists = db.scalar(
        select(func.count())
        .select_from(DepartmentClosure)
        .where(
            DepartmentClosure.department_id == department_id,
            DepartmentClosure.closure_date == local_d,
        )
    )
    if exists and exists > 0:
        raise AppError("SLOT_UNAVAILABLE", "この日は休診です。別の日を選んでください。", 400)


def _to_out(db: Session, appt: Appointment) -> AppointmentOut:
    dept = db.get(Department, appt.department_id)
    slot = db.get(Slot, appt.slot_id)
    if not slot:
        raise AppError("NOT_FOUND", "予約枠が見つかりません。", 404)
    return AppointmentOut(
        id=appt.id,
        user_id=appt.user_id,
        department_id=appt.department_id,
        department_name=dept.name if dept else None,
        slot_id=appt.slot_id,
        status=appt.status,
        start_at=slot.start_at if slot else appt.created_at,
        end_at=slot.end_at if slot else appt.created_at,
        created_at=appt.created_at,
        updated_at=appt.updated_at,
    )


@router.get("", response_model=AppointmentListResponse)
def list_appointments(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    status: str | None = Query(None, description="confirmed または cancelled"),
) -> AppointmentListResponse:
    q = (
        select(Appointment)
        .options(joinedload(Appointment.slot))
        .where(Appointment.user_id == user.id)
    )
    if status:
        q = q.where(Appointment.status == status)
    rows = db.scalars(q.order_by(Appointment.created_at.desc())).unique().all()

    items: list[AppointmentOut] = []
    for a in rows:
        slot = a.slot
        if not slot:
            continue
        local_d = to_local_date(aware_utc(slot.start_at))
        if from_date and local_d < from_date:
            continue
        if to_date and local_d > to_date:
            continue
        items.append(_to_out(db, a))
    return AppointmentListResponse(items=items)


@router.post("", response_model=AppointmentOut)
def create_appointment(
    body: AppointmentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AppointmentOut:
    confirmed_same_dept = db.scalar(
        select(func.count())
        .select_from(Appointment)
        .where(
            Appointment.user_id == user.id,
            Appointment.department_id == body.department_id,
            Appointment.status == "confirmed",
        )
    )
    if confirmed_same_dept and confirmed_same_dept > 0:
        raise AppError(
            "DEPARTMENT_APPOINTMENT_EXISTS",
            "この診療科では、すでに予約があります。",
            400,
        )

    confirmed_total = db.scalar(
        select(func.count())
        .select_from(Appointment)
        .where(Appointment.user_id == user.id, Appointment.status == "confirmed")
    )
    if confirmed_total and confirmed_total >= 3:
        raise AppError(
            "APPOINTMENT_LIMIT_REACHED",
            "予約は、異なる診療科で同時に3件までです。",
            400,
        )

    slot = db.get(Slot, body.slot_id)
    if not slot:
        raise AppError("NOT_FOUND", "予約枠が見つかりません。", 404)
    _slot_bookable_for_patient(db, slot, body.department_id)

    now = utcnow()
    appt = Appointment(
        id=str(uuid.uuid4()),
        user_id=user.id,
        department_id=body.department_id,
        slot_id=slot.id,
        status="confirmed",
        created_at=now,
        updated_at=now,
    )
    slot.booked_count += 1
    db.add(appt)
    db.add(slot)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppError("CONFLICT", "予約の登録に失敗しました。再度お試しください。", 409) from None
    db.refresh(appt)
    return _to_out(db, appt)


@router.get("/{appointment_id}", response_model=AppointmentOut)
def get_appointment(
    appointment_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AppointmentOut:
    appt = db.get(Appointment, appointment_id)
    if not appt or appt.user_id != user.id:
        raise AppError("NOT_FOUND", "予約が見つかりません。", 404)
    return _to_out(db, appt)


@router.patch("/{appointment_id}", response_model=AppointmentOut)
def patch_appointment(
    appointment_id: str,
    body: AppointmentPatch,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AppointmentOut:
    appt = db.get(Appointment, appointment_id)
    if not appt or appt.user_id != user.id:
        raise AppError("NOT_FOUND", "予約が見つかりません。", 404)
    if appt.status != "confirmed":
        raise AppError("FORBIDDEN", "この予約は変更できません。", 403)

    old_slot = db.get(Slot, appt.slot_id)
    if not old_slot:
        raise AppError("NOT_FOUND", "予約枠が見つかりません。", 404)
    if not slot_deadline_ok(old_slot.start_at, settings.cancel_change_deadline_hours):
        raise AppError(
            "DEADLINE_PASSED",
            "変更の締切を過ぎています。窓口へご連絡ください。",
            400,
        )

    new_slot = db.get(Slot, body.slot_id)
    if not new_slot:
        raise AppError("NOT_FOUND", "予約枠が見つかりません。", 404)
    if new_slot.id == old_slot.id:
        return _to_out(db, appt)
    if new_slot.department_id != appt.department_id:
        raise AppError(
            "DEPARTMENT_CHANGE_NOT_ALLOWED",
            "診療科を変える場合は、いったんキャンセルしてから別途予約してください。",
            400,
        )
    _slot_bookable_for_patient(db, new_slot, appt.department_id)

    old_slot.booked_count = max(0, old_slot.booked_count - 1)
    new_slot.booked_count += 1
    appt.slot_id = new_slot.id
    appt.updated_at = utcnow()
    db.add(old_slot)
    db.add(new_slot)
    db.add(appt)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppError("CONFLICT", "予約の変更に失敗しました。再度お試しください。", 409) from None
    db.refresh(appt)
    return _to_out(db, appt)


@router.delete("/{appointment_id}")
def delete_appointment(
    appointment_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    appt = db.get(Appointment, appointment_id)
    if not appt or appt.user_id != user.id:
        raise AppError("NOT_FOUND", "予約が見つかりません。", 404)
    if appt.status != "confirmed":
        raise AppError("FORBIDDEN", "この予約はキャンセルできません。", 403)

    slot = db.get(Slot, appt.slot_id)
    if not slot:
        raise AppError("NOT_FOUND", "予約枠が見つかりません。", 404)
    if not slot_deadline_ok(slot.start_at, settings.cancel_change_deadline_hours):
        raise AppError(
            "DEADLINE_PASSED",
            "キャンセルの締切を過ぎています。窓口へご連絡ください。",
            400,
        )

    slot.booked_count = max(0, slot.booked_count - 1)
    appt.status = "cancelled"
    appt.updated_at = utcnow()
    db.add(slot)
    db.add(appt)
    db.commit()
    return {"status": "ok"}
