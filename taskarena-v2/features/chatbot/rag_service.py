from __future__ import annotations

import logging

from sqlalchemy.orm import Session

import features.chatbot.models  # noqa: F401
import features.notes.models  # noqa: F401
import features.quiz.models  # noqa: F401
import features.study_materials.models  # noqa: F401
import features.schedule.models  # noqa: F401
import features.tasks.models  # noqa: F401
import shared.user_model  # noqa: F401

LOGGER = logging.getLogger(__name__)


class RAGService:
    """
    Retrieves relevant context from indexed course files.
    Uses the Indexer from features.notes.indexer.
    """

    def __init__(self, db: Session):
        self.db = db
        from features.notes.indexer import Indexer

        self.indexer = Indexer()

    def get_context(
        self,
        query: str,
        course_id: int = None,
        folder_id: int = None,
        file_id: int = None,
        top_k: int = None,
    ) -> str:
        """
        Search for relevant chunks. Format as context string.
        Format:
            [Source 1: Lecture Notes Week 2.pdf]
            ...chunk content...

            ---

            [Source 2: Chapter 3 Textbook.pdf]
            ...chunk content...

        Return empty string if no results or course_id is None.
        """
        if course_id is None and folder_id is None and file_id is None:
            return ""

        LOGGER.debug(
            "RAG get_context called: query=%r course_id=%s folder_id=%s file_id=%s",
            query[:60], course_id, folder_id, file_id,
        )

        results = self.indexer.search(
            query=query,
            db=self.db,
            course_id=course_id,
            folder_id=folder_id,
            file_id=file_id,
            top_k=top_k,
        )
        if not results:
            return ""

        parts: list[str] = []
        for index, item in enumerate(results, start=1):
            chunk = item.get("chunk")
            if chunk is None:
                continue
            file_name = item.get("file_name") or chunk.file.name
            content = chunk.content
            parts.append(f"[Source {index}: {file_name}]\n{content}")

        return "\n\n---\n\n".join(parts)

    def get_sources(
        self,
        query: str,
        course_id: int = None,
        folder_id: int = None,
        file_id: int = None,
        top_k: int = None,
    ) -> list[str]:
        """
        Return unique list of source file names for the top results.
        Return [] if course_id is None or no results.
        """
        if course_id is None and folder_id is None and file_id is None:
            return []

        LOGGER.debug(
            "RAG get_sources called: query=%r course_id=%s folder_id=%s file_id=%s",
            query[:60], course_id, folder_id, file_id,
        )

        try:
            results = self.indexer.search(
                query=query,
                db=self.db,
                course_id=course_id,
                folder_id=folder_id,
                file_id=file_id,
                top_k=top_k,
            )
        except Exception as exc:
            LOGGER.error(
                "RAG source lookup failed (course_id=%s folder_id=%s file_id=%s): %s",
                course_id, folder_id, file_id, exc,
                exc_info=True,
            )
            return []
        if not results:
            return []

        seen: list[str] = []
        for item in results:
            file_name = item.get("file_name")
            if file_name and file_name not in seen:
                seen.append(file_name)
        return seen
