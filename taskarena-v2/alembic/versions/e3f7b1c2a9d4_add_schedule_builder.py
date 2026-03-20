"""add schedule builder tables

Revision ID: e3f7b1c2a9d4
Revises: b4c7a9e2d1f6
Create Date: 2026-03-20 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "e3f7b1c2a9d4"
down_revision = "b4c7a9e2d1f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "weekly_template_slots",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("day_of_week", sa.Integer, nullable=False),
        sa.Column("start_time", sa.Time, nullable=False),
        sa.Column("duration_minutes", sa.Integer, nullable=False),
        sa.Column("category", sa.String(30), nullable=False, server_default="other"),
        sa.Column(
            "course_id",
            sa.Integer,
            sa.ForeignKey("courses.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("color", sa.String(20), nullable=False, server_default="#3b82f6"),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.CheckConstraint(
            "category IN ('class','lab','gym','extracurricular','personal','sleep','other')",
            name="ck_template_slots_category",
        ),
        sa.CheckConstraint(
            "day_of_week >= 0 AND day_of_week <= 6",
            name="ck_template_slots_day",
        ),
    )

    op.create_table(
        "schedule_preferences",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("wake_time", sa.Time, nullable=False),
        sa.Column("sleep_time", sa.Time, nullable=False),
        sa.Column("daily_study_hours", sa.Integer, nullable=False, server_default="4"),
        sa.Column("study_block_minutes", sa.Integer, nullable=False, server_default="90"),
        sa.Column(
            "preferred_study_time",
            sa.String(20),
            nullable=False,
            server_default="any",
        ),
        sa.Column("free_time_minutes", sa.Integer, nullable=False, server_default="120"),
        sa.Column(
            "study_days",
            sa.String(50),
            nullable=False,
            server_default="mon,tue,wed,thu,fri",
        ),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("schedule_preferences")
    op.drop_table("weekly_template_slots")
