"""Premium routes: competitor benchmarking, smart alerts, reply drafts.
All are gated by tier — free users get a real 402."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
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
    user: User = Depends(premium_required("Competitor benchmarking")),
    db: AsyncSession = Depends(get_db),
) -> list[CompetitorComparisonOut]:
    return await build_comparisons(db, user)


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
