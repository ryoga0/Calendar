from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.firebase_support import firestore_now, get_firestore_client
from app.models import Department

DEPARTMENT_SEEDS = (
    {"name": "内科", "sort_order": 10},
    {"name": "外科", "sort_order": 20},
    {"name": "整形外科", "sort_order": 30},
)


def _seed_sqlalchemy_if_empty(session_local: sessionmaker) -> None:
    db = session_local()
    try:
        department_count = db.scalar(select(func.count()).select_from(Department))
        if department_count and department_count > 0:
            return

        departments = [
            Department(
                id=str(uuid.uuid4()),
                name=item["name"],
                sort_order=item["sort_order"],
                is_active=True,
            )
            for item in DEPARTMENT_SEEDS
        ]

        db.add_all(departments)
        db.commit()
    finally:
        db.close()


def _seed_firestore_if_empty() -> None:
    client = get_firestore_client()
    collection = client.collection("departments")
    existing = list(collection.limit(1).stream())
    if existing:
        return

    batch = client.batch()
    for item in DEPARTMENT_SEEDS:
        doc_ref = collection.document(str(uuid.uuid4()))
        batch.set(
            doc_ref,
            {
                "name": item["name"],
                "sort_order": item["sort_order"],
                "is_active": True,
                "created_at": firestore_now(),
                "updated_at": firestore_now(),
            },
        )
    batch.commit()


def seed_if_empty(session_local: sessionmaker | None = None) -> None:
    if settings.data_provider == "sqlalchemy":
        if session_local is None:
            raise RuntimeError("SQLAlchemy seed には SessionLocal が必要です。")
        _seed_sqlalchemy_if_empty(session_local)
        return

    if settings.data_provider == "firebase":
        _seed_firestore_if_empty()
        return

    raise RuntimeError(f"Unsupported data_provider: {settings.data_provider}")
