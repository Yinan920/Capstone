from datetime import datetime
from typing import Optional

from app.schemas.base import CamelModel, Id


class CompetitorOut(CamelModel):
    id: Id
    name: str
    channel: str
    review_count: int
    net_sentiment: float
    avg_rating: float


class CompetitorAxisOut(CamelModel):
    axis: str
    you: int
    competitor: int


class SentimentSplitOut(CamelModel):
    label: str
    you_positive: int
    competitor_positive: int


class YouStatsOut(CamelModel):
    name: str
    net_sentiment: float
    avg_rating: float
    review_count: int


class CompetitorComparisonOut(CamelModel):
    you: YouStatsOut
    competitor: CompetitorOut
    axes: list[CompetitorAxisOut]
    sentiment_split: list[SentimentSplitOut]
    overlap_score: float
    advantages: list[str]
    gaps: list[str]


class AlertOut(CamelModel):
    id: Id
    # Which upload raised this alert. The feed is returned whole and grouped
    # client-side: a seller's alert count is bounded by datasets × complaint
    # themes — tens, not thousands — so one request keeps the sidebar's global
    # unread badge and the per-dataset list in a single cache entry. A
    # `datasetId` filter on the endpoint is the change if that stops holding.
    dataset_id: Id
    theme: str
    severity: str
    share: float
    threshold: float
    previous_share: float
    sample_reviews: list[str]
    read_at: Optional[datetime] = None
    triggered_at: datetime


class ReplyDraftOut(CamelModel):
    id: Id
    review_id: Id
    tone: str
    body: str
    portal: str
    portal_url: str
