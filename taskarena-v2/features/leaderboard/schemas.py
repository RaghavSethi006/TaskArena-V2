from typing import Optional

from pydantic import BaseModel


class RankingEntry(BaseModel):
    rank: int
    user_id: int
    name: str
    level: int
    xp: int
    tasks_completed: int
    streak: int
    weekly_xp: int


class UserStats(BaseModel):
    rank: int
    name: str
    level: int
    xp: int
    tasks_completed: int
    streak: int
    quizzes_taken: int
    avg_quiz_score: Optional[float]
    weekly_xp: int
