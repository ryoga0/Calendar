# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import slots, departments

app = FastAPI()

# CORS（フロント接続用）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(slots.router, prefix="/api/v1")
app.include_router(departments.router, prefix="/api/v1")