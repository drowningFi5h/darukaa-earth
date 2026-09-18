from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")
    database_url: str = "postgresql+psycopg://darukaa:darukaa@localhost:5433/darukaa"
    jwt_secret: str
    demo_password: str
    app_origin: str = "http://localhost:5173"
    cookie_secure: bool = False

    @field_validator("jwt_secret")
    @classmethod
    def secret_length(cls, value: str) -> str:
        if len(value) < 32:
            raise ValueError("JWT_SECRET must contain at least 32 characters")
        return value

    @field_validator("demo_password")
    @classmethod
    def password_length(cls, value: str) -> str:
        if len(value) < 10:
            raise ValueError("DEMO_PASSWORD must contain at least 10 characters")
        return value

    @field_validator("database_url")
    @classmethod
    def driver(cls, value: str) -> str:
        return value.replace("postgres://", "postgresql+psycopg://", 1).replace(
            "postgresql://", "postgresql+psycopg://", 1
        )


settings = Settings()
