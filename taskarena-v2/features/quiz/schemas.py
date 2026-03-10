import json
from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


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


class AttemptOut(BaseModel):
    id: int
    quiz_id: int
    user_id: int
    score: Optional[float]
    answers: dict[str, str] = Field(default_factory=dict)
    time_taken: Optional[int]
    taken_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("answers", mode="before")
    @classmethod
    def _deserialize_answers(cls, value: Any) -> dict[str, str]:
        if value is None:
            return {}
        if isinstance(value, dict):
            return {str(key): str(val) for key, val in value.items()}
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
            except json.JSONDecodeError:
                return {}
            if isinstance(parsed, dict):
                return {str(key): str(val) for key, val in parsed.items()}
        return {}


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
