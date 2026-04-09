from app.repositories.contracts import AppointmentRepository, DepartmentRepository, UserRepository
from app.repositories.firestore import (
    FirestoreAppointmentRepository,
    FirestoreDepartmentRepository,
    FirestoreUserRepository,
)
from app.repositories.sqlalchemy import (
    SqlAlchemyAppointmentRepository,
    SqlAlchemyDepartmentRepository,
    SqlAlchemyUserRepository,
)

__all__ = [
    "AppointmentRepository",
    "DepartmentRepository",
    "FirestoreAppointmentRepository",
    "FirestoreDepartmentRepository",
    "FirestoreUserRepository",
    "SqlAlchemyAppointmentRepository",
    "SqlAlchemyDepartmentRepository",
    "SqlAlchemyUserRepository",
    "UserRepository",
]
