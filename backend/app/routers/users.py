from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.user import UserOut, UserUpdate
from app.utils.timeutil import utcnow

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def read_me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("/me", response_model=UserOut)
def update_me(
    body: UserUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    if body.user_name is not None:
        user.user_name = body.user_name
    if body.phone is not None:
        user.phone = body.phone
    user.updated_at = utcnow()
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)
