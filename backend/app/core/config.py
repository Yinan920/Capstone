"""Application settings, loaded from the repo-root .env (pydantic-settings).

Every field has a keyless default so a fresh clone runs with no configuration:
Postgres from docker-compose, mock AI providers, dev JWT secret.
"""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]

APP_VERSION = "0.1.0"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env", REPO_ROOT / "backend" / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+asyncpg://sellersense:sellersense@localhost:5432/sellersense"

    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 1440

    free_review_cap: int = 50
    premium_review_cap: int = 200

    llm_provider: str = "mock"  # mock | anthropic
    anthropic_api_key: str = ""
    embeddings_provider: str = "mock"  # mock | st

    alert_threshold: float = 0.15
    alert_window_days: int = 14

    cors_origins: str = "http://localhost:5173"

    # Set by the test suite: disables connection pooling so each test's event
    # loop gets fresh connections.
    testing: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
