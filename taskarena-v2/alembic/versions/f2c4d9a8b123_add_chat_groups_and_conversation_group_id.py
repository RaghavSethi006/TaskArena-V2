"""add chat groups and conversation group_id

Revision ID: f2c4d9a8b123
Revises: e3f7b1c2a9d4
Create Date: 2026-03-31 23:25:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f2c4d9a8b123"
down_revision: Union[str, Sequence[str], None] = "e3f7b1c2a9d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "chat_groups" not in inspector.get_table_names():
        op.create_table(
            "chat_groups",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column(
                "user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )

    columns = {column["name"] for column in inspector.get_columns("chat_conversations")}
    if "group_id" not in columns:
        op.add_column(
            "chat_conversations",
            sa.Column("group_id", sa.Integer(), nullable=True),
        )

    fk_names = {
        fk["name"]
        for fk in sa.inspect(bind).get_foreign_keys("chat_conversations")
        if fk.get("name")
    }
    if "fk_chat_conversations_group_id_chat_groups" not in fk_names:
        with op.batch_alter_table(
            "chat_conversations",
            recreate="always",
            partial_reordering=[
                (
                    "id",
                    "user_id",
                    "title",
                    "group_id",
                    "context_course_id",
                    "context_folder_id",
                    "context_file_id",
                    "created_at",
                    "updated_at",
                )
            ],
        ) as batch_op:
            batch_op.create_foreign_key(
                "fk_chat_conversations_group_id_chat_groups",
                "chat_groups",
                ["group_id"],
                ["id"],
                ondelete="SET NULL",
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("chat_conversations")}
    fk_names = {
        fk["name"]
        for fk in inspector.get_foreign_keys("chat_conversations")
        if fk.get("name")
    }

    if "group_id" in columns or "fk_chat_conversations_group_id_chat_groups" in fk_names:
        with op.batch_alter_table(
            "chat_conversations",
            recreate="always",
            partial_reordering=[
                (
                    "id",
                    "user_id",
                    "title",
                    "context_course_id",
                    "context_folder_id",
                    "context_file_id",
                    "created_at",
                    "updated_at",
                )
            ],
        ) as batch_op:
            if "fk_chat_conversations_group_id_chat_groups" in fk_names:
                batch_op.drop_constraint(
                    "fk_chat_conversations_group_id_chat_groups",
                    type_="foreignkey",
                )
            if "group_id" in columns:
                batch_op.drop_column("group_id")

    if "chat_groups" in inspector.get_table_names():
        op.drop_table("chat_groups")
