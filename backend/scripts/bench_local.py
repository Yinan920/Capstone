"""Measure the SellerSense pipeline on a real dataset with real Claude.

Method notes (so the number is defensible):
  * Runs the PRODUCTION pipeline function `app.services.pipeline.run_analysis`
    unmodified. No repo code is edited.
  * Stage boundaries are read from the pipeline's own progress checkpoints by
    wrapping `_progress`. The mapping 5/30/50/65/80/90/95 -> stage is fixed by
    pipeline.py itself, so the split is the code's, not mine.
  * The LLM adapter methods are wrapped to count calls and time them, which
    separates "waiting on Anthropic" from local compute.
  * Isolated database (sellersense_bench), migrated with the real Alembic
    migration. Never touches the dev or demo data.

Usage: python bench_local.py <csv_path> <label>
"""
import asyncio
import os
import pathlib
import sys
import time

CSV = pathlib.Path(sys.argv[1])
LABEL = sys.argv[2] if len(sys.argv) > 2 else CSV.stem

REPO = pathlib.Path(__file__).resolve().parents[2]
BENCH_DB = "postgresql+asyncpg://sellersense:sellersense@localhost:5432/sellersense_bench"

# Must be set before any app.* import: Settings reads the environment once.
os.environ["DATABASE_URL"] = BENCH_DB
os.environ["LLM_PROVIDER"] = os.environ.get("BENCH_LLM", "anthropic")
os.environ["EMBEDDINGS_PROVIDER"] = "mock"
_key = os.environ.get("ANTHROPIC_API_KEY") or ""
if not _key and (REPO / "docs/api-key").exists():  # gitignored local convenience
    _key = (REPO / "docs/api-key").read_text().strip()
os.environ["ANTHROPIC_API_KEY"] = _key

import asyncpg  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402

STAGE_OF_PROGRESS = {
    30: "1. Sentiment          (LLM: Haiku, chunked+concurrent)",
    50: "2. Embeddings         (local: mock md5+numpy)",
    65: "3. KMeans clustering  (local: sklearn)",
    80: "4. Cluster labels     (LLM: Sonnet, chunked+concurrent)",
    85: "4b. Dataset takeaway  (LLM: Haiku, single call)",
    90: "5. Keyword n-grams    (local: sklearn CountVectorizer)",
    95: "6. Alert rules        (local)",
}


def ensure_db():
    """Create + migrate the bench DB. Sync, and OUTSIDE any running loop:
    alembic/env.py calls asyncio.run() itself."""
    async def create():
        conn = await asyncpg.connect(
            user="sellersense", password="sellersense", database="postgres", host="localhost"
        )
        try:
            if not await conn.fetchval(
                "SELECT 1 FROM pg_database WHERE datname='sellersense_bench'"
            ):
                await conn.execute("CREATE DATABASE sellersense_bench")
        finally:
            await conn.close()

    asyncio.run(create())
    cfg = Config(str(REPO / "backend/alembic.ini"))
    cfg.set_main_option("script_location", str(REPO / "backend/alembic"))
    cfg.set_main_option("sqlalchemy.url", BENCH_DB)
    command.upgrade(cfg, "head")


async def main():
    from app.db.session import async_session_factory
    from app.integrations import providers
    from app.models import AnalysisJob, Dataset, Review, User
    from app.services import pipeline
    from app.services.ingestion import parse_reviews_csv

    rows = parse_reviews_csv(CSV.read_bytes())
    print(f"\n=== {LABEL}: {len(rows)} reviews ===")

    # --- seed exactly like POST /api/datasets/upload does ---------------
    async with async_session_factory() as db:
        user = User(
            email=f"bench-{int(time.time())}@local.test",
            name="Bench",
            hashed_password="x" * 20,
            tier="premium",
        )
        db.add(user)
        await db.flush()
        ds = Dataset(
            user_id=user.id, name=LABEL, source="csv",
            product_name="NovaBrew Espresso", review_count=len(rows),
        )
        db.add(ds)
        await db.flush()
        for r in rows:
            db.add(Review(dataset_id=ds.id, author=r.author, rating=r.rating,
                          text=r.text, created_at=r.created_at))
        job = AnalysisJob(dataset_id=ds.id)
        db.add(job)
        await db.commit()
        job_id, ds_id = job.id, ds.id

    # --- instrument: stage boundaries from the pipeline's own checkpoints ---
    marks = []
    orig_progress = pipeline._progress

    async def timed_progress(db, job, value):
        marks.append((value, time.perf_counter()))
        return await orig_progress(db, job, value)

    pipeline._progress = timed_progress

    # --- instrument: LLM calls (count + cumulative wall time) -------------
    llm = providers.get_llm()
    print(f"LLM adapter in use: {type(llm).__name__}")
    # Per-call durations, not just a cumulative sum: stages 1 and 4 both run
    # their requests concurrently, so summing call durations overstates the
    # time actually spent waiting. Stage wall times below come from the
    # pipeline's own progress checkpoints instead.
    stats = {"score": [], "label_cluster": [], "summarize_findings": []}

    def wrap(name):
        orig = getattr(llm, name)

        async def inner(*a, **kw):
            t0 = time.perf_counter()
            try:
                return await orig(*a, **kw)
            finally:
                stats[name].append(time.perf_counter() - t0)
        return inner

    for n in stats:
        setattr(llm, n, wrap(n))

    # count the inner per-chunk HTTP requests too (real adapter only)
    chunk_calls = []
    if hasattr(llm, "_score_chunk"):
        orig_chunk = llm._score_chunk

        async def timed_chunk(texts, ratings):
            t = time.perf_counter()
            out = await orig_chunk(texts, ratings)
            chunk_calls.append((len(texts), time.perf_counter() - t))
            return out

        llm._score_chunk = timed_chunk

    # get_llm() is lru_cached, so zero the meter rather than trusting a fresh process
    if hasattr(llm, "usage"):
        llm.usage.reset()

    # --- run the real pipeline -------------------------------------------
    t0 = time.perf_counter()
    await pipeline.run_analysis(job_id)
    total = time.perf_counter() - t0

    # --- report ------------------------------------------------------------
    async with async_session_factory() as db:
        job = await db.get(AnalysisJob, job_id)
        status, err = job.status, job.error
        db_secs = (job.finished_at - job.started_at).total_seconds()
        from sqlalchemy import func, select
        from app.models import FeedbackAlert, KeywordStat, ThemeCluster
        counts = {}
        for m in (Review, ThemeCluster, KeywordStat, FeedbackAlert):
            counts[m.__tablename__] = await db.scalar(
                select(func.count()).select_from(m).where(m.dataset_id == ds_id)
            )
        scored = await db.scalar(
            select(func.count()).select_from(Review).where(
                Review.dataset_id == ds_id, Review.sentiment_label.isnot(None))
        )

    print(f"job status: {status}" + (f"  error={err}" if err else ""))
    print(f"reviews scored: {scored}/{len(rows)}")
    print(f"rows written: {counts}")
    print("\n--- stage breakdown (from pipeline's own progress checkpoints) ---")
    stage_wall = {}
    prev = marks[0][1] if marks else t0
    for value, ts in marks[1:]:
        stage_wall[value] = ts - prev
        print(f"  {STAGE_OF_PROGRESS.get(value, value):52s} {ts - prev:7.2f}s")
        prev = ts
    print(f"  {'(final commit)':52s} {t0 + total - prev:7.2f}s")

    def concurrency_line(durs, stage_secs, unit):
        """Serial-equivalent vs measured wall time for one concurrent stage."""
        if not durs:
            return
        serial = sum(durs)
        speedup = f", {serial / stage_secs:.1f}x" if stage_secs > 0 else ""
        print(f"    -> {len(durs)} {unit}; per-call {min(durs):.2f}s..{max(durs):.2f}s, "
              f"sum-if-serial {serial:.2f}s vs {stage_secs:.2f}s actual{speedup}")

    print("\n--- LLM vs local ---")
    s1, s4 = stage_wall.get(30, 0.0), stage_wall.get(80, 0.0)
    print(f"  stage 1 sentiment       {s1:7.2f}s   ({len(stats['score'])} score() call)")
    concurrency_line(
        [d for _, d in chunk_calls], s1,
        f"chunk requests of {chunk_calls[0][0]} reviews each" if chunk_calls else "chunks",
    )
    print(f"  stage 4 cluster labels  {s4:7.2f}s")
    concurrency_line(stats["label_cluster"], s4, "label_cluster() requests")
    s4b = stage_wall.get(85, 0.0)
    print(f"  stage 4b takeaway       {s4b:7.2f}s   "
          f"({len(stats['summarize_findings'])} summarize_findings() call)")
    llm_total = s1 + s4 + s4b
    print(f"  external LLM total      {llm_total:7.2f}s  ({llm_total / total * 100:.0f}% of pipeline)")
    print(f"  local compute + DB      {total - llm_total:7.2f}s")

    ledger = getattr(llm, "usage", None)
    if ledger is not None and ledger.calls:
        from app.integrations.llm.pricing import INTRO, PRICING_AS_OF, STANDARD

        n = len(rows)
        print(f"\n--- token cost (rates as of {PRICING_AS_OF}, billed at standard) ---")
        for model in sorted(ledger.by_model):
            u = ledger.by_model[model]
            line_cost = STANDARD[model].cost(u.input_tokens, u.output_tokens) if model in STANDARD else 0.0
            print(f"  {model:20s} {u.calls:2d} calls  "
                  f"in {u.input_tokens:7,d}  out {u.output_tokens:6,d}  ${line_cost:.4f}")
        if ledger.unpriced():
            print(f"  !! no rate on file for: {', '.join(ledger.unpriced())}")

        run_cost = ledger.cost()
        print(f"  {'TOTAL':20s} {ledger.calls:2d} calls  "
              f"in {ledger.input_tokens:7,d}  out {ledger.output_tokens:6,d}  ${run_cost:.4f}")
        print(f"  at Sonnet's intro rate (ends 2026-08-31): ${ledger.cost(INTRO):.4f}")
        print(f"  per review: ${run_cost / n:.5f}   per 1,000 reviews: ${run_cost / n * 1000:.2f}")
    print(f"\nTOTAL pipeline wall time: {total:.2f}s   (DB started_at->finished_at: {db_secs:.2f}s)")


ensure_db()
asyncio.run(main())
