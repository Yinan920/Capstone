import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Dataset(Base):
    __tablename__ = "datasets"
    __table_args__ = (
        CheckConstraint("source IN ('amazon', 'shopify', 'tiktok', 'csv')", name="ck_datasets_source"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    source: Mapped[str] = mapped_column(String(10), nullable=False, default="csv", server_default=text("'csv'"))
    product_name: Mapped[str] = mapped_column(String(200), nullable=False)
    review_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))
    # One actionable sentence written from this dataset's own themes at the end
    # of analysis. Nullable: datasets analyzed before this column existed, and
    # any run where the summarizing call failed, simply have no takeaway.
    takeaway: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), server_default=text("now()")
    )
