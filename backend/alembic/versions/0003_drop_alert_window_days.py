"""Drop the unused feedback_alerts.window_days column.

The column held `ALERT_WINDOW_DAYS`, a configuration constant, and the UI
rendered it as "Detected in the last 14 days" — a claim the data never
supported: an alert's share is computed over the whole upload, not a rolling
time window. The label was removed when the fake copy was cleaned up, which
left a column that was written on every alert, returned by the API, carried
through the TypeScript types, and read by nothing.

Storing a constant per row is not a time window. Dropping it.

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-27

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("feedback_alerts", "window_days")


def downgrade() -> None:
    op.add_column(
        "feedback_alerts",
        sa.Column(
            "window_days", sa.Integer(), nullable=False, server_default=sa.text("14")
        ),
    )
