from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


class TaskCreate(BaseModel):
    title: str
    subject: Optional[str] = None
    type: Literal["assignment", "study", "productivity"]
    deadline: Optional[date] = None
    points: int = 5
    course_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    status: Optional[Literal["pending", "completed"]] = None
    deadline: Optional[date] = None
    points: Optional[int] = None


class TaskOut(BaseModel):
    id: int
    title: str
    subject: Optional[str]
    type: str
    status: str
    deadline: Optional[date]
    points: int
    course_id: Optional[int]
    created_at: datetime
    completed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class XPLogOut(BaseModel):
    id: int
    user_id: int
    amount: int
    reason: str
    logged_at: datetime

    model_config = ConfigDict(from_attributes=True)
