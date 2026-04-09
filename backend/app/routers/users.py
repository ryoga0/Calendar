from fastapi import APIRouter, Depends

from app.deps import get_current_user, get_user_repository
from app.domain import UserRecord
from app.repositories import UserRepository
from app.schemas.user import UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def read_me(user: UserRecord = Depends(get_current_user)) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        user_name=user.user_name,
        phone=user.phone,
    )


@router.patch("/me", response_model=UserOut)
def update_me(
    body: UserUpdate,
    user: UserRecord = Depends(get_current_user),
    users: UserRepository = Depends(get_user_repository),
) -> UserOut:
    updated = users.update_profile(
        user.id,
        user_name=body.user_name,
        phone=body.phone,
    )
    return UserOut(
        id=updated.id,
        email=updated.email,
        user_name=updated.user_name,
        phone=updated.phone,
    )
