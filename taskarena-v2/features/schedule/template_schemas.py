from __future__ import annotations

from datetime import datetime, time
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


SlotCategory = Literal[
    "class", "lab", "gym", "extracurricular", "personal", "sleep", "other"
]


class SlotCreate(BaseModel):
    title: str
    day_of_week: int  # 0=Mon ... 6=Sun
    start_time: time
    duration_minutes: int
    category: SlotCategory = "other"
    course_id: Optional[int] = None
    color: str = "#3b82f6"


class SlotUpdate(BaseModel):
    title: Optional[str] = None
    day_of_week: Optional[int] = None
    start_time: Optional[time] = None
    duration_minutes: Optional[int] = None
    category: Optional[SlotCategory] = None
    course_id: Optional[int] = None
    color: Optional[str] = None


class SlotOut(BaseModel):
    id: int
    user_id: int
    title: str
    day_of_week: int
    start_time: time
    duration_minutes: int
    category: str
    course_id: Optional[int]
    color: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PreferencesUpdate(BaseModel):
    wake_time: Optional[time] = None
    sleep_time: Optional[time] = None
    daily_study_hours: Optional[int] = None
    study_block_minutes: Optional[int] = None
    preferred_study_time: Optional[Literal["morning", "afternoon", "evening", "any"]] = None
    free_time_minutes: Optional[int] = None
    study_days: Optional[str] = None
    notes: Optional[str] = None


class PreferencesOut(BaseModel):
    id: int
    user_id: int
    wake_time: time
    sleep_time: time
    daily_study_hours: int
    study_block_minutes: int
    preferred_study_time: str
    free_time_minutes: int
    study_days: str
    notes: Optional[str]
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GenerateWeekRequest(BaseModel):
    # ISO date string for any day within the target week e.g. "2026-03-16"
    week_start: str
    provider: str = "groq"


class GeneratedEvent(BaseModel):
    title: str
    type: Literal["study", "assignment", "exam", "break", "other"]
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM
    duration: int  # minutes
    course_id: Optional[int] = None
    is_anchor: bool = False


class ApplyWeekRequest(BaseModel):
    events: list[GeneratedEvent]
