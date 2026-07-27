"""Test fixtures.

Tests run against a dedicated `sellersense_test` database on the docker-compose
Postgres (real pgvector, real migrations — the closest thing to production).
The database is created if missing, migrated once per session via Alembic, and
every table is truncated between tests.
"""
import os

# Must be set before any `app.*` import: settings read the environment once.
TEST_DATABASE_URL = "postgresql+asyncpg://sellersense:sellersense@localhost:5432/sellersense_test"
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["TESTING"] = "1"
os.environ["LLM_PROVIDER"] = "mock"
os.environ["EMBEDDINGS_PROVIDER"] = "mock"

import asyncpg  # noqa: E402
import httpx  # noqa: E402
import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from sqlalchemy import text  # noqa: E402

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _ensure_test_database() -> None:
    """Create sellersense_test if it doesn't exist (sync helper, own loop)."""
    import asyncio

    async def create() -> None:
        conn = await asyncpg.connect(
            user="sellersense", password="sellersense", database="postgres", host="localhost"
        )
        try:
            exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = 'sellersense_test'")
            if not exists:
                await conn.execute("CREATE DATABASE sellersense_test")
        finally:
            await conn.close()

    asyncio.run(create())


@pytest.fixture(scope="session", autouse=True)
def migrated_db():
    """Create + migrate the test database once for the whole run."""
    _ensure_test_database()
    cfg = Config(os.path.join(BACKEND_DIR, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(BACKEND_DIR, "alembic"))
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")
    yield


@pytest.fixture(autouse=True)
async def clean_tables(migrated_db):
    """Truncate all data tables between tests."""
    from app.db.session import engine

    yield
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "TRUNCATE reply_drafts, feedback_alerts, keyword_stats, analysis_jobs, "
                "reviews, theme_clusters, datasets, competitors, users CASCADE"
            )
        )


@pytest.fixture
async def client():
    from app.main import app

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture
async def auth_client(client):
    """Client with a registered free-tier user; token pre-set on headers."""
    res = await client.post(
        "/api/auth/register",
        json={"email": "seller@test.co", "name": "Test Seller", "password": "S3cure!pass"},
    )
    assert res.status_code == 201, res.text
    token = res.json()["token"]
    client.headers["Authorization"] = f"Bearer {token}"
    client.user_id = res.json()["user"]["id"]
    return client


@pytest.fixture
async def premium_client(auth_client):
    """auth_client upgraded to the premium tier directly in the DB."""
    from app.db.session import async_session_factory
    from app.models import User

    async with async_session_factory() as session:
        user = await session.get(User, __import__("uuid").UUID(auth_client.user_id))
        user.tier = "premium"
        await session.commit()
    return auth_client
