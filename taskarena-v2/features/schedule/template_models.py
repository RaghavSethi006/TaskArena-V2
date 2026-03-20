from __future__ import annotations

from datetime import datetime, time
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.models_base import Base

if TYPE_CHECKING:
    from features.notes.models import Course
    from shared.user_model import User


class WeeklyTemplateSlot(Base):
    """One recurring anchor event in the user's weekly template."""

    __tablename__ = "weekly_template_slots"
    __table_args__ = (
        CheckConstraint(
            "category IN ('class','lab','gym','extracurricular','personal','sleep','other')",
            name="ck_template_slots_category",
        ),
        CheckConstraint(
            "day_of_week >= 0 AND day_of_week <= 6",
            name="ck_template_slots_day",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    # 0=Monday ... 6=Sunday
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(String(30), nullable=False, default="other")
    course_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("courses.id", ondelete="SET NULL"), nullable=True
    )
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#3b82f6")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    course: Mapped["Course | None"] = relationship("Course", foreign_keys=[course_id])


class SchedulePreferences(Base):
    """One row per user - their scheduling preferences and goals."""

    __tablename__ = "schedule_preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    wake_time: Mapped[time] = mapped_column(Time, nullable=False, default=time(7, 0))
    sleep_time: Mapped[time] = mapped_column(Time, nullable=False, default=time(23, 0))
    # How many hours to study per day total
    daily_study_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    # Preferred study block length in minutes
    study_block_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=90)
    # "morning" | "afternoon" | "evening" | "any"
    preferred_study_time: Mapped[str] = mapped_column(
        String(20), nullable=False, default="any"
    )
    # Minutes of free time to protect per day
    free_time_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=120)
    # Comma-separated days to study e.g. "mon,tue,wed,thu,fri"
    study_days: Mapped[str] = mapped_column(
        String(50), nullable=False, default="mon,tue,wed,thu,fri"
    )
    # Freetext notes for the AI e.g. "I can't focus after 9pm"
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
