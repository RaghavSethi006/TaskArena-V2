from __future__ import annotations

import asyncio
import json
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user_id, get_db
from features.schedule.models import ScheduleEvent
from features.schedule.template_schemas import (
    ApplyWeekRequest,
    GenerateWeekRequest,
    PreferencesOut,
    PreferencesUpdate,
    SlotCreate,
    SlotOut,
    SlotUpdate,
)
from features.schedule.template_service import ScheduleTemplateService
from features.schedule.week_builder import WeekBuilder

router = APIRouter(prefix="/schedule/template", tags=["schedule-template"])


@router.get("/status")
def get_status(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Returns whether the user has a template set up yet."""
    svc = ScheduleTemplateService(db)
    return {
        "has_template": svc.has_template(user_id),
    }


@router.get("/slots", response_model=list[SlotOut])
def get_slots(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return ScheduleTemplateService(db).get_slots(user_id)


@router.post("/slots", response_model=SlotOut, status_code=status.HTTP_201_CREATED)
def create_slot(
    body: SlotCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return ScheduleTemplateService(db).create_slot(user_id, body)


@router.patch("/slots/{slot_id}", response_model=SlotOut)
def update_slot(
    slot_id: int,
    body: SlotUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return ScheduleTemplateService(db).update_slot(slot_id, user_id, body)


@router.delete("/slots/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> Response:
    ScheduleTemplateService(db).delete_slot(slot_id, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/preferences", response_model=PreferencesOut)
def get_preferences(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return ScheduleTemplateService(db).get_preferences(user_id)


@router.patch("/preferences", response_model=PreferencesOut)
def update_preferences(
    body: PreferencesUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return ScheduleTemplateService(db).update_preferences(user_id, body)


@router.post("/generate")
async def generate_week(
    body: GenerateWeekRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """
    SSE stream. Generates a complete week schedule from the template.
    Sends progress events then a final 'done' event with the generated events.
    """
    try:
        week_start = date.fromisoformat(body.week_start)
        week_start = week_start - timedelta(days=week_start.weekday())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid week_start date") from exc

    queue: asyncio.Queue[str] = asyncio.Queue()

    async def progress_callback(step: str, n: int, total: int) -> None:
        await queue.put(json.dumps({"step": step, "progress": n, "total": total}))

    async def run() -> None:
        try:
            builder = WeekBuilder(db)
            events = await builder.generate(
                user_id=user_id,
                week_start=week_start,
                provider=body.provider,
                progress_callback=progress_callback,
            )
            await queue.put(json.dumps({"done": True, "events": events}))
        except Exception as exc:
            await queue.put(json.dumps({"error": str(exc)}))
        finally:
            await queue.put("__DONE__")

    async def event_stream():
        task = asyncio.create_task(run())
        while True:
            msg = await queue.get()
            if msg == "__DONE__":
                break
            yield f"data: {msg}\n\n"
        await task

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/apply", status_code=status.HTTP_201_CREATED)
def apply_week(
    body: ApplyWeekRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """
    Takes the list of GeneratedEvents the user approved and saves them
    as real ScheduleEvent rows with ai_suggested=True.
    """
    from datetime import time as dtime

    created = 0
    for event in body.events:
        try:
            event_date = date.fromisoformat(event.date)
            hours, minutes = map(int, event.start_time.split(":"))
            start = dtime(hours, minutes)
        except (ValueError, AttributeError):
            continue

        row = ScheduleEvent(
            user_id=user_id,
            title=event.title,
            type=event.type,
            date=event_date,
            start_time=start,
            duration=event.duration,
            notes=None,
            course_id=event.course_id,
            ai_suggested=True,
        )
        db.add(row)
        created += 1

    db.commit()
    return {"created": created}
