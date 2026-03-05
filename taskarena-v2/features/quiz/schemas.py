from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


class QuizCreate(BaseModel):
    title: str
    course_id: int
    difficulty: Literal["easy", "medium", "hard"]


class QuizOut(BaseModel):
    id: int
    title: str
    course_id: int
    difficulty: Literal["easy", "medium", "hard"]
    created_at: datetime
    question_count: int
    best_score: Optional[float]
    attempt_count: int

    model_config = ConfigDict(from_attributes=True)


class QuestionOut(BaseModel):
    id: int
    quiz_id: int
    question: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct: Literal["a", "b", "c", "d"]
    explanation: Optional[str]
    order_index: Optional[int]

    model_config = ConfigDict(from_attributes=True)


class AttemptCreate(BaseModel):
    answers: dict[int, str]
    time_taken: int


class QuestionResult(BaseModel):
    question_id: int
    correct: bool
    chosen: str
    answer: str
    explanation: str


class AttemptResult(BaseModel):
    score: float
    correct: int
    total: int
    xp_earned: int
    results: list[QuestionResult]
