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

    # In-flight request ceilings for the two LLM stages. Env-tunable on purpose:
    # the right value depends on the account's rate limits, not on the code, so
    # it can be dialled back on a deployed service without a rebuild. The SDK
    # retries 429s twice with backoff, which means over-shooting shows up as
    # *slower* runs rather than errors — see docs/benchmarks.md.
    sentiment_concurrency: int = 8
    theme_label_concurrency: int = 8

    alert_threshold: float = 0.15

    cors_origins: str = "http://localhost:5173"

    # Set by the test suite: disables connection pooling so each test's event
    # loop gets fresh connections.
    testing: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
