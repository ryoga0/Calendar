# app/routers/slots.py

from datetime import date, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.schemas.slot import SlotListResponse, SlotOut
from app.utils.timeutil import aware_utc, to_local_date, utcnow

router = APIRouter(prefix="/slots", tags=["slots"])

TZ = ZoneInfo(settings.timezone)


@router.get("", response_model=SlotListResponse)
def list_slots(
    department_id: str = Query(..., min_length=1),
    from_date: date | None = Query(None, description="ISO日付（含む）"),
    to_date: date | None = Query(None, description="ISO日付（含む）"),
    db: Session = Depends(get_db),
) -> SlotListResponse:
    
    # 今日〜最大30日
    today = utcnow().astimezone(TZ).date()
    start_d = from_date or today
    end_d = to_date or (today + timedelta(days=30))

    if end_d < start_d:
        end_d = start_d

    # 休診日取得
    closure_dates = set(
        db.scalars(
            select(DepartmentClosure.closure_date)
            .where(DepartmentClosure.department_id == department_id)
        ).all()
    )

    now = utcnow()

    # スロット取得
    rows = db.scalars(
        select(Slot)
        .where(
            Slot.department_id == department_id,
            Slot.is_blocked.is_(False),
        )
        .order_by(Slot.start_at.asc())
    ).all()

    items: list[SlotOut] = []

    for s in rows:
        sa = aware_utc(s.start_at)

        # 過去は除外
        if sa <= now:
            continue

        # ローカル日付変換
        ld = to_local_date(sa)

        # 範囲外除外
        if ld < start_d or ld > end_d:
            continue

        # 休診日除外
        if ld in closure_dates:
            continue

        # 空き判定
        available = s.booked_count < s.capacity

        items.append(
            SlotOut(
                id=s.id,
                department_id=s.department_id,
                start_at=s.start_at,
                end_at=s.end_at,
                available=available,
            )
        )

    return SlotListResponse(items=items)