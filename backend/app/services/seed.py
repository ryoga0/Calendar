from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import sessionmaker

from app.models import Department

def seed_if_empty(SessionLocal: sessionmaker) -> None:
    db = SessionLocal()
    try:
        n = db.scalar(select(func.count()).select_from(Department))
        if n and n > 0:
            return

        now = datetime.now(timezone.utc)

        depts = [
            Department(
                id=str(uuid.uuid4()),
                name="内科",
                sort_order=10,
                is_active=True,
            ),
            Department(
                id=str(uuid.uuid4()),
                name="外科",
                sort_order=20,
                is_active=True,
            ),
            Department(
                id=str(uuid.uuid4()),
                name="整形外科",
                sort_order=30,
                is_active=True,
            ),
        ]

        db.add_all(depts)
        db.commit()

    finally:
        db.close()