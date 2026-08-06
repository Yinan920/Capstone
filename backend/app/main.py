from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import APP_VERSION, settings

app = FastAPI(title="SellerSense API", version=APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

# --- Single-container production mode -------------------------------------
# The production image bakes the built frontend into ./static (see Dockerfile).
# When present, serve it from the same origin: assets under /assets, and a SPA
# fallback that returns index.html for any non-/api path — so deep links like
# /login or /app/upload survive a browser refresh. Registered AFTER the API
# router, so /api/* always wins. In local dev the directory doesn't exist and
# the app behaves exactly as before (API only, Vite serves the frontend).
FRONTEND_DIST = Path(__file__).resolve().parents[1] / "static"
if FRONTEND_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/favicon.svg", include_in_schema=False)
    async def favicon() -> FileResponse:
        return FileResponse(FRONTEND_DIST / "favicon.svg")

    @app.get("/{spa_path:path}", include_in_schema=False)
    async def spa_fallback(spa_path: str) -> FileResponse:
        return FileResponse(FRONTEND_DIST / "index.html")
