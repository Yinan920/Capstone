"""Background task entry points invoked by the JobRunner."""
import uuid

from app.services.pipeline import run_analysis


async def run_analysis_job(job_id: uuid.UUID) -> None:
    await run_analysis(job_id)
