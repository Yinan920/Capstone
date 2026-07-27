import uuid

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ThemeCluster(Base):
    __tablename__ = "theme_clusters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    review_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))
    share: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, server_default=text("0"))
    avg_sentiment: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, server_default=text("0"))
    is_complaint: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    trend: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, server_default=text("0"))
