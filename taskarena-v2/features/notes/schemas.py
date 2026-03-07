from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class CourseCreate(BaseModel):
    name: str
    code: Optional[str] = None
    color: str = "#3b82f6"


class CourseUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    color: Optional[str] = None


class CourseOut(BaseModel):
    id: int
    user_id: int
    name: str
    code: Optional[str]
    color: str
    created_at: datetime
    folder_count: int = 0
    file_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class FolderCreate(BaseModel):
    name: str


class FolderOut(BaseModel):
    id: int
    course_id: int
    name: str
    order_index: int

    model_config = ConfigDict(from_attributes=True)


class FileOut(BaseModel):
    id: int
    folder_id: int
    name: str
    path: str
    original_path: Optional[str]
    size: Optional[int]
    indexed: bool
    indexed_at: Optional[datetime]
    chunk_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class SearchResult(BaseModel):
    chunk_content: str
    file_name: str
    file_id: int
    score: float

    model_config = ConfigDict(from_attributes=True)
