"""Reset the demo database to a clean, presentable state.

Deletes every dataset and its analysis, keeps/creates the demo premium account
and the seeded competitor profiles. Intended to be run before a presentation so
the dataset switcher only shows the datasets you are about to demo.

Local:  backend/.venv/bin/python -m scripts.reset_demo
Cloud:  gcloud run jobs execute sellersense-reset --region us-central1 --wait

Destructive by design — it drops all uploaded review data. Accounts other than
the demo user are removed too, so stale E2E test accounts don't accumulate.
"""
import asyncio

from sqlalchemy import text

from app.db.session import async_session_factory
from scripts.seed import seed

# Ordered child-to-parent; datasets cascade to reviews/themes/jobs/keywords/alerts,
# but being explicit keeps the intent readable.
TABLES = (
    "reply_drafts",
    "feedback_alerts",
    "keyword_stats",
    "analysis_jobs",
    "reviews",
    "theme_clusters",
    "datasets",
)


async def reset() -> None:
    async with async_session_factory() as db:
        await db.execute(text(f"TRUNCATE {', '.join(TABLES)} CASCADE"))
        # Drop every account except the demo login, so E2E leftovers don't pile up.
        result = await db.execute(
            text("DELETE FROM users WHERE email <> :keep"), {"keep": "demo@novabrew.co"}
        )
        await db.commit()
        print(f"cleared all datasets and analysis; removed {result.rowcount} non-demo accounts")

    await seed()  # re-assert the demo user's password/tier and the competitors


if __name__ == "__main__":
    asyncio.run(reset())
