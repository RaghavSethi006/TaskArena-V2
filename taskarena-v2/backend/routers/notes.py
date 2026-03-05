from typing import Optional

from fastapi import APIRouter, Depends, Query, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user_id, get_db
from features.notes.schemas import CourseCreate, CourseOut, FileOut, FolderOut, SearchResult
from features.notes.service import NotesService

router = APIRouter(prefix="/notes", tags=["notes"])


class FolderCreateBody(BaseModel):
    name: str


class FileAddBody(BaseModel):
    name: str
    path: str


@router.get("/courses", response_model=list[CourseOut])
def get_courses(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return NotesService(db).get_courses(user_id)


@router.post("/courses", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(
    body: CourseCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return NotesService(db).create_course(user_id=user_id, data=body)


@router.get("/courses/{course_id}", response_model=CourseOut)
def get_course(course_id: int, db: Session = Depends(get_db)):
    return NotesService(db).get_course(course_id)


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(course_id: int, db: Session = Depends(get_db)) -> Response:
    NotesService(db).delete_course(course_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/courses/{course_id}/folders", response_model=list[FolderOut])
def get_folders(course_id: int, db: Session = Depends(get_db)):
    return NotesService(db).get_folders(course_id)


@router.post("/courses/{course_id}/folders", response_model=FolderOut, status_code=status.HTTP_201_CREATED)
def create_folder(
    course_id: int,
    body: FolderCreateBody,
    db: Session = Depends(get_db),
):
    return NotesService(db).create_folder(course_id=course_id, name=body.name)


@router.delete("/folders/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(folder_id: int, db: Session = Depends(get_db)) -> Response:
    NotesService(db).delete_folder(folder_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/folders/{folder_id}/files", response_model=list[FileOut])
def get_files(folder_id: int, db: Session = Depends(get_db)):
    return NotesService(db).get_files(folder_id)


@router.post("/folders/{folder_id}/files", response_model=FileOut, status_code=status.HTTP_201_CREATED)
async def add_file(
    folder_id: int,
    body: FileAddBody,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    _ = user_id
    return NotesService(db).add_file(folder_id=folder_id, name=body.name, original_path=body.path)


@router.delete("/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_file(file_id: int, db: Session = Depends(get_db)) -> Response:
    NotesService(db).remove_file(file_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/files/{file_id}/index")
def index_file(file_id: int, db: Session = Depends(get_db)):
    svc = NotesService(db)
    chunks_created = svc.index_file(file_id)
    return {
        "file_id": file_id,
        "chunks_created": chunks_created,
    }


@router.get("/courses/{course_id}/search", response_model=list[SearchResult])
def search_course(
    course_id: int,
    q: str = Query(...),
    folder_id: Optional[int] = Query(None),
    file_id: Optional[int] = Query(None),
    top_k: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    return NotesService(db).search(
        query=q,
        course_id=course_id,
        folder_id=folder_id,
        file_id=file_id,
        top_k=top_k,
    )
