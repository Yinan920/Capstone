from datetime import datetime
from typing import Optional

from app.schemas.base import CamelModel, Id
from app.schemas.dataset import DatasetOut


class ReviewOut(CamelModel):
    id: Id
    dataset_id: Id
    author: str
    rating: int
    text: str
    created_at: datetime
    sentiment_score: Optional[float] = None
    sentiment_label: Optional[str] = None
    theme_id: Optional[Id] = None


class ThemeOut(CamelModel):
    id: Id
    label: str
    summary: str
    review_count: int
    share: float
    avg_sentiment: float
    is_complaint: bool
    trend: float


class KeywordOut(CamelModel):
    term: str
    count: int
    sentiment: str


class SentimentPointOut(CamelModel):
    date: str
    positive: int
    neutral: int
    negative: int
    score: float


class DistributionOut(CamelModel):
    positive: int
    neutral: int
    negative: int


class KpisOut(CamelModel):
    reviews_analyzed: int
    net_sentiment: float
    positive_rate: float
    complaint_themes: int
    avg_rating: float
    response_opportunities: int


class DashboardOut(CamelModel):
    dataset: DatasetOut
    kpis: KpisOut
    trend: list[SentimentPointOut]
    distribution: DistributionOut
    themes: list[ThemeOut]
    keywords: list[KeywordOut]
    reviews: list[ReviewOut]
