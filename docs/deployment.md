# SellerSense — Cloud Deployment (GCP)

**Live URL:** https://sellersense-ai.web.app
(the Cloud Run origin stays reachable at https://sellersense-yuuwat5zca-uc.a.run.app)
**Demo login:** `demo@novabrew.co` / `demo1234!` (premium tier) — or register a fresh free-tier account.

## Architecture

```
Browser ── HTTPS (automatic TLS, sellersense-ai.web.app)
   │
   ▼
Firebase Hosting  site "sellersense-ai"
   global CDN edge; rewrites ** → the Cloud Run service below
   │
   ▼
Cloud Run  service "sellersense"  (region us-central1)
   one container = FastAPI backend + built React SPA (same origin)
   scale-to-zero, max 2 instances, 1 GiB RAM, --no-cpu-throttling
   │
   │ Cloud SQL connector (IAM-authenticated unix socket /cloudsql/…)
   ▼
Cloud SQL  PostgreSQL 16 + pgvector  (db-f1-micro, 10 GB HDD)

Secret Manager   database-url, jwt-secret   → injected as env vars
Artifact Registry + Cloud Build             → image build/versioning (deploy --source)
Cloud Run Jobs   sellersense-migrate, sellersense-seed → one-off DB tasks
IAM              dedicated runtime SA, least privilege
Billing budget   $25 with 50%/90% alerts
```

Why this shape: automatic HTTPS, per-request autoscaling with scale-to-zero, a managed
database with backups, secrets outside the codebase, versioned images with one-command
rollback (`gcloud run services update-traffic`). Each piece is the standard GCP answer for
its job — nothing exotic to maintain.

## The single-container decision

The production image (see [Dockerfile](../Dockerfile)) is a two-stage build: Node 22
compiles the React app with `VITE_API_BASE_URL=/api`, then the Python image serves both the
API (under `/api`) and the static SPA from the same origin. Payoffs:

- the frontend calls a **relative** `/api` — no hostname baked into the bundle, the same
  image runs anywhere;
- **CORS disappears entirely** (same origin);
- one service to deploy, log, and pay for.

The SPA fallback is registered **after** the API router: any non-`/api` GET returns
`index.html`, so refreshing a deep link like `/app/upload` works (the E2E suite asserts
this by reloading `/login`).

## Deploy steps (reproducible end-to-end)

```bash
# 0. one-time: auth + project
gcloud auth login
gcloud projects create sellersense-yinan920 --name="SellerSense Capstone"
gcloud billing projects link sellersense-yinan920 --billing-account=<ACCOUNT_ID>
gcloud config set project sellersense-yinan920
gcloud services enable run.googleapis.com sqladmin.googleapis.com \
  artifactregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com

# 1. database (≈10 min)
gcloud sql instances create sellersense-db \
  --database-version=POSTGRES_16 --edition=enterprise --tier=db-f1-micro \
  --region=us-central1 --storage-type=HDD --storage-size=10 \
  --root-password="<random>"
gcloud sql databases create sellersense --instance=sellersense-db

# 2. least-privilege runtime service account
gcloud iam service-accounts create sellersense-run
gcloud projects add-iam-policy-binding sellersense-yinan920 \
  --member="serviceAccount:sellersense-run@…" --role="roles/cloudsql.client"
gcloud projects add-iam-policy-binding sellersense-yinan920 \
  --member="serviceAccount:sellersense-run@…" --role="roles/secretmanager.secretAccessor"

# 3. secrets (DATABASE_URL uses the connector's unix socket, not an IP)
echo -n "postgresql+asyncpg://postgres:<pass>@/sellersense?host=/cloudsql/sellersense-yinan920:us-central1:sellersense-db" \
  | gcloud secrets create database-url --data-file=-
openssl rand -hex 32 | tr -d '\n' | gcloud secrets create jwt-secret --data-file=-

# 4. deploy (Cloud Build builds the Dockerfile from source)
gcloud run deploy sellersense --source . --region us-central1 \
  --allow-unauthenticated \
  --service-account sellersense-run@sellersense-yinan920.iam.gserviceaccount.com \
  --add-cloudsql-instances sellersense-yinan920:us-central1:sellersense-db \
  --set-secrets DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest \
  --set-env-vars LLM_PROVIDER=mock,EMBEDDINGS_PROVIDER=mock \
  --memory 1Gi --no-cpu-throttling --min-instances 0 --max-instances 2

# 5. migrate + seed as one-off Jobs (same image, different command)
gcloud run jobs create sellersense-migrate --image=<deployed image> … \
  --command=alembic --args=upgrade,head
gcloud run jobs execute sellersense-migrate --region us-central1 --wait
gcloud run jobs create sellersense-seed … --command=python --args=-m,scripts.seed
gcloud run jobs execute sellersense-seed --region us-central1 --wait

# 6. budget guard
gcloud billing budgets create --billing-account=<ACCOUNT_ID> \
  --display-name="SellerSense capstone budget" --budget-amount=25USD \
  --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 \
  --filter-projects=projects/sellersense-yinan920

# 7. short public URL: Firebase Hosting in front of Cloud Run (config in firebase.json)
firebase projects:addfirebase sellersense-yinan920   # Firebase onto the *existing* project
# then upgrade to the Blaze plan in the console — Cloud Run rewrites require it
firebase hosting:sites:create sellersense-ai
firebase deploy --only hosting
```

Verification: Playwright E2E ran against the live URL — **8/8 passed** (register → upload
50-row CSV → pipeline done → dashboard renders real data → free-tier 402 gate → premium
login → competitors + alerts), screenshots in `frontend/e2e/shots-cloud/`.

## Decisions & pitfalls (the honest section)

**1. Migrations run as a Cloud Run Job, never at container startup.** Cloud Run starts
instances concurrently; several containers racing `alembic upgrade head` against one
database is a lock mess waiting to happen. The Job runs the same image with the command
swapped — one execution, then the service scales freely.

**2. A dedicated service account, because the failure mode is nasty.** The default compute
SA lacks `roles/cloudsql.client` and `roles/secretmanager.secretAccessor`; a deploy with it
*succeeds*, then the container dies with nothing but a connection timeout in the logs. A
purpose-built SA with exactly two roles is both the fix and the least-privilege posture.

**3. pgvector needed no manual step — but that was verified, not assumed.** Cloud SQL's
default user carries `cloudsqlsuperuser`, which may create allow-listed extensions, and
`vector` is on the list. Our first migration begins with `CREATE EXTENSION IF NOT EXISTS
vector` and it executed cleanly inside the migration Job. If your provider is stricter, the
fallback is one `CREATE EXTENSION` via the Cloud SQL Auth Proxy before migrating.

**4. `--no-cpu-throttling` is load-bearing, and it has a known failure boundary.** The
upload endpoint returns `201` immediately and runs the AI pipeline as a FastAPI
`BackgroundTask` — *after* the response. Under Cloud Run's default request-based billing,
CPU is throttled to near zero between requests, so the pipeline would stall. Instance-based
billing (`--no-cpu-throttling`) keeps CPU allocated while the instance lives.

Two caveats worth stating plainly:

- *Billing:* instance-based billing does **not** get the request-based free tier. The
  realistic cost model is ~15 minutes of instance lifetime per demo session (the idle
  timeout after the last request), which is still negligible at demo traffic.
- *The SIGTERM boundary:* the flag guarantees CPU while the instance is alive — it does not
  guarantee the instance stays alive. On scale-down Cloud Run sends SIGTERM with a ~10 s
  grace period; a pipeline mid-flight would be killed silently while the client already
  holds its `201`. Mitigations: job state is persisted (a stuck `running` job is detectable
  and the upload retryable), and the pipeline sits behind a `JobRunner` abstraction whose
  production upgrade path is Cloud Tasks or a Cloud Run Job per analysis. That is the
  honest limit of "BackgroundTasks in a serverless container" — fine for this scale,
  designed to be replaced beyond it.

**5. Mock AI providers in the cloud are an explicit engineering decision — and the real
path is verified, not theoretical.** Every AI capability sits behind an adapter interface.
The deployed configuration selects the deterministic mocks: $0 API fees, reproducible
output, no secrets needed for a public demo URL. Switching is configuration, not code:

```bash
echo -n "<key>" | gcloud secrets create anthropic-api-key --data-file=-
gcloud run services update sellersense --region us-central1 \
  --set-secrets ANTHROPIC_API_KEY=anthropic-api-key:latest,DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest \
  --set-env-vars LLM_PROVIDER=anthropic,EMBEDDINGS_PROVIDER=mock
```

This was executed against the live service (revision `sellersense-00002`): the real
pipeline analyzed 50 reviews in ~30 s and produced sharper themes than the mocks — notably
catching a complaint cluster the keyword heuristic mislabeled. See the comparison table and
screenshot in the [README](../README.md#verified-with-real-claude). The service was then
reverted to mocks (revision `sellersense-00003`) so the public demo stays free and
deterministic; the key remains in Secret Manager, unreferenced by the running revision.

*Prerequisite that bit once:* `anthropic` is an **optional** dependency in
`pyproject.toml`, so `pip install .` left it out of the image and the first switch attempt
would have failed at import. The Dockerfile now installs `.[anthropic]`, which is what
makes "configuration, not code" literally true. `sentence-transformers` is deliberately
still excluded — it would add ~2 GB for an embedding provider the cloud deployment doesn't
use.

**6. `npm ci` broke in the image although it worked locally.** The lockfile had been
touched by a newer npm (v11) than the image's (v10), and `npm ci` refuses lockfiles it
considers out of sync. Fix: regenerate the lock **with the image's own npm** —
`docker run node:22-slim npm install --package-lock-only` — rather than downgrading to
`npm install` in the Dockerfile and losing reproducible builds.

**7. Small facts that saved debugging time.** `/api/health` checks DB connectivity and
distinguishes "app up, DB down" from "app down" — it was the first thing checked after
deploy. Cloud Run's `/tmp` is an in-memory tmpfs counted against the 1 GiB limit — this app
processes uploads entirely in memory and writes nothing, so it doesn't matter here, but a
file-writing app should know. Cold starts are a few seconds; the E2E suite gives the first
navigation 45 s.

**8. The short URL cost nothing architecturally — but had two hard constraints.** The
`*.run.app` hostname embeds the project *number*, so it cannot be shortened; only a domain
in front of it can. Firebase Hosting's free `*.web.app` subdomain solved it, subject to two
rules worth knowing before starting: a Hosting site can only rewrite to a Cloud Run service
in the **same project** (so Firebase had to be added to the existing `sellersense-yinan920`
via `projects:addfirebase`, not to a separate Firebase project), and site IDs are **globally
unique** — `sellersense` was already taken, hence `sellersense-ai`. Because the rewrite is
`**` → Cloud Run, the single-container design is untouched: no build flag, no CORS, no code
change. The Cloud Run URL keeps working as the origin.

## Operating it

| Task | Command |
|---|---|
| Tail logs | `gcloud run services logs read sellersense --region us-central1` |
| Redeploy after code change | `gcloud run deploy sellersense --source . --region us-central1` |
| Re-run migration / seed | `gcloud run jobs execute sellersense-migrate\|seed --region us-central1 --wait` |
| **Stop the DB when idle** (main cost) | `gcloud sql instances patch sellersense-db --activation-policy NEVER` |
| Start the DB before a demo | `gcloud sql instances patch sellersense-db --activation-policy ALWAYS` (≈1–2 min) |
| Tear everything down | `gcloud projects delete sellersense-yinan920` |

Cost at demo usage: Cloud SQL ≈ $9–11/month while running (≈$1/month storage-only when
stopped); Cloud Run ≈ cents (billed per instance-lifetime, see pitfall 4); build/registry ≈
cents. Budget alert fires at $12.50 and $22.50.
