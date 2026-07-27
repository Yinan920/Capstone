from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import APP_VERSION
from app.db.session import engine

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        database = "up"
    except Exception:
        database = "down"
    return {"status": "ok", "database": database, "version": APP_VERSION}
