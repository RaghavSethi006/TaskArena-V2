from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user_id, get_db
from features.leaderboard.service import LeaderboardService

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("")
def get_leaderboard(
    limit: int = Query(10),
    period: Literal["alltime", "weekly"] = Query("alltime"),
    db: Session = Depends(get_db),
):
    svc = LeaderboardService(db)
    if period == "weekly":
        return svc.get_weekly_rankings(limit)
    return svc.get_rankings(limit)


@router.get("/me")
def get_my_leaderboard_stats(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return LeaderboardService(db).get_user_stats(user_id)
