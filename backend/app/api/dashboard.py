from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.datasets import _owned_dataset
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import AnalysisJob, User
from app.schemas.dashboard import DashboardOut, DuplicateGroupOut
from app.services.dashboard import build_dashboard
from app.services.duplicates import find_near_duplicates

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


@router.get("/{dataset_id}/duplicates", response_model=list[DuplicateGroupOut])
async def get_near_duplicates(
    dataset_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[DuplicateGroupOut]:
    """Groups of reviews with near-identical wording — a templated-review signal.

    Served separately from the dashboard rather than folded into it: the search
    is quadratic in the dataset while the dashboard is a set of aggregates, and
    a seller opens this deliberately. Keeping it off the dashboard's path means
    the page that loads on every visit does not pay for it.

    Available on any analyzed dataset — an integrity check is not a paid upsell.
    """
    dataset = await _owned_dataset(dataset_id, user, db)
    return await find_near_duplicates(db, dataset.id)
