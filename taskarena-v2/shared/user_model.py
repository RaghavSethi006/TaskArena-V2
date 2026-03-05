from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.models_base import Base

if TYPE_CHECKING:
    from features.chatbot.models import ChatConversation
    from features.notes.models import Course
    from features.quiz.models import QuizAttempt
    from features.schedule.models import ScheduleEvent
    from features.tasks.models import Task, XPLog


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    xp: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_active: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    courses: Mapped[list["Course"]] = relationship(
        "Course", back_populates="user", cascade="all, delete-orphan"
    )
    tasks: Mapped[list["Task"]] = relationship(
        "Task", back_populates="user", cascade="all, delete-orphan"
    )
    schedule_events: Mapped[list["ScheduleEvent"]] = relationship(
        "ScheduleEvent", back_populates="user", cascade="all, delete-orphan"
    )
    chat_conversations: Mapped[list["ChatConversation"]] = relationship(
        "ChatConversation", back_populates="user", cascade="all, delete-orphan"
    )
    quiz_attempts: Mapped[list["QuizAttempt"]] = relationship(
        "QuizAttempt", back_populates="user", cascade="all, delete-orphan"
    )
    xp_logs: Mapped[list["XPLog"]] = relationship(
        "XPLog", back_populates="user", cascade="all, delete-orphan"
    )
