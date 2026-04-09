from __future__ import annotations

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.exceptions import AppError
from app.models import Appointment, Department
from app.schemas.availability import AvailabilityItemOut, AvailabilityResponse

TZ = ZoneInfo(settings.timezone)
WEEKDAY_TIMES = ("09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00")
SATURDAY_TIMES = ("09:00", "10:00", "11:00")


def hospital_now() -> datetime:
    return datetime.now(TZ).replace(tzinfo=None, second=0, microsecond=0)


def normalize_local_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(second=0, microsecond=0)
    return value.astimezone(TZ).replace(tzinfo=None, second=0, microsecond=0)


def schedule_times_for_date(target_date: date) -> tuple[str, ...]:
    weekday = target_date.weekday()
    if weekday < 5:
        return WEEKDAY_TIMES
    if weekday == 5:
        return SATURDAY_TIMES
    return ()


def build_local_start_at(target_date: date, time_str: str) -> datetime:
    hour, minute = (int(part) for part in time_str.split(":"))
    return datetime.combine(target_date, time(hour, minute))


def build_daily_availability(
    db: Session,
    department_id: str,
    target_date: date,
    exclude_appointment_id: str | None = None,
) -> AvailabilityResponse:
    department = db.get(Department, department_id)
    if not department or not department.is_active:
        raise AppError("NOT_FOUND", "診療科が見つかりません。", 404)

    candidate_times = schedule_times_for_date(target_date)
    day_start = datetime.combine(target_date, time.min)
    day_end = day_start + timedelta(days=1)

    rows = db.scalars(
        select(Appointment)
        .where(
            Appointment.department_id == department_id,
            Appointment.status == "confirmed",
            Appointment.start_at >= day_start,
            Appointment.start_at < day_end,
        )
        .order_by(Appointment.start_at.asc())
    ).all()

    booked = {
        normalize_local_datetime(appt.start_at)
        for appt in rows
        if appt.id != exclude_appointment_id
    }

    now = hospital_now()
    items: list[AvailabilityItemOut] = []

    for time_str in candidate_times:
        start_at = build_local_start_at(target_date, time_str)

        if start_at <= now:
            items.append(
                AvailabilityItemOut(
                    time=time_str,
                    start_at=start_at,
                    available=False,
                    reason="受付終了",
                )
            )
            continue

        if start_at in booked:
            items.append(
                AvailabilityItemOut(
                    time=time_str,
                    start_at=start_at,
                    available=False,
                    reason="満員",
                )
            )
            continue

        items.append(
            AvailabilityItemOut(
                time=time_str,
                start_at=start_at,
                available=True,
                reason=None,
            )
        )

    return AvailabilityResponse(
        department_id=department_id,
        date=target_date,
        items=items,
    )


def ensure_reservable_datetime(
    db: Session,
    department_id: str,
    requested_start_at: datetime,
    exclude_appointment_id: str | None = None,
) -> datetime:
    normalized_start_at = normalize_local_datetime(requested_start_at)
    availability = build_daily_availability(
        db=db,
        department_id=department_id,
        target_date=normalized_start_at.date(),
        exclude_appointment_id=exclude_appointment_id,
    )

    for item in availability.items:
        if normalize_local_datetime(item.start_at) != normalized_start_at:
            continue

        if item.available:
            return normalized_start_at

        if item.reason == "満員":
            raise AppError("FULL", "この日時は満員です。別の日時をお選びください。", 409)
        raise AppError("UNAVAILABLE", "この日時は予約できません。別の日時をお選びください。", 400)

    raise AppError("INVALID_TIME", "診療時間外のため、この日時は予約できません。", 400)
