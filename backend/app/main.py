from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routers import departments, appointments, auth
from app.database import init_db
from app.exceptions import AppError

app = FastAPI()

@app.on_event("startup")
def startup():
    init_db()

@app.exception_handler(AppError)
def app_exception_handler(request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": exc.code,
            "message": exc.message,
        },
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(departments.router, prefix="/api/v1")
app.include_router(appointments.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")