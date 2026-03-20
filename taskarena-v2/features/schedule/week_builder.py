from __future__ import annotations

import json
import re
from datetime import date, timedelta

from sqlalchemy.orm import Session, joinedload

from features.chatbot.ai_service import get_ai
from features.schedule.models import ScheduleEvent
from features.schedule.template_service import ScheduleTemplateService
from features.tasks.models import Task


BUILDER_SYSTEM = """You are a smart weekly schedule builder for a university student.
You receive their fixed weekly anchors (classes, gym, etc.), their study preferences,
their pending task deadlines, and any events already on the target week's calendar.

Your job is to fill the free gaps in their week intelligently:
- Schedule study blocks, assignment work, breaks, and free time
- NEVER overlap with anchor events or already-existing events
- Respect the student's preferred study block length
- Spread work for a single course across multiple days - no marathon sessions
- Prioritise by deadline urgency: due in <3 days = top priority
- Protect the requested amount of free time each day
- Don't schedule study after the student's sleep time or before wake time
- Add a short break (15-30 min) between consecutive study blocks
- Label blocks clearly: "Study: COMP2400", "Work on: Lab Report", "Free Time", "Break"

Output ONLY a valid JSON array - no prose, no markdown fences.
Each element: { "title", "date" (YYYY-MM-DD), "start_time" (HH:MM),
                "duration" (minutes), "type" (study|break|other), "course_id" (int or null) }
"""


BUILDER_USER = """Target week: {week_start} (Monday) to {week_end} (Sunday).
Today is {today}.

== WEEKLY ANCHOR EVENTS (FIXED - never touch these) ==
{anchors}

== STUDENT PREFERENCES ==
Wake: {wake_time}  Sleep: {sleep_time}
Daily study goal: {daily_study_hours}h
Preferred block length: {study_block_minutes} min
Preferred study time: {preferred_study_time}
Free time to protect per day: {free_time_minutes} min
Study days: {study_days}
Student notes: {notes}

== PENDING TASKS (prioritise by urgency) ==
{tasks}

== ALREADY PLACED EVENTS THIS WEEK ==
{existing}

Now generate the study blocks, assignment work sessions, breaks, and free time
to complete this student's week. Output ONLY the JSON array.
"""


class WeekBuilder:
    """Generates a full week schedule from template + tasks + preferences."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.template_svc = ScheduleTemplateService(db)

    async def generate(
        self,
        user_id: int,
        week_start: date,
        provider: str = "groq",
        progress_callback=None,
    ) -> list[dict]:
        """
        Full pipeline. Returns list of generated event dicts.
        progress_callback(step: str, n: int, total: int) called at each stage.
        """
        total = 4

        if progress_callback:
            await progress_callback("Loading your weekly template...", 1, total)
        context = self.template_svc.build_template_context(user_id)

        if progress_callback:
            await progress_callback("Checking upcoming deadlines...", 2, total)
        tasks = self._get_tasks(user_id, week_start)
        existing = self._get_existing_events(user_id, week_start)

        if progress_callback:
            await progress_callback("Building your schedule...", 3, total)

        week_end = week_start + timedelta(days=6)
        prompt = BUILDER_USER.format(
            week_start=week_start.isoformat(),
            week_end=week_end.isoformat(),
            today=date.today().isoformat(),
            anchors=self._format_anchors(context["slots"], week_start),
            wake_time=context["preferences"]["wake_time"],
            sleep_time=context["preferences"]["sleep_time"],
            daily_study_hours=context["preferences"]["daily_study_hours"],
            study_block_minutes=context["preferences"]["study_block_minutes"],
            preferred_study_time=context["preferences"]["preferred_study_time"],
            free_time_minutes=context["preferences"]["free_time_minutes"],
            study_days=context["preferences"]["study_days"],
            notes=context["preferences"]["notes"] or "None",
            tasks=self._format_tasks(tasks),
            existing=self._format_existing(existing),
        )

        if progress_callback:
            await progress_callback("Asking AI to fill your week...", 4, total)

        try:
            model = "llama-3.3-70b-versatile" if provider == "groq" else None
            ai = get_ai(provider, model=model)
            raw = await ai.complete(
                messages=[{"role": "user", "content": prompt}],
                system=BUILDER_SYSTEM,
                max_tokens=3000,
            )
        except Exception as exc:
            raise RuntimeError(f"AI generation failed: {exc}") from exc

        return self._parse(raw)

    def _get_tasks(self, user_id: int, week_start: date) -> list:
        cutoff = week_start + timedelta(days=21)
        today = date.today()
        return (
            self.db.query(Task)
            .options(joinedload(Task.course))
            .filter(
                Task.user_id == user_id,
                Task.status == "pending",
                Task.deadline.is_not(None),
                Task.deadline >= today,
                Task.deadline <= cutoff,
            )
            .order_by(Task.deadline.asc())
            .all()
        )

    def _get_existing_events(self, user_id: int, week_start: date) -> list:
        week_end = week_start + timedelta(days=6)
        return (
            self.db.query(ScheduleEvent)
            .filter(
                ScheduleEvent.user_id == user_id,
                ScheduleEvent.date >= week_start,
                ScheduleEvent.date <= week_end,
            )
            .order_by(ScheduleEvent.date, ScheduleEvent.start_time)
            .all()
        )

    def _format_anchors(self, slots: list[dict], week_start: date) -> str:
        if not slots:
            return "None set."
        lines: list[str] = []
        for slot in slots:
            day_names = [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
            ]
            dow = day_names.index(slot["day"])
            actual_date = week_start + timedelta(days=dow)
            lines.append(
                f"  {actual_date.isoformat()} ({slot['day']}) "
                f"{slot['start_time']}-{slot['end_time']}: "
                f"{slot['title']} [{slot['category']}]"
            )
        return "\n".join(lines)

    def _format_tasks(self, tasks: list) -> str:
        if not tasks:
            return "No pending tasks with upcoming deadlines."
        lines: list[str] = []
        for task in tasks:
            subject = (
                task.subject
                or (task.course.name if getattr(task, "course", None) else "No subject")
            )
            days_left = (task.deadline - date.today()).days
            urgency = "urgent" if days_left <= 2 else "soon" if days_left <= 5 else "upcoming"
            lines.append(
                f"  [{urgency}] {task.title} ({subject}) - due {task.deadline.isoformat()} "
                f"({days_left} days) [course_id={task.course_id}]"
            )
        return "\n".join(lines)

    def _format_existing(self, events: list) -> str:
        if not events:
            return "None."
        lines: list[str] = []
        for event in events:
            start_time = event.start_time.strftime("%H:%M") if event.start_time else "TBD"
            lines.append(
                f"  {event.date} {start_time}: {event.title} ({event.duration or 60}min)"
            )
        return "\n".join(lines)

    def _parse(self, raw: str) -> list[dict]:
        cleaned = raw.strip()
        cleaned = re.sub(r"^\s*```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```\s*$", "", cleaned)
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            return []
        if isinstance(parsed, list):
            return [event for event in parsed if isinstance(event, dict)]
        if isinstance(parsed, dict):
            for key in ("events", "schedule", "suggestions", "blocks"):
                if key in parsed and isinstance(parsed[key], list):
                    return [event for event in parsed[key] if isinstance(event, dict)]
        return []
