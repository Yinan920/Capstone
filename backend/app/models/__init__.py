"""Import all models so Base.metadata knows every table (Alembic + create_all)."""
from app.models.alert import FeedbackAlert
from app.models.competitor import Competitor
from app.models.dataset import Dataset
from app.models.job import AnalysisJob
from app.models.keyword import KeywordStat
from app.models.reply import ReplyDraft
from app.models.review import EMBEDDING_DIM, Review
from app.models.theme import ThemeCluster
from app.models.user import User

__all__ = [
    "AnalysisJob",
    "Competitor",
    "Dataset",
    "EMBEDDING_DIM",
    "FeedbackAlert",
    "KeywordStat",
    "ReplyDraft",
    "Review",
    "ThemeCluster",
    "User",
]
