from datetime import date

from fastapi import APIRouter, Depends, Query, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user_id, get_db
from features.schedule.schemas import EventCreate, EventOut, EventUpdate
from features.schedule.service import ScheduleService

router = APIRouter(prefix="/schedule", tags=["schedule"])


class SuggestionAcceptBody(BaseModel):
    title: str
    type: str
    date: str
    start_time: str
    duration: int
    course_id: int | None = None


@router.get("", response_model=list[EventOut])
def get_events(
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return ScheduleService(db).get_events(user_id=user_id, date_from=from_date, date_to=to_date)


@router.post("", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(
    body: EventCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return ScheduleService(db).create_event(user_id=user_id, data=body)


@router.get("/week", response_model=list[EventOut])
def get_week_events(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return ScheduleService(db).get_week_events(user_id)


@router.get("/month", response_model=list[EventOut])
def get_month_events(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return ScheduleService(db).get_month_events(user_id=user_id, year=year, month=month)


@router.get("/suggestions")
async def get_suggestions(
    provider: str = Query("groq"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    suggestions = await ScheduleService(db).get_ai_suggestions(user_id, provider)
    return {"suggestions": suggestions}


@router.post("/suggestions/accept", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def accept_suggestion(
    body: SuggestionAcceptBody,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    payload = body.model_dump()
    course_id = payload.pop("course_id", None)
    return ScheduleService(db).accept_suggestion(user_id=user_id, suggestion=payload, course_id=course_id)


@router.patch("/{event_id}", response_model=EventOut)
def update_event(event_id: int, body: EventUpdate, db: Session = Depends(get_db)):
    return ScheduleService(db).update_event(event_id=event_id, data=body)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: int, db: Session = Depends(get_db)) -> Response:
    ScheduleService(db).delete_event(event_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
