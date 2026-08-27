"""Real AI takeaway + in-app alert read state.

Two changes, both replacing something the UI used to fake:

  * `datasets.takeaway` — the dashboard's "AI takeaway" panel was hardcoded
    prose. It is now generated from the dataset's own themes during analysis
    and stored here.
  * `feedback_alerts.read_at` replaces `email_sent_to` — no email was ever
    sent; the column recorded who *would* have been notified and the UI
    rendered it as "Email sent to …". Alerts are delivered in-app, so what is
    worth persisting is whether the seller has read one.

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-27

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("datasets", sa.Column("takeaway", sa.Text(), nullable=True))
    op.add_column(
        "feedback_alerts",
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.drop_column("feedback_alerts", "email_sent_to")


def downgrade() -> None:
    op.add_column(
        "feedback_alerts",
        sa.Column("email_sent_to", sa.String(255), nullable=True),
    )
    op.drop_column("feedback_alerts", "read_at")
    op.drop_column("datasets", "takeaway")
