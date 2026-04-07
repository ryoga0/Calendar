from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from app.config import settings

TZ = ZoneInfo(settings.timezone)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def aware_utc(dt: datetime) -> datetime:
    """SQLite 等で naive が返る場合は UTC とみなして比較可能にする。"""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def to_local_date(dt: datetime) -> date:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(TZ).date()


def is_one_hour_slot(start_at: datetime, end_at: datetime) -> bool:
    if start_at.tzinfo is None:
        start_at = start_at.replace(tzinfo=timezone.utc)
    if end_at.tzinfo is None:
        end_at = end_at.replace(tzinfo=timezone.utc)
    return end_at - start_at == timedelta(hours=1)


def deadline_ok(slot_start: datetime, hours_before: int) -> bool:
    """変更・キャンセル可: 枠開始が現在から指定時間より後。"""
    st = aware_utc(slot_start)
    limit = utcnow() + timedelta(hours=hours_before)
    return st > limit
