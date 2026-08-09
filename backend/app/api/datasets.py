from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, review_cap_for
from app.db.session import get_db
from app.models import AnalysisJob, Dataset, Review, User
from app.schemas.dataset import DatasetOut, JobOut, UploadResponse
from app.services.ingestion import parse_reviews_csv
from app.workers.runner import job_runner

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.get("", response_model=list[DatasetOut])
async def list_datasets(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[DatasetOut]:
    datasets = await db.scalars(
        select(Dataset).where(Dataset.user_id == user.id).order_by(Dataset.created_at.desc())
    )
    return [DatasetOut.model_validate(d) for d in datasets]


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    name: str = Form(..., min_length=1, max_length=200),
    product_name: str = Form(..., min_length=1, max_length=200, alias="productName"),
    source: Literal["amazon", "shopify", "tiktok", "csv"] = Form("csv"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UploadResponse:
    rows = parse_reviews_csv(await file.read())

    cap = review_cap_for(user)
    if len(rows) > cap:
        tier_hint = " Upgrade to Premium for up to 200." if user.tier == "free" else ""
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"{user.tier.capitalize()} tier is limited to {cap} reviews per upload; "
                f"the file contains {len(rows)} rows.{tier_hint}"
            ),
        )

    dataset = Dataset(
        user_id=user.id, name=name, source=source, product_name=product_name, review_count=len(rows)
    )
    db.add(dataset)
    await db.flush()
    for row in rows:
        db.add(
            Review(
                dataset_id=dataset.id,
                author=row.author,
                rating=row.rating,
                text=row.text,
                created_at=row.created_at,
            )
        )
    job = AnalysisJob(dataset_id=dataset.id)
    db.add(job)
    await db.commit()
    await db.refresh(dataset)
    await db.refresh(job)

    job_runner.enqueue(background_tasks, job.id)

    return UploadResponse(dataset=DatasetOut.model_validate(dataset), job=JobOut.model_validate(job))


@router.get("/{dataset_id}", response_model=DatasetOut)
async def get_dataset(
    dataset_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> DatasetOut:
    dataset = await _owned_dataset(dataset_id, user, db)
    return DatasetOut.model_validate(dataset)


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(
    dataset_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> None:
    """Delete a dataset and everything derived from it.

    The FK cascades take care of reviews, the analysis job, theme clusters,
    keyword stats, alerts and any reply drafts — so removing the parent row is
    enough, and no orphans survive.
    """
    dataset = await _owned_dataset(dataset_id, user, db)
    await db.delete(dataset)
    await db.commit()


async def _owned_dataset(dataset_id: str, user: User, db: AsyncSession) -> Dataset:
    import uuid

    try:
        parsed = uuid.UUID(dataset_id)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Dataset not found")
    dataset = await db.get(Dataset, parsed)
    if dataset is None or dataset.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Dataset not found")
    return dataset
