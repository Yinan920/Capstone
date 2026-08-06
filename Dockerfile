# SellerSense production image: one container serving the FastAPI backend and
# the built React frontend from the same origin (frontend calls /api relative —
# no CORS, no baked-in hostnames).

# --- Stage 1: build the frontend -------------------------------------------
FROM node:22-slim AS frontend
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts
COPY frontend/ ./
ENV VITE_USE_MOCKS=false \
    VITE_API_BASE_URL=/api
RUN npm run build

# --- Stage 2: backend + static ---------------------------------------------
FROM python:3.12-slim
WORKDIR /app
COPY backend/ ./
RUN pip install --no-cache-dir .
COPY --from=frontend /fe/dist ./static

# Cloud Run injects PORT (8080). Migrations are NOT run here — they run as a
# one-off Cloud Run Job (concurrent instances must not race Alembic).
ENV PYTHONUNBUFFERED=1
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}
