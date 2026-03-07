from __future__ import annotations

import re
import shutil
from pathlib import Path

from sqlalchemy import func
from sqlalchemy.orm import Session

import features.chatbot.models  # noqa: F401
import features.quiz.models  # noqa: F401
import features.schedule.models  # noqa: F401
import features.tasks.models  # noqa: F401
import shared.user_model  # noqa: F401
from features.notes.indexer import Indexer
from features.notes.models import Course, File, FileChunk, Folder
from features.notes.schemas import CourseCreate, CourseUpdate
from shared.config import settings


class NotesService:
    def __init__(self, db: Session):
        self.db = db
        self.indexer = Indexer()

    # -- Courses --
    def get_courses(self, user_id: int) -> list[Course]:
        courses = (
            self.db.query(Course)
            .filter(Course.user_id == user_id)
            .order_by(Course.name.asc(), Course.id.asc())
            .all()
        )
        if not courses:
            return courses

        course_ids = [course.id for course in courses]

        folder_rows = (
            self.db.query(
                Folder.course_id.label("course_id"),
                func.count(Folder.id).label("cnt"),
            )
            .filter(Folder.course_id.in_(course_ids))
            .group_by(Folder.course_id)
            .all()
        )
        folder_counts = {row.course_id: int(row.cnt) for row in folder_rows}

        file_rows = (
            self.db.query(
                Folder.course_id.label("course_id"),
                func.count(File.id).label("cnt"),
            )
            .join(File, File.folder_id == Folder.id)
            .filter(Folder.course_id.in_(course_ids))
            .group_by(Folder.course_id)
            .all()
        )
        file_counts = {row.course_id: int(row.cnt) for row in file_rows}

        for course in courses:
            course.folder_count = folder_counts.get(course.id, 0)
            course.file_count = file_counts.get(course.id, 0)

        return courses

    def get_course(self, course_id: int) -> Course:
        course = self.db.get(Course, course_id)
        if not course:
            raise ValueError(f"Course with id {course_id} not found")
        return course

    def create_course(self, user_id: int, data: CourseCreate) -> Course:
        course = Course(
            user_id=user_id,
            name=data.name,
            code=data.code,
            color=data.color,
        )
        self.db.add(course)
        self.db.commit()
        self.db.refresh(course)
        return course

    def update_course(self, course_id: int, data: CourseUpdate) -> Course:
        course = self.get_course(course_id)
        updates = data.model_dump(exclude_none=True)
        for field_name, value in updates.items():
            setattr(course, field_name, value)
        self.db.commit()
        self.db.refresh(course)
        return course

    def delete_course(self, course_id: int) -> None:
        course = self.get_course(course_id)
        self.db.delete(course)
        self.db.commit()

    # -- Folders --
    def get_folders(self, course_id: int) -> list[Folder]:
        self.get_course(course_id)
        return (
            self.db.query(Folder)
            .filter(Folder.course_id == course_id)
            .order_by(Folder.order_index.asc(), Folder.id.asc())
            .all()
        )

    def create_folder(self, course_id: int, name: str) -> Folder:
        self.get_course(course_id)
        max_index = (
            self.db.query(func.max(Folder.order_index))
            .filter(Folder.course_id == course_id)
            .scalar()
        )
        order_index = (max_index if max_index is not None else -1) + 1

        folder = Folder(course_id=course_id, name=name, order_index=order_index)
        self.db.add(folder)
        self.db.commit()
        self.db.refresh(folder)
        return folder

    def delete_folder(self, folder_id: int) -> None:
        folder = self.get_folder(folder_id)
        self.db.delete(folder)
        self.db.commit()

    # -- Files --
    def get_files(self, folder_id: int) -> list[File]:
        self.get_folder(folder_id)
        files = (
            self.db.query(File)
            .filter(File.folder_id == folder_id)
            .order_by(File.created_at.asc(), File.id.asc())
            .all()
        )
        if not files:
            return files

        file_ids = [file_obj.id for file_obj in files]
        chunk_rows = (
            self.db.query(
                FileChunk.file_id.label("file_id"),
                func.count(FileChunk.id).label("cnt"),
            )
            .filter(FileChunk.file_id.in_(file_ids))
            .group_by(FileChunk.file_id)
            .all()
        )
        chunk_counts = {row.file_id: int(row.cnt) for row in chunk_rows}

        for file_obj in files:
            file_obj.chunk_count = chunk_counts.get(file_obj.id, 0)

        return files

    def add_file(self, folder_id: int, name: str, original_path: str) -> File:
        """
        Add a file to the library and copy it into managed storage.

        Steps:
        1. Validate original_path exists on disk (raise ValueError if not)
        2. Get file size in bytes from the original
        3. Create a File record with indexed=False to get an auto-assigned file_id
        4. Commit to get the id
        5. Build internal storage path: data/files/{course_id}/{folder_id}/{file_id}_{safe_name}
           - safe_name: lowercase, spaces->underscores, keep only [a-z0-9._-]
        6. Create the storage directory: Path(storage_path).parent.mkdir(parents=True, exist_ok=True)
        7. shutil.copy2(original_path, storage_path)
        8. Update file.path = str(storage_path)
        9. Update file.original_path = original_path
        10. Commit
        11. Return the File record

        If the copy fails (PermissionError, OSError):
            - Delete the DB record
            - Re-raise as RuntimeError with a clear message
        """
        folder = self.get_folder(folder_id)
        source = Path(original_path).expanduser()
        if not source.exists() or not source.is_file():
            raise ValueError(f"File path does not exist: {original_path}")

        resolved_source = source.resolve()
        display_name = name.strip() or source.name
        file_size = source.stat().st_size

        file_obj = File(
            folder_id=folder_id,
            name=display_name,
            path="__pending_copy__",
            original_path=str(resolved_source),
            size=file_size,
            indexed=False,
            indexed_at=None,
        )
        self.db.add(file_obj)
        self.db.commit()
        self.db.refresh(file_obj)

        storage_path: Path | None = None
        try:
            storage_name = display_name
            if Path(storage_name).suffix == "" and source.suffix:
                storage_name = f"{storage_name}{source.suffix}"

            storage_path = self._get_storage_path(
                file_id=file_obj.id,
                folder_id=folder_id,
                course_id=folder.course_id,
                original_name=storage_name,
            )
            storage_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(str(resolved_source), str(storage_path))

            file_obj.path = str(storage_path)
            file_obj.original_path = str(resolved_source)
            self.db.commit()
            self.db.refresh(file_obj)
            return file_obj
        except (PermissionError, OSError) as exc:
            self.db.rollback()
            if storage_path is not None:
                storage_path.unlink(missing_ok=True)

            stale = self.db.get(File, file_obj.id)
            if stale is not None:
                self.db.delete(stale)
                self.db.commit()

            raise RuntimeError(f"Failed to copy file into TaskArena managed storage: {exc}") from exc

    def remove_file(self, file_id: int) -> None:
        """
        Remove a file completely:
        1. Load File record (raise ValueError if not found)
        2. Delete the internal copy from disk: Path(file.path).unlink(missing_ok=True)
        3. Delete the DB record (FileChunks cascade automatically)
        4. Commit
        """
        file_obj = self.get_file(file_id)
        if file_obj.path:
            Path(file_obj.path).unlink(missing_ok=True)
        self.db.delete(file_obj)
        self.db.commit()

    def index_file(self, file_id: int) -> int:
        """
        Trigger indexing of a file's internal copy.
        Delegates to self.indexer.index_file(file_id, self.db).
        The indexer reads from file.path (the internal copy) — never from original_path.
        Returns chunk count.
        """
        self.get_file(file_id)
        count = self.indexer.index_file(file_id, self.db)
        file_obj = self.get_file(file_id)
        file_obj.chunk_count = count
        return count

    def get_chunk_count(self, file_id: int) -> int:
        """Count FileChunk rows for this file."""
        self.get_file(file_id)
        return (
            self.db.query(func.count(FileChunk.id))
            .filter(FileChunk.file_id == file_id)
            .scalar()
            or 0
        )

    def _safe_filename(self, name: str) -> str:
        """
        Sanitize a filename for safe storage:
        - Lowercase
        - Replace spaces with underscores
        - Keep only: a-z 0-9 . _ -
        - Strip leading/trailing dots and underscores
        - If result is empty after sanitizing, return "file"
        """
        safe = name.lower().replace(" ", "_")
        safe = re.sub(r"[^a-z0-9._-]", "", safe)
        safe = safe.strip("._")
        if not safe:
            return "file"
        return safe

    def _get_storage_path(
        self, file_id: int, folder_id: int, course_id: int, original_name: str
    ) -> Path:
        """
        Build: ROOT / data / files / {course_id} / {folder_id} / {file_id}_{safe_name}
        ROOT = settings.root (the project root Path)
        safe_name = self._safe_filename(original_name)
        """
        safe_name = self._safe_filename(original_name)
        return (
            settings.root
            / "data"
            / "files"
            / str(course_id)
            / str(folder_id)
            / f"{file_id}_{safe_name}"
        )

    # -- Search --
    def search(
        self,
        query: str,
        course_id: int,
        folder_id: int = None,
        file_id: int = None,
        top_k: int = None,
    ) -> list[dict]:
        """Delegate to self.indexer.search(). Returns list of result dicts."""
        self.get_course(course_id)
        raw_results = self.indexer.search(
            query=query,
            course_id=course_id,
            folder_id=folder_id,
            file_id=file_id,
            db=self.db,
            top_k=top_k,
        )
        return [
            {
                "chunk_content": item["chunk"].content,
                "file_name": item["file_name"],
                "file_id": item["file_id"],
                "score": item["score"],
                "chunk_index": item["chunk_index"],
            }
            for item in raw_results
        ]

    def get_folder(self, folder_id: int) -> Folder:
        folder = self.db.get(Folder, folder_id)
        if not folder:
            raise ValueError(f"Folder with id {folder_id} not found")
        return folder

    def get_file(self, file_id: int) -> File:
        file_obj = self.db.get(File, file_id)
        if not file_obj:
            raise ValueError(f"File with id {file_id} not found")
        return file_obj
