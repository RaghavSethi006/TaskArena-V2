from datetime import date
from typing import Optional

from pydantic import BaseModel


class OverviewStats(BaseModel):
    tasks_completed: int
    tasks_pending: int
    tasks_total: int
    completion_rate: float
    total_xp: int
    current_streak: int
    longest_streak: int
    quizzes_taken: int
    avg_quiz_score: Optional[float]
    best_quiz_score: Optional[float]
    rank: int
    level: int
    xp_this_week: int
    tasks_this_week: int


class DailyActivity(BaseModel):
    date: date
    tasks_completed: int
    xp_earned: int


class TaskBreakdown(BaseModel):
    by_type: dict[str, dict]
    by_status: dict[str, int]
