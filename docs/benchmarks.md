# Pipeline benchmarks

Every timing figure quoted in the README, the deck, or the defense notes should be
traceable to this file. Measured 2026-08-16. Both measurements are reproducible with
the scripts in `backend/scripts/`; neither needs a load-testing tool.

Two things this file deliberately does **not** do: it does not measure throughput under
concurrent users (no load generator, single request at a time), and it does not claim
statistical rigour beyond a 3-run range. These are single-user latency numbers.

---

## Method

Both benchmarks run the **unmodified production pipeline**. No repo code was edited to
take these measurements.

Stage boundaries come from the pipeline's own progress checkpoints. `_run()` in
`app/services/pipeline.py` commits `progress` after each step, and those values map to
stages one-for-one — so the split below is the code's, not something imposed on it:

| progress | reached after |
|---|---|
| 5 | job marked running |
| 30 | stage 1 sentiment (LLM) |
| 50 | stage 2 embeddings (local) |
| 65 | stage 3 KMeans (local) |
| 80 | stage 4 cluster labels (LLM) |
| 90 | stage 5 keyword n-grams (local) |
| 95 | stage 6 alert rules (local) |
| 100 | final commit |

- **Local** (`scripts/bench_local.py`) wraps `pipeline._progress` to timestamp each
  checkpoint, and wraps the LLM adapter's `score()` / `label_cluster()` / `_score_chunk()`
  to separate "waiting on Anthropic" from local compute. It runs against an isolated
  `sellersense_bench` database migrated with the real Alembic migration, so dev and demo
  data are never touched.
- **Deployed** (`scripts/bench_deployed.py`) is a plain HTTP client against the live
  service. It registers a throwaway account (the trick the E2E suite already uses),
  uploads, polls `GET /api/jobs/{id}` every 100 ms to sample the same progress
  checkpoints, then deletes its own dataset. It changes no service configuration.
  Exact server-side times were then read from `analysis_jobs.started_at/finished_at`
  via `scripts/db-cloud.sh`.

---

## 1. Local, 200 reviews, real Claude

**Environment.** macOS 24.3.0 (Apple silicon), Python 3.13 venv, Postgres 16 + pgvector
in Docker (`sellersense-db`, localhost), `LLM_PROVIDER=anthropic` (Haiku 4.5 for
sentiment, Sonnet 5 for labels), `EMBEDDINGS_PROVIDER=mock`, home broadband.

**Payload.** `backend/data/sample_reviews_200.csv` — the 150-row TikTok sample plus the
50-row Amazon sample, 200 unique review texts, zero duplicates across the two files.
Built this way because the repo had no 200-row sample and 200 is the premium tier cap.

```
backend/.venv/bin/python scripts/bench_local.py data/sample_reviews_200.csv "200 reviews"
```

3 consecutive runs:

| | run 1 | run 2 | run 3 |
|---|---|---|---|
| 1. Sentiment — **LLM**, 8 chunks × 25, concurrency 4 | 6.71 s | 5.13 s | 4.72 s |
| 2. Embeddings — local | 0.05 s | 0.06 s | 0.06 s |
| 3. KMeans — local | 0.11 s | 0.12 s | 0.12 s |
| 4. Cluster labels — **LLM**, 8 calls, **sequential** | 26.78 s | 24.50 s | 26.34 s |
| 5. Keyword n-grams — local | 0.02 s | 0.02 s | 0.02 s |
| 6. Alert rules — local | 0.03 s | 0.04 s | 0.03 s |
| final commit | 0.02 s | 0.02 s | 0.02 s |
| **total pipeline** | **33.74 s** | **29.90 s** | **31.32 s** |

- `200/200` reviews scored on every run — the chunking fix holds at the cap.
- All local compute plus every DB round trip totals **0.36–0.39 s, about 1%** of the run.
  Stages 2, 3, 5 and 6 are effectively free; **99% of the time is waiting on the API.**
- Chunk detail: 8 requests of 25 reviews, each **1.98–4.22 s**. Sum if they ran serially
  would be **17.74–25.55 s**; actual wall time for the stage was **4.72–6.71 s**. That is
  the concurrency win, measured: **≈3.7×**, consistent with `SENTIMENT_CONCURRENCY = 4`.
- `_pick_k(200)` returns **k=8**, so stage 4 makes 8 Sonnet calls in a `for` loop with no
  concurrency. It is **~80% of total runtime** and is the obvious next optimization —
  the same `asyncio.gather` + semaphore already proven in stage 1 would apply directly.

### What this settles about the "~6 s" claim

The `~6s` in commit `371f28e` (and `6.2 秒` in `capstone-defense-master.md:270`) is
**stage 1 only** — sentiment scoring. Measured at 4.72–6.71 s, so the claim is accurate
for what it describes. It is **not** an end-to-end number: the full 200-review pipeline
is **~30–34 s**. Quote it as "the chunked sentiment stage", never as "200 reviews analyzed".

---

## 2. Deployed, 50 reviews, real Claude

**Environment.** Cloud Run `sellersense`, revision `sellersense-00012-h2w`, us-central1,
1 vCPU / 1 GiB, `--no-cpu-throttling`, `--min-instances 0` / max 2, container concurrency
80, request timeout 600 s. Cloud SQL Postgres 16 + pgvector over the Cloud SQL connector.
Service env: `LLM_PROVIDER=anthropic`, `EMBEDDINGS_PROVIDER=mock`.

**Payload.** `backend/data/sample_reviews.csv` — 50 rows, exactly the free-tier cap.

```
backend/.venv/bin/python scripts/bench_deployed.py data/sample_reviews.csv
```

| | cold (first request after idle) | warm run 1 | warm run 2 | warm run 3 |
|---|---|---|---|---|
| `GET /api/health` | **9.13 s** | 0.09 s | 0.11 s | 0.08 s |
| `POST /datasets/upload` → 201 | **9.94 s** | 0.13 s | 0.10 s | 0.10 s |
| analysis (201 → job done) | **29.11 s** | 19.04 s | 19.87 s | 20.82 s |
| server-side `finished_at − started_at` | — | 18.86 s | 19.73 s | 20.68 s |
| **end-to-end** | **39.06 s** | 19.17 s | 19.96 s | 20.92 s |

Historical jobs already in the production database, for cross-reference:

| date | reviews | pipeline | `started_at − created_at` |
|---|---|---|---|
| 2026-08-10 03:43 | 150 | 32.70 s | 0.10 s |
| 2026-08-10 04:11 | 50 | 21.41 s | 0.07 s |
| 2026-08-10 21:29 | 30 | 20.83 s | **10.21 s** |

### Cold start, and the lazy import behind it

Cold start is **~9 s**, not "a few seconds" as `deployment.md` currently says.

There is a **second, separate ~10 s cost** that is not container start: the first
`POST /upload` after a cold start took 9.94 s even though `/api/health` had already
warmed the container. `BackgroundTasksRunner.enqueue` imports `app.workers.tasks`
*inside the method* (`app/workers/runner.py:19`), which transitively imports numpy and
scikit-learn — several seconds, paid inside the request path, once per container.
The historical row above shows the same thing from the other side: a **10.21 s** gap
between the job row being created and the pipeline starting.

Whether cold start counts toward "30 seconds" depends entirely on which boundary you
measure, and the two answers are far apart:

- **warm, analysis only** — 19–21 s
- **cold, end-to-end** — ~39 s (9 s container + 10 s import + 29 s analysis)

The upload request itself does no LLM work (parse + insert only); warm it is ~0.1 s.

### What this settles about the "~30 s" claim

The README's "50 reviews in ~30 seconds" **does not match any warm 50-review run** —
warm is consistently 19–21 s, and the one historical 50-review job in the database is
21.41 s. The number is defensible only as a **cold end-to-end** figure, where my own
measurement gives 29.11 s of analysis after a cold start. Note also that the only
~32 s job in the production database is the **150-review** TikTok dataset, not a
50-review one.

Safest phrasing: **"about 20 seconds warm, about 30 with a cold start."**

---

## Corrections this exercise turned up

1. **The deployed service is currently running real Claude, not mocks.** Revision
   `sellersense-00012-h2w` has `LLM_PROVIDER=anthropic` with the key wired from Secret
   Manager. `README.md` and `deployment.md` both still say the deployed configuration
   selects the deterministic mocks and was reverted at revision `00003`. That was true
   then; it is stale now, and it means the public demo URL is spending API credits.
2. **`deployment.md`: "Cold starts are a few seconds"** — measured 9.13 s, plus a further
   ~10 s of lazy sklearn/numpy import on the first upload.
3. **`~6s` is stage 1, not the pipeline.** Full 200-review pipeline is ~30–34 s.
4. **`~30 s` for 50 reviews is a cold-start number.** Warm is 19–21 s.
5. **Stage 4 is the real bottleneck** — 8 sequential Sonnet calls, ~80% of a 200-review
   run — and the fix is the concurrency pattern stage 1 already uses.

## Cascade verification (bonus)

Deleting one bench dataset with a single `DELETE FROM datasets` on the production
database removed **68 child rows** with no application-side cascade logic:
`reviews` 50, `theme_clusters` 5, `keyword_stats` 9, `feedback_alerts` 3,
`analysis_jobs` 1 — all to zero, zero orphans left behind. `reply_drafts` also cascades
(via `reviews.id`) but the free-tier bench account could not create one to exercise it.
All bench users and datasets were removed afterwards; the 3 demo datasets are untouched.
