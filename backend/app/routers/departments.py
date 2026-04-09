from fastapi import APIRouter, Depends

from app.deps import get_department_repository
from app.repositories import DepartmentRepository
from app.schemas.department import DepartmentListResponse, DepartmentOut

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("", response_model=DepartmentListResponse)
def list_departments(
    departments: DepartmentRepository = Depends(get_department_repository),
) -> DepartmentListResponse:
    rows = departments.list_active()
    return DepartmentListResponse(
        items=[
            DepartmentOut(
                id=row.id,
                name=row.name,
                sort_order=row.sort_order,
                is_active=row.is_active,
            )
            for row in rows
        ]
    )
