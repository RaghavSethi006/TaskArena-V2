from __future__ import annotations

import json
import re
from typing import Callable

from sqlalchemy.orm import Session

import features.chatbot.models  # noqa: F401
import features.notes.models  # noqa: F401
import features.quiz.models  # noqa: F401
import features.schedule.models  # noqa: F401
import features.tasks.models  # noqa: F401
import shared.user_model  # noqa: F401
from features.chatbot.ai_service import get_ai
from features.notes.models import File, FileChunk, Folder


QUIZ_SYSTEM_PROMPT = """You are an expert quiz generator for university-level students.
Your job is to create clear, well-formed multiple choice questions from study material.

Rules:
- Generate questions that test real understanding, not just memorization
- Base ALL questions on the provided study material only
- Make incorrect options plausible but clearly wrong upon reflection
- Write explanations that teach, not just state the answer
- Questions must be self-contained - do not reference "the passage" or "the text"
- Vary question types: definitions, applications, comparisons, cause-and-effect
- Output ONLY valid JSON - no markdown fences, no preamble, no extra text
"""


QUIZ_USER_PROMPT_TEMPLATE = """Study material:
{context}

Generate exactly {n_questions} multiple choice questions at {difficulty} difficulty level.

Difficulty guidance:
- easy: Basic recall of definitions, key terms, and straightforward facts
- medium: Conceptual understanding, comparing ideas, applying principles to simple scenarios
- hard: Deep analysis, synthesis across concepts, edge cases, multi-step reasoning

Output ONLY this JSON structure (no markdown, no extra text):
{{
  "title": "Brief descriptive quiz title based on the content",
  "questions": [
    {{
      "question": "The full question text",
      "options": {{
        "a": "First option",
        "b": "Second option",
        "c": "Third option",
        "d": "Fourth option"
      }},
      "correct": "a",
      "explanation": "Why this answer is correct and the others are not"
    }}
  ]
}}
"""


class QuizGenerator:
    """
    Generates MCQ quizzes from course notes using AI.
    Uses RAG to find relevant content, then prompts AI to generate questions.
    """

    def __init__(self):
        self.indexer = None
        self._indexer_error: Exception | None = None
        try:
            from features.notes.indexer import Indexer

            self.indexer = Indexer()
        except Exception as exc:  # pragma: no cover - environment-specific dependency import
            self._indexer_error = exc

    def get_context(
        self,
        course_id: int,
        folder_id: int = None,
        db: Session = None,
        n_chunks: int = 15,
    ) -> str:
        """
        Get study material context for quiz generation.
        If folder_id provided: only use chunks from files in that folder.
        Otherwise: use a broad sample from across the course.
        For broad sampling: load up to n_chunks evenly distributed chunks
        from all indexed files in the course (not similarity-based - we want coverage).
        Return formatted context string.
        """
        if db is None:
            raise ValueError("db Session is required")
        if n_chunks <= 0:
            return ""

        files_query = (
            db.query(File)
            .join(Folder)
            .filter(
                Folder.course_id == course_id,
                File.indexed.is_(True),
            )
            .order_by(File.id.asc())
        )
        if folder_id is not None:
            files_query = files_query.filter(Folder.id == folder_id)

        files = files_query.all()
        if not files:
            return ""

        chunks = (
            db.query(FileChunk)
            .join(File)
            .filter(File.id.in_([f.id for f in files]))
            .order_by(File.id.asc(), FileChunk.chunk_index.asc())
            .all()
        )
        if not chunks:
            return ""

        by_file: dict[int, list[FileChunk]] = {file_obj.id: [] for file_obj in files}
        for chunk in chunks:
            by_file.setdefault(chunk.file_id, []).append(chunk)

        non_empty_file_ids = [f.id for f in files if by_file.get(f.id)]
        if not non_empty_file_ids:
            return ""

        total_available = sum(len(by_file[file_id]) for file_id in non_empty_file_ids)
        target = min(n_chunks, total_available)

        allocations = {file_id: 0 for file_id in non_empty_file_ids}
        remaining = target
        while remaining > 0:
            progressed = False
            for file_id in non_empty_file_ids:
                if allocations[file_id] < len(by_file[file_id]) and remaining > 0:
                    allocations[file_id] += 1
                    remaining -= 1
                    progressed = True
            if not progressed:
                break

        selected_parts: list[str] = []
        source_idx = 1
        for file_id in non_empty_file_ids:
            file_chunks = by_file[file_id]
            take = allocations[file_id]
            if take <= 0:
                continue

            picked_indices = self._even_indices(len(file_chunks), take)
            for idx in picked_indices:
                chunk = file_chunks[idx]
                selected_parts.append(
                    f"[Source {source_idx}: {chunk.file.name}]\n{chunk.content}"
                )
                source_idx += 1

        return "\n\n---\n\n".join(selected_parts)

    def build_prompt(self, context: str, n_questions: int, difficulty: str) -> str:
        """
        Use the exact prompt template from docs/PROMPTS.md quiz generation section.
        Fill in {context}, {n_questions}, {difficulty}.
        Return the complete prompt string.
        """
        return QUIZ_USER_PROMPT_TEMPLATE.format(
            context=context,
            n_questions=n_questions,
            difficulty=difficulty,
        )

    def _parse_response(self, raw: str) -> dict:
        """
        Parse AI JSON response.
        Strip ```json ... ``` fences if present.
        Parse with json.loads.
        Validate structure: must have "questions" list with required fields.
        Raise ValueError with helpful message if structure is wrong.
        """
        cleaned = raw.strip()
        cleaned = re.sub(r"^\s*```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```\s*$", "", cleaned)

        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise ValueError(f"AI response was not valid JSON: {exc}") from exc

        if not isinstance(parsed, dict):
            raise ValueError("AI response must be a JSON object.")

        title = parsed.get("title", "Generated Quiz")
        if not isinstance(title, str) or not title.strip():
            title = "Generated Quiz"

        questions = parsed.get("questions")
        if not isinstance(questions, list):
            raise ValueError("AI response must include a 'questions' list.")
        if not questions:
            raise ValueError("AI returned an empty 'questions' list.")

        normalized_questions: list[dict] = []
        for idx, item in enumerate(questions, start=1):
            if not isinstance(item, dict):
                raise ValueError(f"Question {idx}: each item must be an object.")

            question_text = item.get("question")
            if not isinstance(question_text, str) or not question_text.strip():
                raise ValueError(f"Question {idx}: missing 'question' text.")

            options = item.get("options")
            if not isinstance(options, dict):
                raise ValueError(f"Question {idx}: missing 'options' object.")

            normalized_options: dict[str, str] = {}
            for letter in ("a", "b", "c", "d"):
                option_text = options.get(letter)
                if not isinstance(option_text, str) or not option_text.strip():
                    raise ValueError(f"Question {idx}: option '{letter}' is missing or empty.")
                normalized_options[letter] = option_text.strip()

            correct = str(item.get("correct", "")).strip().lower()
            if correct not in {"a", "b", "c", "d"}:
                raise ValueError(f"Question {idx}: 'correct' must be one of a/b/c/d.")

            explanation = item.get("explanation")
            if not isinstance(explanation, str) or not explanation.strip():
                raise ValueError(f"Question {idx}: missing 'explanation'.")

            normalized_questions.append(
                {
                    "question": question_text.strip(),
                    "options": normalized_options,
                    "correct": correct,
                    "explanation": explanation.strip(),
                }
            )

        return {"title": title.strip(), "questions": normalized_questions}

    async def generate(
        self,
        course_id: int,
        db: Session,
        n_questions: int = 10,
        difficulty: str = "medium",
        folder_id: int = None,
        provider: str = "groq",
        progress_callback: Callable[[str, int, int], None] = None,
    ) -> dict:
        """
        Full generation pipeline:
        1. progress_callback("Searching course materials", 1, 4)
        2. Get context via self.get_context()
        3. progress_callback("Building quiz prompt", 2, 4)
        4. Build prompt
        5. progress_callback("Generating questions with AI", 3, 4)
        6. Call ai.complete() with the prompt
           - Use system prompt from docs/PROMPTS.md
           - max_tokens = 3000
        7. progress_callback("Parsing response", 4, 4)
        8. Parse response
        9. Return dict: {title, questions: [{question, options, correct, explanation}]}

        Raise RuntimeError if context is empty (no indexed files).
        Raise ValueError if AI returns unparseable response after 2 retries.
        """
        if progress_callback:
            progress_callback("Searching course materials", 1, 4)

        context = self.get_context(
            course_id=course_id,
            folder_id=folder_id,
            db=db,
            n_chunks=15,
        )
        if not context.strip():
            raise RuntimeError(
                "No indexed files found for this selection. Index notes first, then try again."
            )

        if progress_callback:
            progress_callback("Building quiz prompt", 2, 4)
        prompt = self.build_prompt(context=context, n_questions=n_questions, difficulty=difficulty)

        if progress_callback:
            progress_callback("Generating questions with AI", 3, 4)

        model = "llama-3.3-70b-versatile" if provider == "groq" else None
        ai = get_ai(provider, model=model)

        last_parse_error: Exception | None = None
        for attempt in range(3):
            raw = await ai.complete(
                messages=[{"role": "user", "content": prompt}],
                system=QUIZ_SYSTEM_PROMPT,
                max_tokens=3000,
            )

            if progress_callback:
                progress_callback("Parsing response", 4, 4)
            try:
                return self._parse_response(raw)
            except ValueError as exc:
                last_parse_error = exc
                if attempt < 2:
                    continue

        raise ValueError(
            f"AI returned unparseable quiz JSON after 2 retries: {last_parse_error}"
        ) from last_parse_error

    def _even_indices(self, total_items: int, take: int) -> list[int]:
        if take <= 0 or total_items <= 0:
            return []
        if take >= total_items:
            return list(range(total_items))
        if take == 1:
            return [total_items // 2]

        selected: list[int] = []
        used: set[int] = set()
        for i in range(take):
            idx = round(i * (total_items - 1) / (take - 1))
            if idx in used:
                right = idx
                left = idx
                while right < total_items or left >= 0:
                    right += 1
                    if right < total_items and right not in used:
                        idx = right
                        break
                    left -= 1
                    if left >= 0 and left not in used:
                        idx = left
                        break
            selected.append(idx)
            used.add(idx)
        selected.sort()
        return selected
