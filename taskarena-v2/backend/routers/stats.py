from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user_id, get_db
from features.stats.service import StatsService

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/overview")
def get_overview(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return StatsService(db).get_overview(user_id)


@router.get("/activity")
def get_activity(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return StatsService(db).get_daily_activity(user_id=user_id, days=days)


@router.get("/breakdown")
def get_breakdown(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return StatsService(db).get_task_breakdown(user_id)


@router.get("/quiz")
def get_quiz_performance(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return StatsService(db).get_quiz_performance(user_id)
