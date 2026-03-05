"""add context_folder_id and context_file_id to chat_conversations

Revision ID: 7c77d0590ab7
Revises: eafa87615537
Create Date: 2026-03-03 10:04:11.014962
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa



# revision identifiers, used by Alembic.
revision: str = '7c77d0590ab7'
down_revision: Union[str, Sequence[str], None] = 'eafa87615537'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("chat_conversations")}

    if "context_folder_id" not in columns:
        op.add_column(
            "chat_conversations",
            sa.Column("context_folder_id", sa.Integer(), nullable=True),
        )
    if "context_file_id" not in columns:
        op.add_column(
            "chat_conversations",
            sa.Column("context_file_id", sa.Integer(), nullable=True),
        )

    def fk_names() -> set[str]:
        current = sa.inspect(bind).get_foreign_keys("chat_conversations")
        return {fk["name"] for fk in current if fk.get("name")}

    if "fk_chat_conversations_context_folder_id_folders" not in fk_names():
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
            batch_op.create_foreign_key(
                "fk_chat_conversations_context_folder_id_folders",
                "folders",
                ["context_folder_id"],
                ["id"],
                ondelete="SET NULL",
            )

    if "fk_chat_conversations_context_file_id_files" not in fk_names():
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
            batch_op.create_foreign_key(
                "fk_chat_conversations_context_file_id_files",
                "files",
                ["context_file_id"],
                ["id"],
                ondelete="SET NULL",
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    fk_names = {
        fk["name"]
        for fk in inspector.get_foreign_keys("chat_conversations")
        if fk.get("name")
    }
    columns = {column["name"] for column in inspector.get_columns("chat_conversations")}

    with op.batch_alter_table(
        "chat_conversations",
        recreate="always",
        partial_reordering=[
            (
                "id",
                "user_id",
                "title",
                "context_course_id",
                "created_at",
                "updated_at",
            )
        ],
    ) as batch_op:
        if "fk_chat_conversations_context_file_id_files" in fk_names:
            batch_op.drop_constraint(
                "fk_chat_conversations_context_file_id_files",
                type_="foreignkey",
            )
        if "fk_chat_conversations_context_folder_id_folders" in fk_names:
            batch_op.drop_constraint(
                "fk_chat_conversations_context_folder_id_folders",
                type_="foreignkey",
            )
        if "context_file_id" in columns:
            batch_op.drop_column("context_file_id")
        if "context_folder_id" in columns:
            batch_op.drop_column("context_folder_id")
