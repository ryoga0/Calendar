from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app.services.seed import seed_if_empty

    if settings.data_provider == "sqlalchemy":
        from app import models  # noqa: F401

        Base.metadata.create_all(bind=engine)
        _create_partial_unique_index()
        seed_if_empty(SessionLocal)
        return

    if settings.data_provider == "firebase":
        seed_if_empty()
        return

    raise RuntimeError(f"Unsupported data_provider: {settings.data_provider}")


def _create_partial_unique_index() -> None:
    if not settings.database_url.startswith("sqlite"):
        return
    stmt = """
    CREATE UNIQUE INDEX IF NOT EXISTS ux_appt_user_dept_confirmed
    ON appointments (user_id, department_id)
    WHERE status = 'confirmed'
    """
    with engine.begin() as conn:
        conn.execute(text(stmt))
