import uuid

from sqlalchemy import CheckConstraint, Float, Integer, String, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Competitor(Base):
    """Seeded competitor profile. `axes` holds [{"axis": str, "score": int}, ...];
    the per-user comparison is computed at request time against their datasets."""

    __tablename__ = "competitors"
    __table_args__ = (
        CheckConstraint("channel IN ('amazon', 'shopify', 'tiktok', 'csv')", name="ck_competitors_channel"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    channel: Mapped[str] = mapped_column(String(10), nullable=False)
    review_count: Mapped[int] = mapped_column(Integer, nullable=False)
    net_sentiment: Mapped[float] = mapped_column(Float, nullable=False)
    avg_rating: Mapped[float] = mapped_column(Float, nullable=False)
    axes: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb"))
