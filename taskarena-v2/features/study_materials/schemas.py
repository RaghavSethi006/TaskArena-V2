import json
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, field_validator


MaterialType = Literal["study_notes", "formula_sheet", "qa", "practice_exam"]


class StudyMaterialCreate(BaseModel):
    course_id: int
    type: MaterialType
    folder_id: int | None = None
    file_id: int | None = None
    n_items: int = 10
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    provider: str = "groq"


class StudyMaterialOut(BaseModel):
    id: int
    course_id: int
    folder_id: int | None
    file_id: int | None
    type: MaterialType
    title: str
    content: Any
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("content", mode="before")
    @classmethod
    def _parse_content(cls, value: Any) -> Any:
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return {}
        return value
