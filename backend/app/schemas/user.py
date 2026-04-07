from pydantic import BaseModel, Field


class UserOut(BaseModel):
    id: str
    email: str
    display_name: str
    phone: str | None = None

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
