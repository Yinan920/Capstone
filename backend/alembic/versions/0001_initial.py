"""Initial schema: pgvector extension + all SellerSense tables.

Revision ID: 0001
Revises:
Create Date: 2026-07-19

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("tier", sa.String(10), nullable=False, server_default=sa.text("'free'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("tier IN ('free', 'premium')", name="ck_users_tier"),
    )

    op.create_table(
        "datasets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("source", sa.String(10), nullable=False, server_default=sa.text("'csv'")),
        sa.Column("product_name", sa.String(200), nullable=False),
        sa.Column("review_count", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("source IN ('amazon', 'shopify', 'tiktok', 'csv')", name="ck_datasets_source"),
    )
    op.create_index("ix_datasets_user_id", "datasets", ["user_id"])

    op.create_table(
        "theme_clusters",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("dataset_id", UUID(as_uuid=True), sa.ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("summary", sa.Text, nullable=False),
        sa.Column("review_count", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("share", sa.Float, nullable=False, server_default=sa.text("0")),
        sa.Column("avg_sentiment", sa.Float, nullable=False, server_default=sa.text("0")),
        sa.Column("is_complaint", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("trend", sa.Float, nullable=False, server_default=sa.text("0")),
    )
    op.create_index("ix_theme_clusters_dataset_id", "theme_clusters", ["dataset_id"])

    op.create_table(
        "reviews",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("dataset_id", UUID(as_uuid=True), sa.ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("theme_id", UUID(as_uuid=True), sa.ForeignKey("theme_clusters.id", ondelete="SET NULL"), nullable=True),
        sa.Column("author", sa.String(120), nullable=False),
        sa.Column("rating", sa.Integer, nullable=False),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sentiment_score", sa.Float, nullable=True),
        sa.Column("sentiment_label", sa.String(10), nullable=True),
        sa.Column("embedding", Vector(384), nullable=True),
        sa.CheckConstraint("rating BETWEEN 1 AND 5", name="ck_reviews_rating"),
        sa.CheckConstraint("sentiment_label IN ('positive', 'neutral', 'negative')", name="ck_reviews_sentiment_label"),
    )
    op.create_index("ix_reviews_dataset_id", "reviews", ["dataset_id"])
    op.create_index("ix_reviews_theme_id", "reviews", ["theme_id"])

    op.create_table(
        "analysis_jobs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("dataset_id", UUID(as_uuid=True), sa.ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(10), nullable=False, server_default=sa.text("'queued'")),
        sa.Column("progress", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('queued', 'running', 'done', 'failed')", name="ck_analysis_jobs_status"),
        sa.CheckConstraint("progress BETWEEN 0 AND 100", name="ck_analysis_jobs_progress"),
    )
    op.create_index("ix_analysis_jobs_dataset_id", "analysis_jobs", ["dataset_id"])

    op.create_table(
        "keyword_stats",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("dataset_id", UUID(as_uuid=True), sa.ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("term", sa.String(80), nullable=False),
        sa.Column("count", sa.Integer, nullable=False),
        sa.Column("sentiment", sa.String(10), nullable=False),
        sa.CheckConstraint("sentiment IN ('positive', 'neutral', 'negative')", name="ck_keyword_stats_sentiment"),
    )
    op.create_index("ix_keyword_stats_dataset_id", "keyword_stats", ["dataset_id"])

    op.create_table(
        "feedback_alerts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("dataset_id", UUID(as_uuid=True), sa.ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("theme", sa.String(120), nullable=False),
        sa.Column("severity", sa.String(10), nullable=False),
        sa.Column("share", sa.Float, nullable=False),
        sa.Column("threshold", sa.Float, nullable=False),
        sa.Column("previous_share", sa.Float, nullable=False),
        sa.Column("window_days", sa.Integer, nullable=False, server_default=sa.text("14")),
        sa.Column("sample_reviews", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("email_sent_to", sa.String(255), nullable=True),
        sa.Column("triggered_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("severity IN ('warning', 'serious', 'critical')", name="ck_feedback_alerts_severity"),
    )
    op.create_index("ix_feedback_alerts_user_id", "feedback_alerts", ["user_id"])
    op.create_index("ix_feedback_alerts_dataset_id", "feedback_alerts", ["dataset_id"])

    op.create_table(
        "competitors",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("channel", sa.String(10), nullable=False),
        sa.Column("review_count", sa.Integer, nullable=False),
        sa.Column("net_sentiment", sa.Float, nullable=False),
        sa.Column("avg_rating", sa.Float, nullable=False),
        sa.Column("axes", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.CheckConstraint("channel IN ('amazon', 'shopify', 'tiktok', 'csv')", name="ck_competitors_channel"),
    )

    op.create_table(
        "reply_drafts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("review_id", UUID(as_uuid=True), sa.ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tone", sa.String(120), nullable=False),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("portal", sa.String(10), nullable=False),
        sa.Column("portal_url", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("portal IN ('amazon', 'shopify', 'tiktok')", name="ck_reply_drafts_portal"),
    )
    op.create_index("ix_reply_drafts_review_id", "reply_drafts", ["review_id"])


def downgrade() -> None:
    op.drop_table("reply_drafts")
    op.drop_table("competitors")
    op.drop_table("feedback_alerts")
    op.drop_table("keyword_stats")
    op.drop_table("analysis_jobs")
    op.drop_table("reviews")
    op.drop_table("theme_clusters")
    op.drop_table("datasets")
    op.drop_table("users")
    op.execute("DROP EXTENSION IF EXISTS vector")
