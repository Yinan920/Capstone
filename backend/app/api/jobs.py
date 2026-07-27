import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import AnalysisJob, Dataset, User
from app.schemas.dataset import JobOut

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}", response_model=JobOut)
async def get_job(
    job_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> JobOut:
    try:
        parsed = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Job not found")
    job = await db.scalar(
        select(AnalysisJob)
        .join(Dataset, AnalysisJob.dataset_id == Dataset.id)
        .where(AnalysisJob.id == parsed, Dataset.user_id == user.id)
    )
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Job not found")
    return JobOut.model_validate(job)
