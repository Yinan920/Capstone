"""Dashboard aggregation: turn persisted analysis results into the exact
`DashboardData` shape the frontend consumes."""
from collections import defaultdict
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Dataset, KeywordStat, Review, ThemeCluster
from app.schemas.dashboard import (
    DashboardOut,
    DistributionOut,
    KeywordOut,
    KpisOut,
    ReviewOut,
    SentimentPointOut,
    ThemeOut,
)
from app.schemas.dataset import DatasetOut


async def build_dashboard(db: AsyncSession, dataset: Dataset) -> DashboardOut:
    reviews = list(
        (
            await db.scalars(
                select(Review).where(Review.dataset_id == dataset.id).order_by(Review.created_at)
            )
        ).all()
    )
    themes = list(
        (
            await db.scalars(
                select(ThemeCluster)
                .where(ThemeCluster.dataset_id == dataset.id)
                .order_by(ThemeCluster.share.desc())
            )
        ).all()
    )
    keywords = list(
        (
            await db.scalars(
                select(KeywordStat)
                .where(KeywordStat.dataset_id == dataset.id)
                .order_by(KeywordStat.count.desc())
            )
        ).all()
    )

    total = len(reviews)
    positive = sum(1 for r in reviews if r.sentiment_label == "positive")
    neutral = sum(1 for r in reviews if r.sentiment_label == "neutral")
    negative = sum(1 for r in reviews if r.sentiment_label == "negative")
    net_sentiment = round(sum(r.sentiment_score or 0 for r in reviews) / total, 2) if total else 0.0

    kpis = KpisOut(
        reviews_analyzed=total,
        net_sentiment=net_sentiment,
        positive_rate=round(positive / total, 2) if total else 0.0,
        complaint_themes=sum(1 for t in themes if t.is_complaint),
        avg_rating=round(sum(r.rating for r in reviews) / total, 1) if total else 0.0,
        response_opportunities=negative,
    )

    return DashboardOut(
        dataset=DatasetOut.model_validate(dataset),
        kpis=kpis,
        trend=_weekly_trend(reviews),
        distribution=_distribution(positive, neutral, negative, total),
        themes=[ThemeOut.model_validate(t) for t in themes],
        keywords=[KeywordOut.model_validate(k) for k in keywords],
        reviews=[ReviewOut.model_validate(r) for r in reversed(reviews)],  # newest first
    )


def _distribution(positive: int, neutral: int, negative: int, total: int) -> DistributionOut:
    if not total:
        return DistributionOut(positive=0, neutral=0, negative=0)
    pos = round(positive * 100 / total)
    neg = round(negative * 100 / total)
    return DistributionOut(positive=pos, neutral=max(0, 100 - pos - neg), negative=neg)


def _weekly_trend(reviews: list[Review]) -> list[SentimentPointOut]:
    """Bucket reviews into ISO weeks (Monday start) and express each bucket as
    percentage shares, matching the mock data's shape."""
    buckets: dict = defaultdict(lambda: {"positive": 0, "neutral": 0, "negative": 0})
    for r in reviews:
        if r.sentiment_label is None:
            continue
        week_start = (r.created_at - timedelta(days=r.created_at.weekday())).date()
        buckets[week_start][r.sentiment_label] += 1

    points = []
    for week_start in sorted(buckets):
        counts = buckets[week_start]
        total = sum(counts.values())
        pos = round(counts["positive"] * 100 / total)
        neg = round(counts["negative"] * 100 / total)
        points.append(
            SentimentPointOut(
                date=week_start.isoformat(),
                positive=pos,
                neutral=max(0, 100 - pos - neg),
                negative=neg,
                score=round((pos - neg) / 100, 2),
            )
        )
    return points
