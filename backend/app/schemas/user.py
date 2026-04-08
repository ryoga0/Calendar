from pydantic import BaseModel, Field

# 新規追加
class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    phone: str | None = None


# 出力用
class UserOut(BaseModel):
    id: str
    email: str
    name: str
    phone: str | None = None

    model_config = {"from_attributes": True}


# 更新用
class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=20)