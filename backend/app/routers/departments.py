from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Department
from app.schemas.department import DepartmentListResponse, DepartmentOut

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("", response_model=DepartmentListResponse)
def list_departments(db: Session = Depends(get_db)) -> DepartmentListResponse:
    rows = db.scalars(
        select(Department).where(Department.is_active.is_(True)).order_by(Department.sort_order.asc())
    ).all()
    return DepartmentListResponse(items=[DepartmentOut.model_validate(r) for r in rows])
