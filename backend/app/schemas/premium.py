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
    theme: str
    severity: str
    share: float
    threshold: float
    previous_share: float
    window_days: int
    sample_reviews: list[str]
    email_sent_to: Optional[str] = None
    triggered_at: datetime


class ReplyDraftOut(CamelModel):
    id: Id
    review_id: Id
    tone: str
    body: str
    portal: str
    portal_url: str
