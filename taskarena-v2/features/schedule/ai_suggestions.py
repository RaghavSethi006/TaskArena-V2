from __future__ import annotations

import json
import re
from datetime import date, timedelta

from sqlalchemy import case
from sqlalchemy.orm import Session, joinedload

import features.chatbot.models  # noqa: F401
import features.notes.models  # noqa: F401
import features.quiz.models  # noqa: F401
import shared.user_model  # noqa: F401
from features.chatbot.ai_service import get_ai
from features.schedule.models import ScheduleEvent
from features.tasks.models import Task


SCHEDULE_SYSTEM_PROMPT = """You are an academic schedule optimizer for a student.
Analyze the student's upcoming deadlines and existing schedule,
then recommend focused study blocks that are realistic and high-impact.

Rules:
- Prioritize tasks due soonest
- Suggest blocks that don't conflict with existing events
- Keep study blocks 30-120 minutes (no marathon sessions)
- Suggest 3-5 blocks maximum - quality over quantity
- Each suggestion needs a clear reason grounded in the actual deadlines
- Output ONLY valid JSON
"""


SCHEDULE_USER_PROMPT_TEMPLATE = """Today is {today}.

Student's upcoming tasks and deadlines:
{tasks_list}

Already scheduled events this week:
{events_list}

Suggest study blocks for the next 7 days that will best prepare this student for their deadlines.

Output ONLY this JSON:
{{
  "suggestions": [
    {{
      "title": "Study: [specific topic]",
      "type": "study",
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM",
      "duration": 90,
      "course": "Course name",
      "reason": "Specific reason based on their actual deadlines",
      "priority": "high"
    }}
  ]
}}

Priority levels: "high" (due in 1-2 days), "medium" (due in 3-5 days), "low" (due in 6+ days)
"""


class ScheduleAI:
    """
    Analyzes task deadlines and existing schedule,
    generates study block suggestions via AI.
    """

    def analyze_workload(self, user_id: int, db: Session) -> list:
        """
        Load all pending tasks for user_id with a deadline set.
        Filter to tasks due within the next 14 days.
        Order by deadline ascending.
        Return list of Task objects.
        """
        today = date.today()
        cutoff = today + timedelta(days=14)
        return (
            db.query(Task)
            .options(joinedload(Task.course))
            .filter(
                Task.user_id == user_id,
                Task.status == "pending",
                Task.deadline.is_not(None),
                Task.deadline >= today,
                Task.deadline <= cutoff,
            )
            .order_by(Task.deadline.asc(), Task.id.asc())
            .all()
        )

    def get_existing_events(self, user_id: int, db: Session) -> list:
        """
        Load all schedule events for the next 7 days.
        Return list of ScheduleEvent objects.
        """
        today = date.today()
        week_end = today + timedelta(days=6)
        return (
            db.query(ScheduleEvent)
            .options(joinedload(ScheduleEvent.course))
            .filter(
                ScheduleEvent.user_id == user_id,
                ScheduleEvent.date >= today,
                ScheduleEvent.date <= week_end,
            )
            .order_by(
                ScheduleEvent.date.asc(),
                case((ScheduleEvent.start_time.is_(None), 1), else_=0),
                ScheduleEvent.start_time.asc(),
                ScheduleEvent.id.asc(),
            )
            .all()
        )

    def format_tasks_for_prompt(self, tasks: list) -> str:
        """
        Format tasks as a bulleted list for the AI prompt.
        Each line: "- {title} ({subject}) due {deadline} [{type}]"
        If no tasks: return "No upcoming deadlines."
        """
        if not tasks:
            return "No upcoming deadlines."
        lines: list[str] = []
        for task in tasks:
            subject = task.subject or (task.course.name if getattr(task, "course", None) else "No subject")
            deadline = task.deadline.isoformat() if task.deadline else "No deadline"
            lines.append(f"- {task.title} ({subject}) due {deadline} [{task.type}]")
        return "\n".join(lines)

    def format_events_for_prompt(self, events: list) -> str:
        """
        Format existing events for the prompt.
        Each line: "- {date} {start_time}: {title} ({duration}min)"
        If no events: return "No existing events scheduled."
        """
        if not events:
            return "No existing events scheduled."
        lines: list[str] = []
        for event in events:
            event_date = event.date.isoformat()
            start_time = event.start_time.strftime("%H:%M") if event.start_time else "TBD"
            duration = event.duration if event.duration is not None else 60
            lines.append(f"- {event_date} {start_time}: {event.title} ({duration}min)")
        return "\n".join(lines)

    async def generate_suggestions(
        self, user_id: int, db: Session, provider: str = "groq"
    ) -> tuple[list[dict], str]:
        """
        Full pipeline:
        1. analyze_workload -> tasks
        2. get_existing_events -> events
        3. Build prompt using templates from docs/PROMPTS.md
        4. Call ai.complete() with the prompt
        5. Parse JSON response -> list of suggestion dicts
        6. Return suggestions (empty list if no tasks or AI fails)

        Use try/except around JSON parsing.
        If AI returns malformed JSON, return [] and print a warning.
        today = date.today().strftime("%Y-%m-%d")
        """
        tasks = self.analyze_workload(user_id=user_id, db=db)
        if not tasks:
            return [], "No pending tasks with upcoming deadlines found. Add tasks with due dates to get suggestions."

        events = self.get_existing_events(user_id=user_id, db=db)
        today = date.today().strftime("%Y-%m-%d")
        prompt = SCHEDULE_USER_PROMPT_TEMPLATE.format(
            today=today,
            tasks_list=self.format_tasks_for_prompt(tasks),
            events_list=self.format_events_for_prompt(events),
        )

        try:
            model = "llama-3.3-70b-versatile" if provider == "groq" else None
            ai = get_ai(provider, model=model)
            raw = await ai.complete(
                messages=[{"role": "user", "content": prompt}],
                system=SCHEDULE_SYSTEM_PROMPT,
                max_tokens=1024,
            )
        except Exception as exc:
            print(f"Warning: AI suggestions failed ({exc}).")
            return [], f"AI provider error: {exc}"

        try:
            suggestions = self._parse_suggestions(raw)
        except Exception as exc:
            print(f"Warning: Failed to parse AI suggestions: {exc}")
            return [], "AI returned an unexpected response format. Try again."

        if not suggestions:
            print("Warning: AI returned malformed or empty suggestions JSON.")
            return [], "AI returned no suggestions. Try again or add more tasks with deadlines."
        return suggestions, ""

    def _parse_suggestions(self, raw: str) -> list[dict]:
        """
        Parse AI JSON response.
        Strip markdown fences if present (```json ... ```).
        Parse with json.loads.
        Return suggestions list from parsed["suggestions"].
        Return [] on any parse error.
        """
        try:
            cleaned = raw.strip()
            cleaned = re.sub(r"^\s*```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```\s*$", "", cleaned)
            parsed = json.loads(cleaned)
            suggestions = parsed.get("suggestions", []) if isinstance(parsed, dict) else []
            if not isinstance(suggestions, list):
                return []
            return [item for item in suggestions if isinstance(item, dict)]
        except Exception:
            return []
