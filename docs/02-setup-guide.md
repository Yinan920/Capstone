# 2. System Setup Instructions

**Audience:** a developer who has never seen this project and cannot ask anyone questions.
**Promise:** follow this document top to bottom and you will have the database, the backend and the frontend running locally, verified at each step, and you will be able to build and deploy the same code to Google Cloud.

**Time:** ~20 minutes for the local stack, ~40 minutes for a first cloud deployment (most of it waiting for Cloud SQL to provision).

| | |
|---|---|
| Repository | `SellerSense/` — a monorepo: `backend/`, `frontend/`, `docs/` |
| Live reference deployment | https://sellersense-ai.web.app |
| Demo account | `demo@novabrew.co` / `demo1234!` (Premium tier) |

---

## Table of contents

1. [Prerequisites](#21-prerequisites)
2. [Get the code](#22-get-the-code)
3. [Database setup](#23-database-setup-postgresql-16--pgvector)
4. [Backend setup](#24-backend-setup-fastapi)
5. [Frontend setup](#25-frontend-setup-react--vite)
6. [Configuration reference](#26-configuration-reference-every-environment-variable)
7. [Secrets management](#27-secrets-management)
8. [Build and deployment](#28-build-and-deployment)
9. [Full-stack validation checklist](#29-full-stack-validation-checklist)
10. [Troubleshooting the setup](#210-troubleshooting-the-setup)

---

## 2.1 Prerequisites

### Operating system

Developed and verified on **macOS 15 (Darwin 24.3.0, Apple silicon)**. Linux works unchanged. On Windows use **WSL2 (Ubuntu 22.04+)** — the shell commands below assume a POSIX shell (`bash`/`zsh`); PowerShell equivalents are not provided.

### Required software

| Tool | Minimum version | Why it is needed | Check it |
|---|---|---|---|
| Python | **3.11+** (3.13 used in development) | Backend runtime | `python3 --version` |
| Node.js | **20+** (22 used in the production image) | Frontend build and tests | `node --version` |
| npm | 10+ | Frontend dependencies | `npm --version` |
| Docker Desktop *or* Colima | any current | Runs PostgreSQL locally | `docker --version` |
| Git | 2.30+ | Source control | `git --version` |

> **Alternative to Docker:** any PostgreSQL 16 server with the `pgvector` extension available works — see [2.3, option B](#option-b--local-postgresql-without-docker).

### Optional software (only for cloud deployment / full testing)

| Tool | Needed for | Install |
|---|---|---|
| `gcloud` CLI | Deploying to Cloud Run, reading cloud logs | https://cloud.google.com/sdk/docs/install |
| `firebase-tools` | The public short URL (Firebase Hosting) | `npm install -g firebase-tools` |
| `jq` | The smoke-test scripts | `brew install jq` |
| `psql` | Inspecting the database by hand | ships with Postgres, or `brew install libpq` |
| Playwright browsers | End-to-end browser tests | `cd frontend && npx playwright install chromium` |

### Cloud services (deployment only)

A Google Cloud project with **billing enabled** and these APIs turned on: Cloud Run, Cloud SQL Admin, Artifact Registry, Cloud Build, Secret Manager. For the public short URL, the project must also be **linked to Firebase on the Blaze plan** (Cloud Run rewrites are not available on the free Spark plan).

### API keys

**None are required.** Every AI capability sits behind an adapter interface with a deterministic, keyless default (`LLM_PROVIDER=mock`, `EMBEDDINGS_PROVIDER=mock`). An `ANTHROPIC_API_KEY` is only needed if you want to run the real Claude path — see [2.6](#26-configuration-reference-every-environment-variable).

---

## 2.2 Get the code

```bash
git clone <repository-url> SellerSense
cd SellerSense
```

Everything below is run from the repository root unless a step says otherwise.

**Validation** — the three top-level parts are present:

```bash
ls
# expected to include: backend  frontend  docs  docker-compose.yml  Dockerfile  .env.example
```

---

## 2.3 Database setup (PostgreSQL 16 + pgvector)

The application stores 384-dimension review embeddings in a `vector` column, so the database **must** have the `pgvector` extension available. The first Alembic migration runs `CREATE EXTENSION IF NOT EXISTS vector` for you; it only needs the extension to be installed on the server.

### Option A — Docker Compose (recommended)

```bash
docker compose up -d
```

This starts one container, `sellersense-db`, from the `pgvector/pgvector:pg16` image:

| Setting | Value |
|---|---|
| Host / port | `localhost:5432` |
| Database | `sellersense` |
| User / password | `sellersense` / `sellersense` |
| Data volume | named volume `pgdata` — survives `docker compose down` |

**Validation:**

```bash
docker compose ps
# expected: sellersense-db ... Up (healthy)
```

```bash
docker exec sellersense-db psql -U sellersense -d sellersense -c "SELECT 1;"
# expected:  ?column?
#            ----------
#                    1
```

### Option B — Local PostgreSQL without Docker

```bash
brew install postgresql@16 pgvector      # macOS
brew services start postgresql@16
createdb sellersense
```

Then point `DATABASE_URL` at it in your `.env` (see [2.4](#24-backend-setup-fastapi), step 3), for example:

```
DATABASE_URL=postgresql+asyncpg://localhost:5432/sellersense
```

**Validation** — the extension must be installable:

```bash
psql -d sellersense -c "CREATE EXTENSION IF NOT EXISTS vector;" -c "\dx"
# expected: the extension list contains a row named "vector"
```

### Create the test database (needed to run the backend test suite)

The pytest suite uses a **separate** database so it can create and drop data freely:

```bash
# Docker:
docker exec sellersense-db psql -U sellersense -d postgres -c "CREATE DATABASE sellersense_test;"
# Homebrew:
createdb sellersense_test
```

**Validation:**

```bash
docker exec sellersense-db psql -U sellersense -d postgres -c "\l" | grep sellersense
# expected: both "sellersense" and "sellersense_test" are listed
```

---

## 2.4 Backend setup (FastAPI)

### Step 1 — Create and activate a virtual environment

```bash
cd backend
python3.11 -m venv .venv          # or python3.13 -m venv .venv
source .venv/bin/activate
```

Your prompt should now be prefixed with `(.venv)`.

### Step 2 — Install dependencies

```bash
pip install -e ".[dev]"
```

This installs the application (editable) plus the test tools: FastAPI, uvicorn, SQLAlchemy 2.0 (async), asyncpg, Alembic, pgvector, passlib/bcrypt, python-jose, NumPy, scikit-learn, pytest, pytest-asyncio, httpx.

Two **optional** extras exist and are not installed by default:

```bash
pip install -e ".[anthropic]"   # real Claude adapter (needs an API key)
pip install -e ".[st]"          # local sentence-transformers embeddings (~2 GB of model files)
```

**Validation:**

```bash
python -c "import fastapi, sqlalchemy, sklearn, pgvector; print('backend deps OK')"
# expected: backend deps OK
```

### Step 3 — Create the environment file

```bash
cp ../.env.example ../.env
```

The defaults work as-is for local development against the Docker database — **no editing is required** unless you chose option B above or want the real Claude path. Every setting is documented in [2.6](#26-configuration-reference-every-environment-variable).

> The backend reads `.env` from the **repository root** first, then `backend/.env`. Both are git-ignored.

### Step 4 — Run the database migrations

```bash
alembic upgrade head
```

This enables `pgvector` and creates all 9 tables.

**Validation:**

```bash
alembic current
# expected: 0001 (head)

docker exec sellersense-db psql -U sellersense -d sellersense -c "\dt"
# expected 9 tables: users, datasets, reviews, analysis_jobs, theme_clusters,
#                    keyword_stats, feedback_alerts, competitors, reply_drafts
```

### Step 5 — Load demo data (optional but recommended)

```bash
python -m scripts.seed
```

Creates the premium demo user `demo@novabrew.co` / `demo1234!` and two competitor records used by the benchmarking feature.

**Validation:**

```
expected output:
  demo user demo@novabrew.co reset to premium with the demo password
  competitor WanderBean Mini ...
  competitor PocketPress Pro ...
```

### Step 6 — Start the API

```bash
uvicorn app.main:app --reload --port 8000
```

**Validation** — in a second terminal:

```bash
curl http://localhost:8000/api/health
# expected: {"status":"ok","database":"up","version":"0.1.0"}
```

If `database` is `down`, the app is running but cannot reach Postgres — go back to [2.3](#23-database-setup-postgresql-16--pgvector).

Interactive API documentation is now at **http://localhost:8000/docs** (FastAPI's generated Swagger UI, listing all 16 endpoints).

### Step 7 — Run the backend test suite

```bash
pytest
```

**Validation:** `44 passed` (about 20 seconds). This suite runs real Alembic migrations against `sellersense_test`, so a failure here almost always means the test database from [2.3](#create-the-test-database-needed-to-run-the-backend-test-suite) is missing.

### Step 8 — Run the API smoke test

With the server from step 6 still running:

```bash
bash scripts/smoke.sh
```

**Validation:** 13 numbered steps ending in `SMOKE TEST PASSED`. This exercises register → login → upload → pipeline → dashboard → paywall (402) → tier cap (413) → premium features end to end with real HTTP calls.

---

## 2.5 Frontend setup (React + Vite)

### Step 1 — Install dependencies

```bash
cd frontend
npm install
```

### Step 2 — Choose a mode

The frontend runs in either of two modes, selected by one variable:

| Mode | Variable | What it does | When to use it |
|---|---|---|---|
| **Mock mode** (default) | `VITE_USE_MOCKS=true` | All API functions resolve from local fixtures; no backend needed | UI work, first look at the product |
| **Integrated mode** | `VITE_USE_MOCKS=false` | The same functions call the real backend at `VITE_API_BASE_URL` | Normal development, E2E tests |

For integrated mode, create `frontend/.env.local`:

```bash
cat > .env.local <<'EOF'
VITE_USE_MOCKS=false
VITE_API_BASE_URL=http://localhost:8000/api
EOF
```

> `.env.local` is git-ignored and never affects the test suite: `vite.config.ts` pins `VITE_USE_MOCKS=true` for Vitest deliberately, so a developer's local file cannot silently point the unit tests at a live backend.

### Step 3 — Start the dev server

```bash
npm run dev
```

**Validation:** open http://localhost:5173 — the SellerSense landing page renders. In integrated mode, register an account and confirm the network tab shows calls to `localhost:8000/api`.

CORS for the dev server is already allowed by the backend default `CORS_ORIGINS=http://localhost:5173`. (In production there is no CORS at all — the SPA and API share one origin.)

### Step 4 — Run the frontend tests

```bash
npm test
```

**Validation:** `Test Files 8 passed (8)`, `Tests 20 passed (20)`.

### Step 5 — Type-check and production build

```bash
npm run lint     # tsc --noEmit — no output means no type errors
npm run build    # emits frontend/dist/
```

**Validation:** `dist/index.html` and `dist/assets/` exist; `npm run preview` serves the built bundle at http://localhost:4173.

### Step 6 — Browser end-to-end tests (optional)

Requires the backend (port 8000) and frontend (port 5173, integrated mode) both running, plus Chromium:

```bash
npx playwright install chromium
node e2e/acceptance.mjs                                  # against local
BASE=https://sellersense-ai.web.app node e2e/acceptance.mjs   # against the deployment
```

**Validation:** `🎉 E2E ACCEPTANCE PASSED`, with screenshots written to `e2e/shots/` (local) or `e2e/shots-cloud/` (deployed).

---

## 2.6 Configuration reference (every environment variable)

### Backend — repository-root `.env`

| Variable | Default | Required? | Meaning |
|---|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://sellersense:sellersense@localhost:5432/sellersense` | yes (has a working default) | Async SQLAlchemy URL. **Must** use the `postgresql+asyncpg://` scheme. In Cloud Run it points at a unix socket: `...@/sellersense?host=/cloudsql/<PROJECT>:<REGION>:<INSTANCE>` |
| `JWT_SECRET` | `dev-secret-change-in-production` | yes in production | HMAC key for signing JWTs. Generate with `openssl rand -hex 32` |
| `JWT_EXPIRES_MINUTES` | `1440` | no | Token lifetime (24 h) |
| `FREE_REVIEW_CAP` | `50` | no | Max rows per upload on the Free plan; enforced server-side with HTTP 413 |
| `PREMIUM_REVIEW_CAP` | `200` | no | Same for Premium |
| `LLM_PROVIDER` | `mock` | no | `mock` = deterministic keyless adapter · `anthropic` = real Claude |
| `ANTHROPIC_API_KEY` | *(empty)* | only when `LLM_PROVIDER=anthropic` | Anthropic API key |
| `EMBEDDINGS_PROVIDER` | `mock` | no | `mock` = deterministic MD5-seeded vectors · `st` = local sentence-transformers (downloads `all-MiniLM-L6-v2` on first run) |
| `ALERT_THRESHOLD` | `0.15` | no | A complaint theme above this share of reviews raises an alert |
| `ALERT_WINDOW_DAYS` | `14` | no | Window used by the alert rule engine |
| `CORS_ORIGINS` | `http://localhost:5173` | no | Comma-separated allow-list. Unused in production (same origin) |
| `TESTING` | `false` | no | Set by the test suite; disables connection pooling |

### Frontend — `frontend/.env.local`

| Variable | Default | Meaning |
|---|---|---|
| `VITE_USE_MOCKS` | `true` | `false` switches every API call to the real backend |
| `VITE_API_BASE_URL` | `http://localhost:8000/api` | API root. The production image builds with `/api` (relative), so no hostname is baked into the bundle |

### Environment-specific settings at a glance

| | Local development | Production (Cloud Run) |
|---|---|---|
| Database | Docker Postgres on `localhost:5432` | Cloud SQL over the IAM-authenticated connector socket |
| Secrets | plain `.env` file, git-ignored | Secret Manager, injected as env vars |
| Frontend | Vite dev server on `:5173`, CORS allow-listed | Built bundle served by the same container, no CORS |
| API base URL | `http://localhost:8000/api` | `/api` (relative) |
| LLM provider | `mock` (no key, deterministic) | `anthropic` on the current revision — see the note in [§5](05-architecture.md) |
| Migrations | `alembic upgrade head` on your machine | a one-off Cloud Run **Job**, never at container start |

---

## 2.7 Secrets management

**Rules this project follows:**

1. No secret is ever committed. `.env`, `.env.local`, `docs/api-key` and the Firebase cache are all in `.gitignore`; `.env.example` contains only non-secret defaults.
2. Locally, secrets live in the git-ignored `.env`.
3. In the cloud, secrets live in **Secret Manager** and are injected as environment variables at instance start. They are not baked into the image and are not visible in the deploy command.
4. The Cloud Run service runs as a **dedicated service account** holding exactly two roles: `roles/cloudsql.client` and `roles/secretmanager.secretAccessor`.

Creating or rotating a secret:

```bash
# create
openssl rand -hex 32 | tr -d '\n' | gcloud secrets create jwt-secret --data-file=-

# rotate (adds a new version; the service picks it up on the next revision)
openssl rand -hex 32 | tr -d '\n' | gcloud secrets versions add jwt-secret --data-file=-
gcloud run services update sellersense --region us-central1 \
  --set-secrets JWT_SECRET=jwt-secret:latest
```

> Rotating `JWT_SECRET` invalidates every issued token, so all users must sign in again. That is the intended behaviour after a suspected leak.

---

## 2.8 Build and deployment

### 2.8.1 Build the production image locally

The production image is a **two-stage Docker build**: Node 22 compiles the React app with `VITE_API_BASE_URL=/api`, then the Python 3.12 image serves both the API (under `/api`) and the built SPA from one origin.

```bash
# from the repository root
docker build -t sellersense:local .
docker run --rm -p 8080:8080 \
  -e DATABASE_URL='postgresql+asyncpg://sellersense:sellersense@host.docker.internal:5432/sellersense' \
  -e JWT_SECRET='local-test-secret' \
  sellersense:local
```

**Validation:**

```bash
curl http://localhost:8080/api/health     # {"status":"ok","database":"up","version":"0.1.0"}
open http://localhost:8080                # the SPA loads and talks to /api on the same origin
```

### 2.8.2 First-time cloud deployment

Full, reproducible commands (project creation, Cloud SQL, IAM, secrets, deploy, migration jobs, budget alert, Firebase Hosting) are in **[deployment.md](deployment.md#deploy-steps-reproducible-end-to-end)**. The short version:

```bash
# 0. project + APIs
gcloud config set project sellersense-yinan920
gcloud services enable run.googleapis.com sqladmin.googleapis.com \
  artifactregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com

# 1. database (~10 min to provision)
gcloud sql instances create sellersense-db --database-version=POSTGRES_16 \
  --edition=enterprise --tier=db-f1-micro --region=us-central1 \
  --storage-type=HDD --storage-size=10 --root-password="<random>"
gcloud sql databases create sellersense --instance=sellersense-db

# 2. runtime service account with exactly two roles (see deployment.md)
# 3. secrets in Secret Manager: database-url, jwt-secret

# 4. build + deploy from source
gcloud run deploy sellersense --source . --region us-central1 --allow-unauthenticated \
  --service-account sellersense-run@sellersense-yinan920.iam.gserviceaccount.com \
  --add-cloudsql-instances sellersense-yinan920:us-central1:sellersense-db \
  --set-secrets DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest \
  --set-env-vars LLM_PROVIDER=mock,EMBEDDINGS_PROVIDER=mock \
  --memory 1Gi --no-cpu-throttling --min-instances 0 --max-instances 2

# 5. migrate + seed as one-off Jobs (same image, different command)
gcloud run jobs execute sellersense-migrate --region us-central1 --wait
gcloud run jobs execute sellersense-seed    --region us-central1 --wait

# 6. public short URL
firebase deploy --only hosting
```

> **Why migrations run as a Job and not at container start:** Cloud Run starts instances concurrently, and several containers racing `alembic upgrade head` against one database is a lock problem waiting to happen. The Job runs the same image with the command swapped, exactly once.

### 2.8.3 Redeploy after a code change

```bash
gcloud run deploy sellersense --source . --region us-central1
```

Cloud Build rebuilds the image, Cloud Run creates a new revision and shifts traffic to it. If the schema changed, run the migrate Job **before** shifting traffic.

### 2.8.4 Rollback

```bash
gcloud run revisions list --service sellersense --region us-central1
gcloud run services update-traffic sellersense --region us-central1 \
  --to-revisions <previous-revision>=100
```

Takes seconds, needs no rebuild. Every deploy is a versioned image in Artifact Registry, which is what makes this possible.

### 2.8.5 Switching AI providers (configuration, not code)

The `anthropic` SDK ships inside the production image, so switching is one command with no rebuild:

```bash
echo -n "<key>" | gcloud secrets create anthropic-api-key --data-file=-
gcloud run services update sellersense --region us-central1 \
  --set-secrets ANTHROPIC_API_KEY=anthropic-api-key:latest,DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest \
  --set-env-vars LLM_PROVIDER=anthropic,EMBEDDINGS_PROVIDER=mock
```

Reverting to the free, deterministic path is the same command with `LLM_PROVIDER=mock`.

---

## 2.9 Full-stack validation checklist

Run this after any setup, from a cold start. If all nine pass, the environment is correct.

| # | Check | Command | Expected result |
|---|---|---|---|
| 1 | Database container healthy | `docker compose ps` | `sellersense-db … Up (healthy)` |
| 2 | pgvector present | `docker exec sellersense-db psql -U sellersense -d sellersense -c "\dx"` | list contains `vector` |
| 3 | Schema migrated | `cd backend && alembic current` | `0001 (head)` |
| 4 | API + DB alive | `curl localhost:8000/api/health` | `{"status":"ok","database":"up","version":"0.1.0"}` |
| 5 | Backend suite | `cd backend && pytest` | `44 passed` |
| 6 | API smoke | `cd backend && bash scripts/smoke.sh` | `SMOKE TEST PASSED` |
| 7 | Frontend suite | `cd frontend && npm test` | `20 passed (8 files)` |
| 8 | Frontend builds | `cd frontend && npm run build` | `dist/` written, no type errors |
| 9 | Browser E2E | `cd frontend && node e2e/acceptance.mjs` | `E2E ACCEPTANCE PASSED` |

For a **deployed** environment, the equivalent one-command check is:

```bash
cd backend && bash scripts/smoke_cloud.sh
# expected: POST-DEPLOYMENT SMOKE PASSED — 10/10 checks
```

See [§1.5](01-production-support.md#15-post-deployment-smoke-tests-system-validation) for what those ten checks cover.

---

## 2.10 Troubleshooting the setup

| Symptom | Most likely cause | Fix |
|---|---|---|
| `/api/health` says `"database":"down"` | Postgres not running, or `DATABASE_URL` wrong | `docker compose up -d`; confirm the URL scheme is `postgresql+asyncpg://` |
| `pytest` errors on connection | `sellersense_test` database missing | create it — [2.3](#create-the-test-database-needed-to-run-the-backend-test-suite) |
| `alembic upgrade head` fails on `CREATE EXTENSION vector` | Server lacks pgvector, or the user is not a superuser | Use the `pgvector/pgvector:pg16` image, or `brew install pgvector`; on managed Postgres create the extension once as an admin |
| `ModuleNotFoundError: anthropic` | `LLM_PROVIDER=anthropic` without the optional extra | `pip install -e ".[anthropic]"`, or set `LLM_PROVIDER=mock` |
| Frontend shows data with the backend stopped | Still in mock mode | Set `VITE_USE_MOCKS=false` in `frontend/.env.local` and restart Vite |
| Browser console: CORS error | Frontend served from an origin not in `CORS_ORIGINS` | Add the origin to `CORS_ORIGINS` in `.env` and restart uvicorn |
| Refreshing `/app/upload` gives 404 locally | Expected when the API is served alone; the SPA fallback only exists in the production image | Use the Vite dev server locally, or test deep links against the built image |
| `npm ci` fails inside Docker but `npm install` works locally | `package-lock.json` was written by a newer npm than the image's | Regenerate the lockfile with the image's npm — see [§3, issue 1](03-issue-log.md#issue-1--npm-ci-fails-inside-the-docker-build-though-npm-install-works-locally) |

More failure modes, including production-only ones, are in [§1.4 Incident playbooks](01-production-support.md#14-common-incidents--recovery-steps).

---

*Next:* [§3 Issue Diagnosis, Research & Resolution](03-issue-log.md) · *Back to* [Documentation index](README.md)
