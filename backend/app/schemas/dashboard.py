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
    # Change in net sentiment between the first and last week of the dataset,
    # in percentage points. None when the reviews span fewer than two weeks —
    # there is no trend to report, and the UI hides the indicator entirely.
    net_sentiment_delta: Optional[float] = None


class DuplicateMemberOut(CamelModel):
    id: Id
    author: str
    rating: int
    text: str
    created_at: datetime


class DuplicateGroupOut(CamelModel):
    size: int
    # Cosine similarity of the furthest member to the group's earliest review.
    # Reported so a seller can tell a verbatim repost from a loose restatement
    # rather than being handed a bare "suspicious" flag.
    max_similarity: float
    reviews: list[DuplicateMemberOut]


class DashboardOut(CamelModel):
    dataset: DatasetOut
    kpis: KpisOut
    trend: list[SentimentPointOut]
    distribution: DistributionOut
    themes: list[ThemeOut]
    keywords: list[KeywordOut]
    reviews: list[ReviewOut]
