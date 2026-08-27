"""Premium competitor benchmarking: compare the caller's primary analyzed
dataset against seeded competitor profiles.

Competitor rows store per-axis satisfaction scores (0–100) in `axes` jsonb:
[{"axis": "Coffee quality", "score": 72}, ...]. The caller's per-axis score is
derived from their theme clusters (matched by axis keywords); unmatched axes
fall back to the overall positive rate."""
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Competitor, Dataset, Review, ThemeCluster, User
from app.schemas.premium import (
    CompetitorAxisOut,
    CompetitorComparisonOut,
    CompetitorOut,
    SentimentSplitOut,
    YouStatsOut,
)

AXIS_THEME_HINTS = {
    "coffee quality": ["coffee", "quality", "taste", "crema"],
    "packaging": ["packag"],
    "shipping": ["shipping", "delivery"],
    "battery life": ["battery", "power", "charge"],
    "support": ["support", "service"],
    "value": ["value", "price"],
}


def _axis_score(axis: str, themes: list[ThemeCluster], fallback: int) -> int:
    hints = AXIS_THEME_HINTS.get(axis.lower(), [axis.lower()])
    for theme in themes:
        label = theme.label.lower()
        if any(h in label for h in hints):
            return max(0, min(100, round((theme.avg_sentiment + 1) / 2 * 100)))
    return fallback


async def build_comparisons(
    db: AsyncSession, user: User, dataset_id: uuid.UUID | None = None
) -> list[CompetitorComparisonOut]:
    """Benchmark one of the caller's datasets against the seeded competitors.

    `dataset_id` names which dataset is "you" — it is what makes the page follow
    the dataset switcher. Without it the comparison silently pinned itself to the
    caller's newest analyzed dataset, so switching datasets in the UI changed
    nothing. Omitted, that fallback still applies (first load, before a selection
    exists); a dataset that is not the caller's, or has no analysis yet, yields
    an empty list rather than someone else's numbers.
    """
    if dataset_id is not None:
        candidates = [
            d
            for d in [await db.get(Dataset, dataset_id)]
            if d is not None and d.user_id == user.id
        ]
    else:
        # Fallback: most recent dataset that has analysis results.
        candidates = list(
            (
                await db.scalars(
                    select(Dataset)
                    .where(Dataset.user_id == user.id)
                    .order_by(Dataset.created_at.desc())
                )
            ).all()
        )

    primary, themes, reviews = None, [], []
    for candidate in candidates:
        themes = list(
            (await db.scalars(select(ThemeCluster).where(ThemeCluster.dataset_id == candidate.id))).all()
        )
        if themes:
            primary = candidate
            reviews = list(
                (await db.scalars(select(Review).where(Review.dataset_id == candidate.id))).all()
            )
            break
    if primary is None:
        return []

    total = len(reviews)
    positive_rate = sum(1 for r in reviews if r.sentiment_label == "positive") / total if total else 0
    you = YouStatsOut(
        name=primary.product_name,
        net_sentiment=round(sum(r.sentiment_score or 0 for r in reviews) / total, 2) if total else 0.0,
        avg_rating=round(sum(r.rating for r in reviews) / total, 1) if total else 0.0,
        review_count=total,
    )
    fallback_score = round(positive_rate * 100)

    comparisons = []
    competitors = list((await db.scalars(select(Competitor).order_by(Competitor.name))).all())
    for competitor in competitors:
        axes = []
        for entry in competitor.axes:
            you_score = _axis_score(entry["axis"], themes, fallback_score)
            axes.append(CompetitorAxisOut(axis=entry["axis"], you=you_score, competitor=entry["score"]))
        split = [
            SentimentSplitOut(label=a.axis, you_positive=a.you, competitor_positive=a.competitor)
            for a in axes
        ]
        overlap = (
            round(1 - sum(abs(a.you - a.competitor) for a in axes) / (100 * len(axes)), 2) if axes else 0.0
        )
        advantages = [
            f"{a.axis} sentiment leads {competitor.name} by {a.you - a.competitor} pts"
            for a in axes
            if a.you - a.competitor >= 5
        ]
        gaps = [
            f"{a.axis} trails {competitor.name} by {a.competitor - a.you} pts"
            for a in axes
            if a.competitor - a.you >= 5
        ]
        comparisons.append(
            CompetitorComparisonOut(
                you=you,
                competitor=CompetitorOut.model_validate(competitor),
                axes=axes,
                sentiment_split=split,
                overlap_score=overlap,
                advantages=advantages,
                gaps=gaps,
            )
        )
    return comparisons
