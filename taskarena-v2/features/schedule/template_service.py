from __future__ import annotations

from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from features.schedule.template_models import SchedulePreferences, WeeklyTemplateSlot
from features.schedule.template_schemas import (
    PreferencesOut,
    PreferencesUpdate,
    SlotCreate,
    SlotOut,
    SlotUpdate,
)


class ScheduleTemplateService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_slots(self, user_id: int) -> list[SlotOut]:
        slots = (
            self.db.query(WeeklyTemplateSlot)
            .filter(WeeklyTemplateSlot.user_id == user_id)
            .order_by(WeeklyTemplateSlot.day_of_week, WeeklyTemplateSlot.start_time)
            .all()
        )
        return [SlotOut.model_validate(s) for s in slots]

    def create_slot(self, user_id: int, data: SlotCreate) -> SlotOut:
        if data.duration_minutes <= 0:
            raise ValueError("Duration must be greater than 0")
        slot = WeeklyTemplateSlot(user_id=user_id, **data.model_dump())
        self.db.add(slot)
        self.db.commit()
        self.db.refresh(slot)
        return SlotOut.model_validate(slot)

    def update_slot(self, slot_id: int, user_id: int, data: SlotUpdate) -> SlotOut:
        slot = self._get_slot(slot_id, user_id)
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(slot, field, value)
        self.db.commit()
        self.db.refresh(slot)
        return SlotOut.model_validate(slot)

    def delete_slot(self, slot_id: int, user_id: int) -> None:
        slot = self._get_slot(slot_id, user_id)
        self.db.delete(slot)
        self.db.commit()

    def _get_slot(self, slot_id: int, user_id: int) -> WeeklyTemplateSlot:
        slot = self.db.get(WeeklyTemplateSlot, slot_id)
        if not slot or slot.user_id != user_id:
            raise ValueError(f"Template slot {slot_id} not found")
        return slot

    def has_template(self, user_id: int) -> bool:
        return (
            self.db.query(WeeklyTemplateSlot)
            .filter(WeeklyTemplateSlot.user_id == user_id)
            .first()
        ) is not None

    def get_preferences(self, user_id: int) -> PreferencesOut:
        prefs = self._get_or_create_preferences(user_id)
        return PreferencesOut.model_validate(prefs)

    def update_preferences(self, user_id: int, data: PreferencesUpdate) -> PreferencesOut:
        prefs = self._get_or_create_preferences(user_id)
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(prefs, field, value)
        prefs.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(prefs)
        return PreferencesOut.model_validate(prefs)

    def _get_or_create_preferences(self, user_id: int) -> SchedulePreferences:
        prefs = (
            self.db.query(SchedulePreferences)
            .filter(SchedulePreferences.user_id == user_id)
            .first()
        )
        if not prefs:
            prefs = SchedulePreferences(user_id=user_id)
            self.db.add(prefs)
            self.db.commit()
            self.db.refresh(prefs)
        return prefs

    def build_template_context(self, user_id: int) -> dict:
        """
        Returns a dict with all data the AI needs to generate a week.
        Keeps the service layer clean - AI builder just calls this.
        """
        slots = (
            self.db.query(WeeklyTemplateSlot)
            .filter(WeeklyTemplateSlot.user_id == user_id)
            .order_by(WeeklyTemplateSlot.day_of_week, WeeklyTemplateSlot.start_time)
            .all()
        )
        prefs = self._get_or_create_preferences(user_id)

        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

        formatted_slots: list[dict] = []
        for slot in slots:
            formatted_slots.append(
                {
                    "title": slot.title,
                    "day": day_names[slot.day_of_week],
                    "start_time": slot.start_time.strftime("%H:%M"),
                    "end_time": (
                        datetime.combine(date.today(), slot.start_time)
                        + timedelta(minutes=slot.duration_minutes)
                    ).strftime("%H:%M"),
                    "duration_minutes": slot.duration_minutes,
                    "category": slot.category,
                    "course_id": slot.course_id,
                }
            )

        return {
            "slots": formatted_slots,
            "preferences": {
                "wake_time": prefs.wake_time.strftime("%H:%M"),
                "sleep_time": prefs.sleep_time.strftime("%H:%M"),
                "daily_study_hours": prefs.daily_study_hours,
                "study_block_minutes": prefs.study_block_minutes,
                "preferred_study_time": prefs.preferred_study_time,
                "free_time_minutes": prefs.free_time_minutes,
                "study_days": prefs.study_days,
                "notes": prefs.notes or "",
            },
        }
