from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ConversationCreate(BaseModel):
    title: str | None = None
    group_id: int | None = None
    context_course_id: int | None = None
    context_folder_id: int | None = None
    context_file_id: int | None = None


class ConversationUpdate(BaseModel):
    title: str | None = None
    group_id: int | None = None


class ConversationOut(BaseModel):
    id: int
    title: str | None
    group_id: int | None
    context_course_id: int | None
    context_folder_id: int | None
    context_file_id: int | None
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ChatGroupCreate(BaseModel):
    name: str


class ChatGroupUpdate(BaseModel):
    name: str


class ChatGroupOut(BaseModel):
    id: int
    name: str
    created_at: datetime
    updated_at: datetime
    conversation_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class MessageCreate(BaseModel):
    content: str
    provider: str = "groq"
    model: str | None = None


class MessageOut(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    sources: list[str] = Field(default_factory=list)
    model_used: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("sources", mode="before")
    @classmethod
    def _deserialize_sources(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(item) for item in value]
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
            except json.JSONDecodeError:
                return []
            if isinstance(parsed, list):
                return [str(item) for item in parsed]
        return []
