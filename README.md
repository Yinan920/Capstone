# SellerSense

AI-driven customer-feedback intelligence for small/medium e-commerce sellers:
upload store reviews → async AI analysis (sentiment, theme clustering, complaint
keywords, alerts) → insights dashboard, competitor benchmarking, and reply drafts.

**Live demo (GCP Cloud Run + Cloud SQL):** https://sellersense-414647520736.us-central1.run.app
— sign in with `demo@novabrew.co` / `demo1234!` (premium) or register a free account.
Architecture, commands, and the decisions-and-pitfalls writeup: [docs/deployment.md](docs/deployment.md).

## AI providers: a deliberate two-mode design

Every AI capability — sentiment scoring, embeddings, theme labeling, reply drafting — sits
behind an adapter interface ([backend/app/integrations/](backend/app/integrations/)). Two
interchangeable implementations ship:

| | Mock adapters (deployed default) | Real Claude |
|---|---|---|
| Cost / keys | $0, no API key | metered, needs `ANTHROPIC_API_KEY` |
| Output | deterministic — same input, same result | model-generated |
| Used for | the public demo, CI, reproducible grading | production-grade analysis |
| Models | — | Haiku 4.5 (batched sentiment, structured output), Sonnet 5 (theme summaries, replies) |

The live demo runs the **mock** adapters on purpose: anyone can click through it at zero
cost and get identical results every time, which is what you want for a shared demo URL and
for a test suite that must not flake. Switching is **configuration, not code** — the
`anthropic` SDK is already baked into the production image, so it takes one command:

```bash
gcloud run services update sellersense --region us-central1 \
  --set-secrets ANTHROPIC_API_KEY=anthropic-api-key:latest,DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest \
  --set-env-vars LLM_PROVIDER=anthropic,EMBEDDINGS_PROVIDER=mock
```

### Verified with real Claude

The real path has been run end-to-end on the deployed service — same 50-review CSV, same
pipeline, only the adapter swapped. Real Claude analyzed all 50 reviews in ~30 seconds and
produced measurably sharper analysis:

![Dashboard powered by real Claude](docs/images/real-claude-themes.png)

| | Mock adapter | Real Claude (Sonnet 5) |
|---|---|---|
| Theme label | "Packaging damage" | "Damaged packaging on arrival" |
| Theme summary | *"Customers frequently mention box, arrived, machine. Recurring complaint driver."* | *"A high volume of reviews report crushed, dented, or torn boxes leading to damaged or cracked units on arrival, sometimes on repeat orders; while support/replacements are praised when needed, packaging quality is a recurring and significant pain point."* |
| Complaint themes found | 2 | **3** — correctly caught the battery-drain cluster the keyword heuristic mislabeled as neutral |
| Net sentiment | +15% | +8% (harsher, more nuanced on 2-star reviews) |
| Reply drafts | template keyed on theme | written to the specific review — cites the opened box *and* the missing manual, offers a matching remedy |

That last row of the mock column is the honest tradeoff: the deterministic adapters are
keyword-driven, so they occasionally mislabel a mixed cluster. Real Claude fixes it. Both
are one env var apart.

Monorepo:

- `frontend/` — React 18 + TypeScript + Vite + Tailwind + Recharts, fully integrated with the backend (JWT auth, upload flow with live job progress; `VITE_USE_MOCKS=true` restores the standalone mock demo)
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
