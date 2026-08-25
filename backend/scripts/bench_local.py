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
    80: "4. Cluster labels     (LLM: Sonnet, SEQUENTIAL loop)",
    90: "5. Keyword n-grams    (local: sklearn CountVectorizer)",
    95: "6. Alert rules        (local + mock email)",
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
    stats = {"score": [0, 0.0], "label_cluster": [0, 0.0]}

    def wrap(name):
        orig = getattr(llm, name)

        async def inner(*a, **kw):
            t0 = time.perf_counter()
            try:
                return await orig(*a, **kw)
            finally:
                stats[name][0] += 1
                stats[name][1] += time.perf_counter() - t0
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
    prev = marks[0][1] if marks else t0
    for value, ts in marks[1:]:
        print(f"  {STAGE_OF_PROGRESS.get(value, value):52s} {ts - prev:7.2f}s")
        prev = ts
    print(f"  {'(final commit)':52s} {t0 + total - prev:7.2f}s")
    print("\n--- LLM vs local ---")
    print(f"  score()         calls={stats['score'][0]:2d}  wall={stats['score'][1]:7.2f}s  <- stage 1")
    if chunk_calls:
        durs = sorted(d for _, d in chunk_calls)
        print(f"    -> {len(chunk_calls)} chunk requests of {chunk_calls[0][0]} reviews each; "
              f"per-chunk {durs[0]:.2f}s..{durs[-1]:.2f}s, sum-if-serial {sum(durs):.2f}s")
    print(f"  label_cluster() calls={stats['label_cluster'][0]:2d}  wall={stats['label_cluster'][1]:7.2f}s  <- stage 4")
    llm_total = stats["score"][1] + stats["label_cluster"][1]
    print(f"  external LLM total      {llm_total:7.2f}s  ({llm_total / total * 100:.0f}% of pipeline)")
    print(f"  local compute + DB      {total - llm_total:7.2f}s")
    print(f"\nTOTAL pipeline wall time: {total:.2f}s   (DB started_at->finished_at: {db_secs:.2f}s)")


ensure_db()
asyncio.run(main())
