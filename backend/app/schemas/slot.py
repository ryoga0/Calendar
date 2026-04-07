# app/schemas/slot.py

from datetime import datetime
from pydantic import BaseModel
from typing import List


# 1件のスロット
class SlotOut(BaseModel):
    id: str
    department_id: str
    start_at: datetime
    end_at: datetime
    available: bool

    class Config:
        orm_mode = True  # SQLAlchemy対応


# レスポンス全体
class SlotListResponse(BaseModel):
    items: List[SlotOut]