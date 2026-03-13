from __future__ import annotations

from datetime import date, datetime, time, timedelta

from sqlalchemy import case
from sqlalchemy.orm import Session

import features.chatbot.models  # noqa: F401
import features.notes.models  # noqa: F401
import features.quiz.models  # noqa: F401
import features.study_materials.models  # noqa: F401
import features.tasks.models  # noqa: F401
import shared.user_model  # noqa: F401
from features.schedule.ai_suggestions import ScheduleAI
from features.schedule.models import ScheduleEvent
from features.schedule.schemas import EventCreate, EventUpdate
from features.tasks.models import Task


AUTO_SYNC_NOTE_PREFIX = "Auto-synced from task #"


class ScheduleService:
    def __init__(self, db: Session):
        self.db = db
        self.ai = ScheduleAI()

    def get_events(self, user_id: int, date_from: date, date_to: date) -> list[ScheduleEvent]:
        """Return events for user between date_from and date_to inclusive, ordered by date + start_time."""
        return (
            self.db.query(ScheduleEvent)
            .filter(
                ScheduleEvent.user_id == user_id,
                ScheduleEvent.date >= date_from,
                ScheduleEvent.date <= date_to,
            )
            .order_by(
                ScheduleEvent.date.asc(),
                case((ScheduleEvent.start_time.is_(None), 1), else_=0),
                ScheduleEvent.start_time.asc(),
                ScheduleEvent.id.asc(),
            )
            .all()
        )

    def get_event(self, event_id: int) -> ScheduleEvent:
        """Raise ValueError if not found."""
        event = self.db.get(ScheduleEvent, event_id)
        if not event:
            raise ValueError(f"Schedule event with id {event_id} not found")
        return event

    def create_event(self, user_id: int, data: EventCreate) -> ScheduleEvent:
        if data.duration is not None and data.duration <= 0:
            raise ValueError("Duration must be greater than 0.")

        event = ScheduleEvent(
            user_id=user_id,
            title=data.title,
            type=data.type,
            date=data.date,
            start_time=data.start_time,
            duration=data.duration,
            notes=data.notes,
            course_id=data.course_id,
            ai_suggested=False,
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def update_event(self, event_id: int, data: EventUpdate) -> ScheduleEvent:
        event = self.get_event(event_id)
        updates = data.model_dump(exclude_none=True)

        if "date" in updates:
            raw_date = updates["date"]
            if isinstance(raw_date, str) and raw_date.strip():
                try:
                    updates["date"] = datetime.strptime(raw_date.split("T")[0], "%Y-%m-%d").date()
                except ValueError as exc:
                    raise ValueError("Date must be in YYYY-MM-DD format.") from exc
            elif raw_date is None or (isinstance(raw_date, str) and raw_date.strip() == ""):
                updates.pop("date", None)

        if "start_time" in updates:
            raw_time = updates["start_time"]
            if raw_time is None or (isinstance(raw_time, str) and raw_time.strip() == ""):
                updates["start_time"] = None
            elif isinstance(raw_time, str):
                try:
                    updates["start_time"] = datetime.strptime(raw_time, "%H:%M:%S").time()
                except ValueError:
                    try:
                        updates["start_time"] = datetime.strptime(raw_time, "%H:%M").time()
                    except ValueError as exc:
                        raise ValueError("Start time must be HH:MM or HH:MM:SS.") from exc

        if "duration" in updates and updates["duration"] is not None and updates["duration"] <= 0:
            raise ValueError("Duration must be greater than 0.")

        for field_name, value in updates.items():
            setattr(event, field_name, value)

        self.db.commit()
        self.db.refresh(event)
        return event

    def delete_event(self, event_id: int) -> None:
        event = self.get_event(event_id)
        linked_task_id = self._get_linked_task_id(event.notes)
        self.db.delete(event)
        if linked_task_id is not None:
            task = self.db.get(Task, linked_task_id)
            if task is not None and task.user_id == event.user_id:
                self.db.delete(task)
        self.db.commit()

    def get_week_events(self, user_id: int) -> list[ScheduleEvent]:
        """Return events for current week (Mon-Sun)."""
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        return self.get_events(user_id=user_id, date_from=week_start, date_to=week_end)

    def get_month_events(self, user_id: int, year: int, month: int) -> list[ScheduleEvent]:
        """Return all events for the given month."""
        if month < 1 or month > 12:
            raise ValueError("Month must be between 1 and 12.")
        month_start = date(year, month, 1)
        if month == 12:
            month_end = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(year, month + 1, 1) - timedelta(days=1)
        return self.get_events(user_id=user_id, date_from=month_start, date_to=month_end)

    async def get_ai_suggestions(self, user_id: int, provider: str = "groq") -> tuple[list[dict], str]:
        """Delegate to self.ai.generate_suggestions()."""
        return await self.ai.generate_suggestions(user_id=user_id, db=self.db, provider=provider)

    def accept_suggestion(
        self, user_id: int, suggestion: dict, course_id: int = None
    ) -> ScheduleEvent:
        """
        Convert a suggestion dict into a real ScheduleEvent.
        Set ai_suggested = True.
        Parse date string to date object, start_time string to time object.
        """
        title = str(suggestion.get("title", "")).strip() or "Study Block"
        event_type = str(suggestion.get("type", "study")).strip().lower() or "study"
        if event_type not in {"study", "assignment", "exam", "break", "other"}:
            event_type = "study"

        date_raw = str(suggestion.get("date", "")).strip()
        if not date_raw:
            raise ValueError("Suggestion is missing 'date'.")
        try:
            event_date = datetime.strptime(date_raw, "%Y-%m-%d").date()
        except ValueError as exc:
            raise ValueError(f"Invalid suggestion date: {date_raw}") from exc

        start_raw = str(suggestion.get("start_time", "")).strip()
        event_start: time | None = None
        if start_raw:
            try:
                event_start = datetime.strptime(start_raw, "%H:%M").time()
            except ValueError as exc:
                raise ValueError(f"Invalid suggestion start_time: {start_raw}") from exc

        duration_raw = suggestion.get("duration")
        event_duration: int | None = None
        if duration_raw is not None and str(duration_raw).strip() != "":
            try:
                event_duration = int(duration_raw)
            except (TypeError, ValueError) as exc:
                raise ValueError("Suggestion duration must be an integer.") from exc
            if event_duration <= 0:
                raise ValueError("Suggestion duration must be greater than 0.")

        notes = str(suggestion.get("reason", "")).strip() or None

        event = ScheduleEvent(
            user_id=user_id,
            title=title,
            type=event_type,
            date=event_date,
            start_time=event_start,
            duration=event_duration,
            notes=notes,
            course_id=course_id,
            ai_suggested=True,
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def _get_linked_task_id(self, notes: str | None) -> int | None:
        if not notes or not notes.startswith(AUTO_SYNC_NOTE_PREFIX):
            return None
        suffix = notes[len(AUTO_SYNC_NOTE_PREFIX) :].strip()
        if not suffix:
            return None
        task_id = suffix.split()[0]
        if not task_id.isdigit():
            return None
        return int(task_id)
