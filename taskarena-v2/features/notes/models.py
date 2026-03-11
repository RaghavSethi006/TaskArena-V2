from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.models_base import Base

if TYPE_CHECKING:
    from features.chatbot.models import ChatConversation
    from features.quiz.models import Quiz
    from features.schedule.models import ScheduleEvent
    from features.study_materials.models import StudyMaterial
    from features.tasks.models import Task
    from shared.user_model import User


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    color: Mapped[str] = mapped_column(String(32), default="#3b82f6", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="courses")
    folders: Mapped[list["Folder"]] = relationship(
        "Folder", back_populates="course", cascade="all, delete-orphan"
    )
    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="course")
    schedule_events: Mapped[list["ScheduleEvent"]] = relationship(
        "ScheduleEvent", back_populates="course"
    )
    chat_conversations: Mapped[list["ChatConversation"]] = relationship(
        "ChatConversation", back_populates="context_course"
    )
    quizzes: Mapped[list["Quiz"]] = relationship("Quiz", back_populates="course")
    study_materials: Mapped[list["StudyMaterial"]] = relationship(
        "StudyMaterial", back_populates="course", cascade="all, delete-orphan"
    )


class Folder(Base):
    __tablename__ = "folders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    course: Mapped["Course"] = relationship("Course", back_populates="folders")
    files: Mapped[list["File"]] = relationship(
        "File", back_populates="folder", cascade="all, delete-orphan"
    )


class File(Base):
    __tablename__ = "files"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    folder_id: Mapped[int] = mapped_column(
        ForeignKey("folders.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    path: Mapped[str] = mapped_column(String(1024), nullable=False)
    original_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    indexed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    indexed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    folder: Mapped["Folder"] = relationship("Folder", back_populates="files")
    chunks: Mapped[list["FileChunk"]] = relationship(
        "FileChunk", back_populates="file", cascade="all, delete-orphan"
    )


class FileChunk(Base):
    __tablename__ = "file_chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    file_id: Mapped[int] = mapped_column(
        ForeignKey("files.id", ondelete="CASCADE"),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    embedding: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)

    file: Mapped["File"] = relationship("File", back_populates="chunks")
