# SellerSense

AI-driven customer-feedback intelligence for small/medium e-commerce sellers:
upload store reviews → async AI analysis (sentiment, theme clustering, complaint
keywords, alerts) → insights dashboard, competitor benchmarking, and reply drafts.

Monorepo:

- `frontend/` — React 18 + TypeScript + Vite + Tailwind + Recharts (Iteration 0 ships with mock data; flip `VITE_USE_MOCKS=false` to use the real API)
- `backend/` — FastAPI + SQLAlchemy 2.0 async + PostgreSQL 16 + pgvector
- `docs/` — API spec, database design, test cases & results

Runs with **zero API keys**: all AI providers (LLM, embeddings, email) default to
deterministic mock adapters selected by config.

## Quick start

### 1. Database (PostgreSQL 16 + pgvector)

```bash
docker compose up -d          # starts sellersense-db on localhost:5432
```

No Docker? Any Postgres with pgvector works — point `DATABASE_URL` in `.env` at it
(e.g. Homebrew: `brew install postgresql@16 pgvector`).

### 2. Backend

```bash
cd backend
python3.11 -m venv .venv && source .venv/bin/activate   # 3.11+
pip install -e ".[dev]"
cp ../.env.example ../.env    # defaults work as-is
alembic upgrade head          # create tables (enables pgvector)
uvicorn app.main:app --reload --port 8000
```

Check: `curl http://localhost:8000/api/health` → `{"status":"ok","database":"up",...}`

### 3. Demo data (optional)

```bash
cd backend && python -m scripts.seed
# demo login: demo@novabrew.co / demo1234!  (premium tier)
# a 50-row sample upload file lives at backend/data/sample_reviews.csv
```

### 4. Tests

```bash
cd backend && pytest               # 35 automated API tests (uses sellersense_test DB)
bash scripts/smoke.sh              # end-to-end curl smoke against the running server
```

### 5. Frontend (optional, mock mode by default)

```bash
cd frontend
npm install && npm run dev    # http://localhost:5173
```

## Documentation

- [docs/api-spec.md](docs/api-spec.md) — all 12 APIs with sample JSON input/output
- [docs/db-design.md](docs/db-design.md) — ERD + table DDL
- [docs/test-cases.md](docs/test-cases.md) / [docs/test-results.md](docs/test-results.md) — API test cases and executed results
