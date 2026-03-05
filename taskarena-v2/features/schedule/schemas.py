from datetime import date, datetime, time
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


class EventCreate(BaseModel):
    title: str
    type: Literal["study", "assignment", "exam", "break", "other"]
    date: date
    start_time: Optional[time] = None
    duration: Optional[int] = None
    notes: Optional[str] = None
    course_id: Optional[int] = None


class EventUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[Literal["study", "assignment", "exam", "break", "other"]] = None
    date: Optional[date] = None
    start_time: Optional[time] = None
    duration: Optional[int] = None
    notes: Optional[str] = None
    course_id: Optional[int] = None


class EventOut(BaseModel):
    id: int
    user_id: int
    title: str
    type: str
    date: date
    start_time: Optional[time]
    duration: Optional[int]
    notes: Optional[str]
    course_id: Optional[int]
    ai_suggested: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SuggestionOut(BaseModel):
    title: str
    type: Literal["study", "assignment", "exam", "break", "other"]
    date: str
    start_time: str
    duration: int
    course: str
    reason: str
    priority: Literal["high", "medium", "low"]
