"""Premium routes: competitor benchmarking, smart alerts, reply drafts.
All are gated by tier — free users get a real 402."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import false as sa_false
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import premium_required
from app.db.session import get_db
from app.integrations.providers import get_llm
from app.models import Dataset, FeedbackAlert, ReplyDraft, Review, ThemeCluster, User
from app.schemas.premium import AlertOut, CompetitorComparisonOut, ReplyDraftOut
from app.services.competitors import build_comparisons

router = APIRouter(tags=["premium"])

PORTAL_URLS = {
    "amazon": "https://sellercentral.amazon.com/messaging",
    "shopify": "https://admin.shopify.com/reviews",
    "tiktok": "https://seller.tiktok.com/messages",
}


@router.get("/competitors", response_model=list[CompetitorComparisonOut])
async def competitors(
    datasetId: str | None = None,
    user: User = Depends(premium_required("Competitor benchmarking")),
    db: AsyncSession = Depends(get_db),
) -> list[CompetitorComparisonOut]:
    """Benchmark one dataset against the seeded competitors.

    `datasetId` selects which of the caller's datasets is compared; omitted, the
    newest analyzed one is used. An unparseable or unknown id returns an empty
    list — the same answer as "this dataset has no analysis yet" — rather than
    quietly benchmarking a different dataset than the client asked for.
    """
    parsed = None
    if datasetId is not None:
        try:
            parsed = uuid.UUID(datasetId)
        except ValueError:
            return []
    return await build_comparisons(db, user, parsed)


@router.get("/alerts", response_model=list[AlertOut])
async def alerts(
    user: User = Depends(premium_required("Smart alerts")),
    db: AsyncSession = Depends(get_db),
) -> list[AlertOut]:
    rows = await db.scalars(
        select(FeedbackAlert)
        .where(FeedbackAlert.user_id == user.id)
        .order_by(FeedbackAlert.triggered_at.desc())
    )
    return [AlertOut.model_validate(a) for a in rows]


@router.patch("/alerts/{alert_id}/read", response_model=AlertOut)
async def mark_alert_read(
    alert_id: str,
    user: User = Depends(premium_required("Smart alerts")),
    db: AsyncSession = Depends(get_db),
) -> AlertOut:
    """Mark one alert read. Idempotent: re-reading keeps the original timestamp."""
    try:
        parsed = uuid.UUID(alert_id)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Alert not found")
    alert = await db.scalar(
        select(FeedbackAlert).where(FeedbackAlert.id == parsed, FeedbackAlert.user_id == user.id)
    )
    if alert is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Alert not found")
    if alert.read_at is None:
        alert.read_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(alert)
    return AlertOut.model_validate(alert)


@router.post("/alerts/read-all", response_model=list[AlertOut])
async def mark_all_alerts_read(
    datasetId: str | None = None,
    user: User = Depends(premium_required("Smart alerts")),
    db: AsyncSession = Depends(get_db),
) -> list[AlertOut]:
    """Mark unread alerts read in one round trip, and return the caller's new state.

    `datasetId` scopes the action to one upload. The UI passes it for the
    button shown beside a single dataset's alerts, so the blast radius matches
    what the page is displaying; clearing every upload at once is a separate,
    explicitly labelled action. An unparseable id matches nothing rather than
    falling through to "all", which would be the dangerous direction to fail in.
    """
    now = datetime.now(timezone.utc)
    conditions = [FeedbackAlert.user_id == user.id, FeedbackAlert.read_at.is_(None)]
    if datasetId is not None:
        try:
            conditions.append(FeedbackAlert.dataset_id == uuid.UUID(datasetId))
        except ValueError:
            conditions.append(sa_false())
    await db.execute(update(FeedbackAlert).where(*conditions).values(read_at=now))
    await db.commit()
    rows = await db.scalars(
        select(FeedbackAlert)
        .where(FeedbackAlert.user_id == user.id)
        .order_by(FeedbackAlert.triggered_at.desc())
    )
    return [AlertOut.model_validate(a) for a in rows]


@router.post(
    "/reviews/{review_id}/reply-draft",
    response_model=ReplyDraftOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_reply_draft(
    review_id: str,
    user: User = Depends(premium_required("Reply drafts")),
    db: AsyncSession = Depends(get_db),
) -> ReplyDraftOut:
    try:
        parsed = uuid.UUID(review_id)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Review not found")
    review = await db.scalar(
        select(Review)
        .join(Dataset, Review.dataset_id == Dataset.id)
        .where(Review.id == parsed, Dataset.user_id == user.id)
    )
    if review is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Review not found")

    theme_label = None
    if review.theme_id is not None:
        theme = await db.get(ThemeCluster, review.theme_id)
        theme_label = theme.label if theme else None

    dataset = await db.get(Dataset, review.dataset_id)
    portal = dataset.source if dataset.source in PORTAL_URLS else "amazon"

    body = await get_llm().draft_reply(review.author, review.text, theme_label)
    draft = ReplyDraft(
        review_id=review.id,
        tone="Warm · Accountable · On-brand",
        body=body,
        portal=portal,
        portal_url=PORTAL_URLS[portal],
    )
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    return ReplyDraftOut.model_validate(draft)
