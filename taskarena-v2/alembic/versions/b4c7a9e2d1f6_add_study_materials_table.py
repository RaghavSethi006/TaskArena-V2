"""add study_materials table

Revision ID: b4c7a9e2d1f6
Revises: 7c77d0590ab7
Create Date: 2026-03-11 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "b4c7a9e2d1f6"
down_revision = "7c77d0590ab7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "study_materials",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("course_id", sa.Integer, sa.ForeignKey("courses.id"), nullable=False),
        sa.Column(
            "folder_id",
            sa.Integer,
            sa.ForeignKey("folders.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "file_id",
            sa.Integer,
            sa.ForeignKey("files.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.CheckConstraint(
            "type IN ('study_notes', 'formula_sheet', 'qa', 'practice_exam')",
            name="ck_study_materials_type",
        ),
    )


def downgrade() -> None:
    op.drop_table("study_materials")
