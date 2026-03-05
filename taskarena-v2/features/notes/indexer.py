from __future__ import annotations

import logging
import re
from datetime import datetime
from pathlib import Path

import numpy as np
import pdfplumber
from docx import Document
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session

from features.notes.models import Course, File, FileChunk, Folder
from shared.config import settings


LOGGER = logging.getLogger(__name__)


class Indexer:
    """
    Handles text extraction, chunking, embedding, and semantic search.
    Uses SciBERT (allenai/scibert_scivocab_uncased) for embeddings.
    Model is loaded once as a class-level singleton.
    """

    _model = None

    @classmethod
    def get_model(cls) -> SentenceTransformer:
        """Load model once, reuse on subsequent calls. Cache dir from settings."""
        if cls._model is None:
            cls._model = SentenceTransformer(
                settings.embedding_model,
                cache_folder=settings.embedding_cache_dir,
            )
        return cls._model

    def extract_text(self, file_path: str) -> str:
        """
        Extract plain text from a file.
        - .pdf  -> use pdfplumber, join all page text
        - .docx -> use python-docx, join all paragraph text
        - .txt / .md -> read directly with UTF-8
        - other -> raise ValueError(f"Unsupported file type: {suffix}")
        Strip excessive whitespace. Return empty string if extraction fails
        (log warning, don't crash).
        """
        path = Path(file_path)
        suffix = path.suffix.lower()
        raw_text = ""

        try:
            if suffix == ".pdf":
                with pdfplumber.open(path) as pdf:
                    raw_text = " ".join((page.extract_text() or "") for page in pdf.pages)
            elif suffix == ".docx":
                doc = Document(path)
                raw_text = " ".join(paragraph.text for paragraph in doc.paragraphs)
            elif suffix in {".txt", ".md"}:
                raw_text = path.read_text(encoding="utf-8")
            else:
                raise ValueError(f"Unsupported file type: {suffix}")
        except ValueError:
            raise
        except Exception as exc:
            LOGGER.warning("Failed to extract text from %s: %s", file_path, exc)
            return ""

        return re.sub(r"\s+", " ", raw_text).strip()

    def chunk_text(self, text: str, chunk_size: int = None, overlap: int = None) -> list[str]:
        """
        Split text into overlapping chunks by word count.
        chunk_size and overlap default to settings.chunk_size and settings.chunk_overlap.
        Filter out chunks shorter than 20 words.
        Return list of chunk strings.
        """
        if not text.strip():
            return []

        chunk_size = chunk_size if chunk_size is not None else settings.chunk_size
        overlap = overlap if overlap is not None else settings.chunk_overlap
        if chunk_size <= 0:
            raise ValueError("chunk_size must be > 0")
        if overlap < 0:
            raise ValueError("overlap must be >= 0")

        step = max(chunk_size - overlap, 1)
        words = text.split()
        chunks: list[str] = []

        for start in range(0, len(words), step):
            window = words[start : start + chunk_size]
            if len(window) < 20:
                continue
            chunks.append(" ".join(window))
            if start + chunk_size >= len(words):
                break
        return chunks

    def embed(self, texts: list[str]) -> np.ndarray:
        """
        Embed a list of texts using SciBERT.
        Returns numpy array of shape (n, embedding_dim), normalized (L2).
        """
        if not texts:
            return np.empty((0, 0), dtype=np.float32)

        vectors = self.get_model().encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return vectors.astype(np.float32)

    def embed_single(self, text: str) -> np.ndarray:
        """Embed a single text string. Returns 1D numpy array."""
        text = text.strip()
        if not text:
            return np.empty((0,), dtype=np.float32)
        return self.embed([text])[0]

    def index_file(self, file_id: int, db: Session) -> int:
        """
        Full indexing pipeline for one file.
        ALWAYS reads from file.path (the internal copy) — never from file.original_path.

        1. Load File record from DB
        2. Check file.path exists on disk — if not, raise FileNotFoundError with clear message
        3. extract_text(file.path)
        3. If text is empty, mark file.indexed=True with 0 chunks, return 0
        4. chunk_text(text)
        5. embed(chunks)
        6. Delete existing FileChunk records for this file_id
        7. Create new FileChunk for each chunk:
           - content = chunk text
           - chunk_index = position
           - embedding = embedding.astype(np.float32).tobytes()
        8. Set file.indexed = True, file.indexed_at = utcnow
        9. Commit
        Returns number of chunks created.
        """
        file_obj = db.get(File, file_id)
        if not file_obj:
            raise ValueError(f"File with id {file_id} not found")

        managed_path = Path(file_obj.path)
        if not managed_path.exists():
            raise FileNotFoundError(
                f"Managed copy for file {file_id} does not exist: {file_obj.path}"
            )

        text = self.extract_text(str(managed_path))
        db.query(FileChunk).filter(FileChunk.file_id == file_id).delete(synchronize_session=False)

        if not text:
            file_obj.indexed = True
            file_obj.indexed_at = datetime.utcnow()
            db.commit()
            return 0

        chunks = self.chunk_text(text)
        if not chunks:
            file_obj.indexed = True
            file_obj.indexed_at = datetime.utcnow()
            db.commit()
            return 0

        vectors = self.embed(chunks)

        for idx, (chunk_text, vector) in enumerate(zip(chunks, vectors)):
            db.add(
                FileChunk(
                    file_id=file_id,
                    content=chunk_text,
                    chunk_index=idx,
                    embedding=vector.astype(np.float32).tobytes(),
                )
            )

        file_obj.indexed = True
        file_obj.indexed_at = datetime.utcnow()
        db.commit()
        return len(chunks)

    def search(
        self,
        query: str,
        db: Session,
        course_id: int = None,
        folder_id: int = None,
        file_id: int = None,
        top_k: int = None,
    ) -> list[dict]:
        """
        Semantic search over all indexed chunks for a course.
        1. embed_single(query)
        2. Load all FileChunks for the course (join File->Folder->Course)
        3. For each chunk: load embedding from bytes, compute cosine similarity
        4. Sort by score descending, return top_k results
        Returns list of dicts: {chunk, file_name, score}
        top_k defaults to settings.rag_top_k
        Return [] if no chunks found (don't crash).
        """
        top_k = top_k if top_k is not None else settings.rag_top_k
        if top_k <= 0:
            return []

        query_vector = self.embed_single(query)
        if query_vector.size == 0:
            return []

        q = db.query(FileChunk).join(File).join(Folder).join(Course)

        # Apply the most specific filter available — file > folder > course
        if file_id is not None:
            q = q.filter(File.id == file_id)
        elif folder_id is not None:
            q = q.filter(Folder.id == folder_id)
        elif course_id is not None:
            q = q.filter(Course.id == course_id)
        else:
            # No context set — return empty, don't search everything
            return []

        chunks = q.all()
        if not chunks:
            return []

        scored: list[dict] = []
        for chunk in chunks:
            if not chunk.embedding:
                continue
            chunk_vector = np.frombuffer(chunk.embedding, dtype=np.float32)
            if chunk_vector.size != query_vector.size:
                continue

            score = self._cosine_similarity(query_vector, chunk_vector)
            scored.append(
                {
                    "chunk": chunk,
                    "file_name": chunk.file.name,
                    "file_id": chunk.file_id,
                    "score": score,
                    "chunk_index": chunk.chunk_index,
                }
            )

        scored.sort(key=lambda item: item["score"], reverse=True)
        return scored[:top_k]

    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Both vectors must already be L2-normalized. Return float(np.dot(a, b))."""
        return float(np.dot(a, b))
