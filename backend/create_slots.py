# create_slots.py

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import uuid

from app.database import SessionLocal
from app.models import Slot

TZ = ZoneInfo("Asia/Tokyo")
DEPARTMENT_ID = "54ff9a40-473b-4902-99ec-252219519e67"

db = SessionLocal()

try:
    # =========================
    # ① 完全削除（確認付き）
    # =========================
    deleted = db.query(Slot).delete()
    db.commit()
    print(f"削除件数: {deleted}")

    # =========================
    # ② スロット生成
    # =========================
    start_date = datetime(2026, 4, 7, tzinfo=TZ)

    for day in range(7):
        current_date = start_date + timedelta(days=day)

        for hour in range(9, 18):
            start_dt = current_date.replace(hour=hour, minute=0, second=0)
            end_dt = current_date.replace(hour=hour + 1, minute=0, second=0)

            slot = Slot(
                id=str(uuid.uuid4()),
                department_id=DEPARTMENT_ID,
                start_at=start_dt,
                end_at=end_dt,
                capacity=5,
                booked_count=0,
                is_blocked=False,
            )

            db.add(slot)

    db.commit()
    print("スロット再生成完了！")

finally:
    db.close()