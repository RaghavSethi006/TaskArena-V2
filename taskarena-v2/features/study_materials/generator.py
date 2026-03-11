from __future__ import annotations

import json
import re
from typing import Any

from sqlalchemy.orm import Session

from features.chatbot.ai_service import get_ai
from features.notes.indexer import Indexer


SYSTEM_PROMPT = """You are an expert academic study material generator.
Your output must be ONLY valid JSON with no markdown fences, no preamble, no explanation.
Always follow the exact schema requested."""


STUDY_NOTES_PROMPT = """You are given excerpts from a student's course notes below.
Generate structured study notes covering the key topics.

Source material:
{context}

Output ONLY this JSON (no markdown, no extra text):
{{
  "title": "Study Notes: <topic>",
  "sections": [
    {{
      "heading": "Section heading",
      "bullets": ["Key point 1", "Key point 2", "Key point 3"]
    }}
  ]
}}

Generate {n_items} sections. Each section must have 3-6 bullet points.
Difficulty level: {difficulty}"""


FORMULA_SHEET_PROMPT = """You are given excerpts from a student's course notes below.
Extract and organize formulas, equations, key terms, and definitions.

Source material:
{context}

Output ONLY this JSON (no markdown, no extra text):
{{
  "title": "Formula Sheet: <topic>",
  "entries": [
    {{
      "name": "Formula or term name",
      "formula": "The formula or definition",
      "explanation": "Plain-English explanation of what it means",
      "variables": [
        {{"symbol": "x", "meaning": "what x represents"}}
      ],
      "example": "A short worked example (optional, can be empty string)"
    }}
  ]
}}

Generate {n_items} entries. Difficulty level: {difficulty}"""


QA_PROMPT = """You are given excerpts from a student's course notes below.
Generate open-ended study questions with detailed model answers.

Source material:
{context}

Output ONLY this JSON (no markdown, no extra text):
{{
  "title": "Q&A: <topic>",
  "items": [
    {{
      "question": "A meaningful open-ended question",
      "short_answer": "1-2 sentence answer",
      "long_answer": "Detailed 3-6 sentence answer with reasoning and examples",
      "hints": ["Hint 1", "Hint 2"]
    }}
  ]
}}

Generate {n_items} Q&A pairs. Difficulty level: {difficulty}"""


PRACTICE_EXAM_PROMPT = """You are given excerpts from a student's course notes below.
Create a realistic practice exam.

Source material:
{context}

Output ONLY this JSON (no markdown, no extra text):
{{
  "title": "Practice Exam: <topic>",
  "duration_minutes": 90,
  "total_marks": 100,
  "sections": [
    {{
      "name": "Section A - Short Answer",
      "questions": [
        {{
          "number": 1,
          "question": "Question text",
          "marks": 5,
          "model_answer": "The expected answer"
        }}
      ]
    }},
    {{
      "name": "Section B - Long Answer",
      "questions": [
        {{
          "number": 1,
          "question": "Question text",
          "marks": 15,
          "model_answer": "Detailed expected answer"
        }}
      ]
    }}
  ]
}}

Generate a total of {n_items} questions spread across 2-3 sections. Difficulty: {difficulty}"""


PROMPTS: dict[str, str] = {
    "study_notes": STUDY_NOTES_PROMPT,
    "formula_sheet": FORMULA_SHEET_PROMPT,
    "qa": QA_PROMPT,
    "practice_exam": PRACTICE_EXAM_PROMPT,
}

SEARCH_QUERIES: dict[str, str] = {
    "study_notes": "key concepts definitions explanations",
    "formula_sheet": "formulas equations definitions terms variables",
    "qa": "important concepts questions principles applications",
    "practice_exam": "core topics key concepts methods analysis",
}


class StudyMaterialGenerator:
    def __init__(self) -> None:
        self.indexer = Indexer()

    async def generate(
        self,
        material_type: str,
        course_id: int,
        db: Session,
        n_items: int = 10,
        difficulty: str = "medium",
        folder_id: int | None = None,
        file_id: int | None = None,
        provider: str = "groq",
        progress_callback=None,
    ) -> dict[str, Any]:
        if material_type not in PROMPTS:
            raise ValueError(f"Unknown material type: {material_type}")

        if progress_callback:
            await progress_callback("Retrieving course content", 1, 4)

        query = SEARCH_QUERIES[material_type]
        chunks = self.indexer.search(
            query=query,
            course_id=course_id,
            folder_id=folder_id,
            file_id=file_id,
            top_k=25,
            db=db,
        )

        if not chunks:
            raise ValueError(
                "No indexed content found. Index your course files first."
            )

        context = "\n\n---\n\n".join(item["chunk"].content for item in chunks)

        if progress_callback:
            await progress_callback("Building prompt", 2, 4)

        template = PROMPTS[material_type]
        user_prompt = template.format(
            context=context,
            n_items=n_items,
            difficulty=difficulty,
        )

        if progress_callback:
            await progress_callback("Calling AI", 3, 4)

        model = "llama-3.3-70b-versatile" if provider == "groq" else None
        ai = get_ai(provider, model=model)
        raw = await ai.complete(
            messages=[{"role": "user", "content": user_prompt}],
            system=SYSTEM_PROMPT,
            max_tokens=4096,
        )

        if progress_callback:
            await progress_callback("Parsing response", 4, 4)

        parsed = self._parse(raw)
        return parsed

    def _parse(self, raw: str) -> dict[str, Any]:
        cleaned = raw.strip()
        cleaned = re.sub(r"^\s*```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```\s*$", "", cleaned)
        try:
            result = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise ValueError(f"AI returned invalid JSON: {exc}") from exc
        if not isinstance(result, dict):
            raise ValueError("AI response was not a JSON object")
        return result
