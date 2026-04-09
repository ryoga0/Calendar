from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Hospital Calendar API"
    database_url: str = "sqlite:///./calendar.db"
    data_provider: str = "sqlalchemy"
    auth_provider: str = "local_jwt"
    secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    access_token_expire_minutes: int = 60 * 8
    algorithm: str = "HS256"
    timezone: str = "Asia/Tokyo"
    cancel_change_deadline_hours: int = 24
    firebase_project_id: str | None = None
    firebase_credentials_path: str | None = None
    firebase_web_api_key: str | None = None


settings = Settings()
