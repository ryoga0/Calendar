from pydantic import BaseModel


class DepartmentOut(BaseModel):
    id: str
    name: str
    sort_order: int

    model_config = {"from_attributes": True}


class DepartmentListResponse(BaseModel):
    items: list[DepartmentOut]
