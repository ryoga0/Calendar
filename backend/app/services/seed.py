from __future__ import annotations

import uuid
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker

from app.models import Department, DepartmentClosure, Slot

TZ = ZoneInfo("Asia/Tokyo")


def seed_if_empty(SessionLocal: sessionmaker) -> None:
    db = SessionLocal()
    try:
        n = db.scalar(select(func.count()).select_from(Department))
        if n and n > 0:
            return

        depts = [
            Department(id=str(uuid.uuid4()), name="内科", sort_order=10, is_active=True),
            Department(id=str(uuid.uuid4()), name="外科", sort_order=20, is_active=True),
            Department(id=str(uuid.uuid4()), name="整形外科", sort_order=30, is_active=True),
        ]
        db.add_all(depts)
        db.flush()

        today = datetime.now(TZ).date()
        start_day = today + timedelta(days=1)
        for d in range(14):
            day = start_day + timedelta(days=d)
            if day.weekday() >= 5:
                continue
            for dept in depts:
                for hour in range(9, 17):
                    start_local = datetime.combine(day, time(hour, 0), tzinfo=TZ)
                    end_local = start_local + timedelta(hours=1)
                    start_utc = start_local.astimezone(timezone.utc)
                    end_utc = end_local.astimezone(timezone.utc)
                    db.add(
                        Slot(
                            id=str(uuid.uuid4()),
                            department_id=dept.id,
                            start_at=start_utc,
                            end_at=end_utc,
                            capacity=5,
                            booked_count=0,
                            is_blocked=False,
                        )
                    )

        db.add(
            DepartmentClosure(
                id=str(uuid.uuid4()),
                department_id=depts[0].id,
                closure_date=today + timedelta(days=7),
                reason="シード例: 休診日（テスト用）",
                created_at=datetime.now(timezone.utc),
            )
        )

        db.commit()
    finally:
        db.close()
