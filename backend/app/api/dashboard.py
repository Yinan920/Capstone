from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.datasets import _owned_dataset
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import AnalysisJob, User
from app.schemas.dashboard import DashboardOut
from app.services.dashboard import build_dashboard

router = APIRouter(prefix="/datasets", tags=["dashboard"])


@router.get("/{dataset_id}/dashboard", response_model=DashboardOut)
async def get_dashboard(
    dataset_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> DashboardOut:
    dataset = await _owned_dataset(dataset_id, user, db)
    latest_job = await db.scalar(
        select(AnalysisJob)
        .where(AnalysisJob.dataset_id == dataset.id)
        .order_by(AnalysisJob.created_at.desc())
        .limit(1)
    )
    if latest_job is None or latest_job.status != "done":
        job_status = latest_job.status if latest_job else "missing"
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail=f"Analysis is not finished for this dataset (status: {job_status})",
        )
    return await build_dashboard(db, dataset)
