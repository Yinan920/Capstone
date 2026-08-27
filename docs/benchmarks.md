# Pipeline benchmarks

Every timing figure quoted in the README, the deck, or the defense notes should be
traceable to this file. Baselines measured 2026-08-16; re-measured after the stage 4
concurrency fix on 2026-08-27. Both measurements are reproducible with
the scripts in `backend/scripts/`; neither needs a load-testing tool.

Two things this file deliberately does **not** do: it does not measure throughput under
concurrent users (no load generator, single request at a time), and it does not claim
statistical rigour beyond a 3-run range. These are single-user latency numbers.

---

## Method

Both benchmarks run the **unmodified production pipeline** — no application code is
edited to take a measurement. The benchmark scripts themselves are instrumentation and
do change: when stage 4 became concurrent, `bench_local.py` had to stop reporting
*summed* LLM call durations, because overlapping calls double-count (far enough that
"local compute = total − LLM" could go negative). It now takes each stage's wall time
from the pipeline's own progress checkpoints and reports summed call time separately, as
the explicit "sum-if-serial vs actual" comparison. Stage 1 was always reported this way;
stage 4 now matches it.

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
| 85 | stage 4b dataset takeaway (LLM) |
| 90 | stage 5 keyword n-grams (local) |
| 95 | stage 6 alert rules (local) |
| 100 | final commit |

- **Local** (`scripts/bench_local.py`) wraps `pipeline._progress` to timestamp each
  checkpoint, and wraps the LLM adapter's `score()` / `label_cluster()` / `_score_chunk()`
  to record every individual call duration — which separates "waiting on Anthropic" from
  local compute, and makes the concurrency of a stage measurable. It runs against an isolated
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

### Baseline — sequential stage 4 (measured 2026-08-16)

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

### After — concurrent stage 4 (measured 2026-08-27)

That optimization was then made: `THEME_LABEL_CONCURRENCY = 4` in `pipeline.py`, the same
bounded-semaphore pattern stage 1 uses. The stage now computes every cluster's local
statistics first, labels the clusters through `asyncio.gather`, and writes the rows
sequentially afterwards — the `AsyncSession` is still only ever touched from one task,
which is why the DB writes were not folded into the gather.

Same machine, same payload, same command, 3 consecutive runs:

| | run 1 | run 2 | run 3 | vs baseline |
|---|---|---|---|---|
| 1. Sentiment — **LLM**, 8 chunks × 25, concurrency 4 | 5.27 s | 5.10 s | 4.61 s | — |
| 2. Embeddings — local | 0.06 s | 0.05 s | 0.06 s | — |
| 3. KMeans — local | 0.13 s | 0.11 s | 0.12 s | — |
| 4. Cluster labels — **LLM**, 8 calls, **concurrency 4** | 8.30 s | 9.15 s | 9.82 s | **−65%** |
| 5. Keyword n-grams — local | 0.04 s | 0.05 s | 0.03 s | — |
| 6. Alert rules — local | 0.02 s | 0.02 s | 0.03 s | — |
| final commit | 0.01 s | 0.02 s | 0.02 s | — |
| **total pipeline** | **13.84 s** | **14.52 s** | **14.70 s** | **−55%** |

- **Mean 31.65 s → 14.35 s, a 55% reduction** (2.2× end-to-end). Stage 4 alone: mean
  25.87 s → 9.09 s, **2.8×**.
- Measured in-stage concurrency, by the same sum-if-serial method used for stage 1:
  **3.2–3.6×** (sum-if-serial 29.50–31.69 s vs 8.30–9.82 s actual). Below the nominal 4
  because k=8 at concurrency 4 is two waves, and each wave costs its *slowest* call.
- **Output is unchanged**: 200/200 reviews scored, 8 theme clusters, 9 keyword rows on
  every run — identical to the baseline. This was a scheduling change, not a
  behavioural one.
- Local compute plus every DB round trip is now **0.26–0.27 s, about 2%** of the run.
  **98% is still waiting on the API** — the remaining ceiling is provider latency, not
  our code.
- Guarded by `tests/test_pipeline.py::test_cluster_labeling_runs_concurrently`, which
  asserts the requests overlap *and* stay within the semaphore bound. A regression back
  to the sequential loop fails the suite rather than silently costing 17 s.
- Raising the limit from 4 to 8 would make it a single wave and save perhaps 3–4 s more,
  at the cost of a burstier rate-limit profile. Measured next.

### Then — both stages at concurrency 8 (measured 2026-08-27)

Both ceilings moved to `settings.sentiment_concurrency` / `settings.theme_label_concurrency`
(default 8) so a deployment that hits rate limits can be dialled back without a rebuild.
At 8, each stage's 8 requests form a **single wave**.

| | run 1 | run 2 | run 3 | vs concurrency 4 |
|---|---|---|---|---|
| 1. Sentiment — 8 chunks × 25 | 2.54 s | 2.55 s | 2.45 s | **−48%** |
| 4. Cluster labels — 8 calls | 5.67 s | 5.35 s | 4.89 s | **−42%** |
| 4b. Dataset takeaway — 1 call | 1.46 s | 1.57 s | 1.30 s | — |
| local compute + DB | 0.24 s | 0.25 s | 0.23 s | — |
| **total pipeline** | **9.91 s** | **9.72 s** | **8.87 s** | **−34%** |

- **Mean 14.35 s → 9.50 s.** Against the original sequential pipeline that is
  **31.65 s → 9.50 s, a 70% reduction (3.3×)**.
- In-stage concurrency rose from 3.9× to **7.3–7.5×** (sentiment) and 3.6× to
  **5.1–5.4×** (cluster labels).
- **Sentiment scales nearly linearly; cluster labels do not — and the reason is
  the useful part.** Once concurrency ≥ the number of requests, a stage costs
  exactly its *slowest single call*. Sentiment chunks are uniform (2.07–2.53 s),
  so 8× concurrency ≈ 7.4× speedup. Cluster-labeling calls vary widely
  (2.37–5.59 s) because clusters differ in size, so the stage is pinned to the
  longest one and no amount of extra concurrency helps.
- **Every stage is now at its concurrency floor.** 2.51 + 5.30 + 1.44 + 0.24 =
  9.50 s, and each LLM term equals its slowest call. Going lower means reducing
  per-call latency — a cheaper model for cluster labels (a quality trade, not
  taken), shorter prompts — or removing work from the critical path, not more
  parallelism.
- **No rate limiting observed**: three consecutive runs within 1.0 s of each
  other, no slow outliers. Worth stating precisely — the SDK retries 429s twice
  with backoff, so exceeding the limit would surface as an anomalously *slow*
  run, not an error. This is also a single-user benchmark: N concurrent uploads
  put 8N requests in flight, which is why the ceiling is configuration.
- 200/200 reviews scored on every run; output unchanged.

### What this settles about the "~6 s" claim

The `~6s` in commit `371f28e` (and `6.2 秒` in `capstone-defense-master.md:270`) is
**stage 1 only** — sentiment scoring. Measured at 4.72–6.71 s, so the claim is accurate
for what it describes. It is **not** an end-to-end number. Quote it as "the chunked
sentiment stage", never as "200 reviews analyzed".

The end-to-end 200-review figure is **~9.5 s** at the current concurrency settings
(**~14 s** at concurrency 4, **~30–34 s** sequential). Any document quoting 30 s for 200
reviews is describing the pre-2026-08-27 pipeline.

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

### Baseline — revision `sellersense-00012-h2w` (measured 2026-08-16)

| | cold (first request after idle) | warm run 1 | warm run 2 | warm run 3 |
|---|---|---|---|---|
| `GET /api/health` | **9.13 s** | 0.09 s | 0.11 s | 0.08 s |
| `POST /datasets/upload` → 201 | **9.94 s** | 0.13 s | 0.10 s | 0.10 s |
| analysis (201 → job done) | **29.11 s** | 19.04 s | 19.87 s | 20.82 s |
| server-side `finished_at − started_at` | — | 18.86 s | 19.73 s | 20.68 s |
| **end-to-end** | **39.06 s** | 19.17 s | 19.96 s | 20.92 s |

### After — revision `sellersense-00013-bxg` (measured 2026-08-27)

Same payload, same command, same service configuration; the only difference is the image.

| | warm run 1 | warm run 2 | warm run 3 | vs baseline |
|---|---|---|---|---|
| `POST /datasets/upload` → 201 | 0.12 s | 0.21 s | 0.12 s | — |
| analysis (201 → job done) | 9.57 s | 10.38 s | 9.13 s | **−51%** |
| **end-to-end** | **9.70 s** | **10.59 s** | **9.25 s** | **−51%** |

- Warm analysis mean **19.91 s → 9.69 s**. The local 200-review result reproduces on the
  deployed service at the free-tier size, which is the point of measuring both.

### Then — concurrency 8, revision `sellersense-00016-tgs` (measured 2026-08-27)

| | warm run 1 | warm run 2 | warm run 3 | vs baseline |
|---|---|---|---|---|
| analysis (201 → job done) | 8.46 s | 7.74 s | 7.54 s | **−60%** |
| **end-to-end** | **8.55 s** | **7.84 s** | **7.64 s** | **−60%** |

Warm analysis mean **19.91 s → 7.91 s**. Deployed and local move together across both
concurrency changes, which is the useful check: the win is in the pipeline, not in a
faster laptop.
- **Cold start was not re-measured.** Scale-to-zero needs ~15 minutes of idle, and the
  container was warm from the post-deploy smoke run. The 9.13 s container start above
  should be treated as still current; the separate ~10 s first-upload import cost should
  not — see correction 6 — but neither has been re-measured on this revision, so this
  table quotes warm figures only.
- The client-side sampler polls every 100 ms and misses the sub-100 ms checkpoints
  (embeddings, keywords, alerts), so its stage list is shorter than the local run's. The
  local benchmark, which hooks `_progress` directly, is the authoritative breakdown.

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

- **warm, analysis only** — 19–21 s on the baseline revision; **7.5–8.5 s at concurrency 8**
- **cold, end-to-end** — ~39 s (9 s container + 10 s import + 29 s analysis)

The upload request itself does no LLM work (parse + insert only); warm it is ~0.1 s.

### What this settles about the "~30 s" claim

The README's "50 reviews in ~30 seconds" **does not match any warm 50-review run** —
warm is consistently 19–21 s, and the one historical 50-review job in the database is
21.41 s. The number is defensible only as a **cold end-to-end** figure, where my own
measurement gives 29.11 s of analysis after a cold start. Note also that the only
~32 s job in the production database is the **150-review** TikTok dataset, not a
50-review one.

Safest phrasing for the baseline revision was **"about 20 seconds warm, about 30 with a
cold start."** For the current revision the warm half is **"about 10 seconds"**; the
cold-start half has not been re-measured, so do not quote a current cold figure.
(The current warm figure is ~8 s.)

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
4. **`~30 s` for 50 reviews is a cold-start number.** Warm was 19–21 s, and is ~8 s
   since the concurrency work.
5. **Stage 4 is the real bottleneck** — 8 sequential Sonnet calls, ~80% of a 200-review
   run — and the fix is the concurrency pattern stage 1 already uses.
   **Fixed 2026-08-27**: stage 4 concurrent, then both LLM stages raised to
   concurrency 8 — end-to-end **31.65 s → 9.50 s mean, −70% (3.3×)**.
   See "After — concurrent stage 4" and "Then — both stages at concurrency 8" above.
6. **The first upload of every container paid a ~10 s import.** `BackgroundTasksRunner.
   enqueue` imported `app.workers.tasks` — and transitively numpy/scikit-learn — inside
   the request path. Moved to module scope on 2026-08-27, so it lands in application
   import where Cloud Run's startup probe absorbs it. Verified locally: the enqueue-path
   import now costs 0.0000 s and `sklearn.cluster` is resident once `app.main` is
   imported. Note this **moves** the cost rather than removing it — total cold start is
   roughly conserved; what changes is that no user request waits for it.

## Cascade verification (bonus)

Deleting one bench dataset with a single `DELETE FROM datasets` on the production
database removed **68 child rows** with no application-side cascade logic:
`reviews` 50, `theme_clusters` 5, `keyword_stats` 9, `feedback_alerts` 3,
`analysis_jobs` 1 — all to zero, zero orphans left behind. `reply_drafts` also cascades
(via `reviews.id`) but the free-tier bench account could not create one to exercise it.
All bench users and datasets were removed afterwards; the 3 demo datasets are untouched.

---

## 3. Token cost, 2026-08-27

**Method.** Every `messages.create` in the Anthropic adapter goes through one
metered helper (`AnthropicLLM._create`) that records the token counts the API
returns on each response into a `UsageLedger`. Metering is therefore exact, not
estimated — there is no local tokenizer to drift out of sync with the provider's
own accounting, and no call can be added later that escapes the meter without
also bypassing the only path to the API.

Rates are USD per million tokens as published on 2026-08-27, pinned in
`app/integrations/llm/pricing.py`:

| Model | Input | Output |
|---|---|---|
| `claude-haiku-4-5` | $1.00 | $5.00 |
| `claude-sonnet-5` | $3.00 | $15.00 |

`claude-sonnet-5` also carries an **introductory rate of $2.00 / $10.00 that ends
2026-08-31**. Everything below is billed at the **standard** rate on purpose: a
figure quoted at the intro rate would silently expire four days from now. The
intro comparison is reported alongside, never as the headline.

### Measured

`scripts/bench_local.py`, real Claude, same payloads as section 1.

| | 50 reviews (Free cap) | 200 reviews (Premium cap) | 200, run 2 |
|---|---|---|---|
| Haiku calls | 3 | 9 | 9 |
| Sonnet calls | 5 | 8 | 8 |
| Input tokens | 5,512 | 15,726 | 15,730 |
| Output tokens | 1,537 | 3,875 | 4,100 |
| **Cost** | **$0.0275** | **$0.0650** | **$0.0676** |
| at intro rate | $0.0204 | $0.0500 | — |
| per review | $0.00055 | $0.00032 | $0.00034 |

Input tokens are near-identical between the two 200-review runs (15,726 vs
15,730); the spread is entirely in output tokens, which is model wording. Cost
is effectively deterministic for a given payload.

### The cost model, and why per-review cost falls with size

Two measured points give the shape directly:

```
cost(n) ≈ $0.00025 · n  +  $0.0150
          ^ marginal      ^ fixed per analysis
```

That split falls out of the pipeline's own structure, and is the useful part:

- **Sentiment (Haiku) is linear** — `ceil(n / 25)` chunked calls: 2 at n=50,
  8 at n=200.
- **Cluster labeling (Sonnet) is capped** — `_pick_k` returns
  `min(8, max(3, round(sqrt(n/2))))`, and each call samples at most 30 reviews.
  Above **n ≈ 128** k pins at 8, so this stage's cost stops growing entirely.
- **The takeaway (Haiku) is one call** regardless of n.

So the expensive model is on the *fixed* side and the cheap model is on the
*variable* side. Per-review cost therefore **falls** as uploads get larger —
$0.00055 at 50 reviews, $0.00032 at 200 — and the Sonnet share drops from 78%
to 69% of the bill.

### What 500 reviews actually costs

The unit a small seller thinks in is a few hundred reviews a month. 500 reviews
does **not** cost `cost(500)`, because the Premium cap is 200 per upload:

| | Cost |
|---|---|
| Hypothetically, one 500-review analysis | $0.140 |
| **Actually — 200 + 200 + 100, three uploads** | **$0.170** |

The 21% difference is the fixed cluster-labeling cost being **re-paid on every
upload**. The tier cap, chosen as a product constraint, is also a cost
multiplier — worth knowing before raising or lowering it.

### Margin

At the $29/month Premium price, LLM inference is not the binding cost:

- A seller analyzing 500 reviews/month costs **$0.17** — a **99.4%** gross
  margin on inference.
- Break-even on inference alone is **446 full 200-review uploads per month**,
  about **89,000 reviews** — far beyond what the target customer generates.

Stated honestly: at this scale the subscription is bounded by **fixed
infrastructure** (Cloud Run, Cloud SQL) rather than by inference, and the
model-tier split — Haiku for the linear work, Sonnet only for the capped work —
is what keeps it that way. The interesting cost lever is not the per-token rate;
it is which stage each model is assigned to.
