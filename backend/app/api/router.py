"""Top-level /api router. Feature routers are added here as they land."""
from fastapi import APIRouter

from app.api import auth, billing, dashboard, datasets, health, jobs, premium

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(billing.router)
api_router.include_router(datasets.router)
api_router.include_router(dashboard.router)
api_router.include_router(jobs.router)
api_router.include_router(premium.router)
