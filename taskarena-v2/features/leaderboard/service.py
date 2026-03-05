from __future__ import annotations

from datetime import date, datetime, time, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

import features.chatbot.models  # noqa: F401
import features.notes.models  # noqa: F401
import features.quiz.models  # noqa: F401
import features.schedule.models  # noqa: F401
import features.tasks.models  # noqa: F401
from features.quiz.models import QuizAttempt
from features.tasks.models import Task, XPLog
from shared.user_model import User


class LeaderboardService:
    def __init__(self, db: Session):
        self.db = db

    def get_rankings(self, limit: int = 10) -> list[dict]:
        """
        Build the all-time leaderboard.
        For each user:
          - rank by total XP descending
          - tasks_completed = COUNT of tasks with status='completed'
          - weekly_xp = SUM of xp_log.amount WHERE logged_at >= 7 days ago
        Return as list of dicts matching RankingEntry fields.
        Use SQLAlchemy queries only - no raw SQL strings.
        """
        if limit <= 0:
            return []

        weekly_cutoff = self._weekly_cutoff()
        tasks_subq = self._tasks_completed_subquery()
        weekly_subq = self._weekly_xp_subquery(weekly_cutoff)

        rows = (
            self.db.query(
                User.id.label("user_id"),
                User.name.label("name"),
                User.level.label("level"),
                User.xp.label("xp"),
                User.streak.label("streak"),
                func.coalesce(tasks_subq.c.tasks_completed, 0).label("tasks_completed"),
                func.coalesce(weekly_subq.c.weekly_xp, 0).label("weekly_xp"),
            )
            .outerjoin(tasks_subq, tasks_subq.c.user_id == User.id)
            .outerjoin(weekly_subq, weekly_subq.c.user_id == User.id)
            .order_by(User.xp.desc(), User.id.asc())
            .limit(limit)
            .all()
        )

        rankings: list[dict] = []
        for rank_index, row in enumerate(rows, start=1):
            rankings.append(
                {
                    "rank": rank_index,
                    "user_id": int(row.user_id),
                    "name": str(row.name),
                    "level": int(row.level),
                    "xp": int(row.xp),
                    "tasks_completed": int(row.tasks_completed or 0),
                    "streak": int(row.streak or 0),
                    "weekly_xp": int(row.weekly_xp or 0),
                }
            )
        return rankings

    def get_weekly_rankings(self, limit: int = 10) -> list[dict]:
        """
        Rank users by XP earned in the last 7 days (from xp_log).
        Same fields as get_rankings() but sorted by weekly_xp desc.
        Only include users who have earned XP in the last 7 days.
        """
        if limit <= 0:
            return []

        weekly_cutoff = self._weekly_cutoff()
        tasks_subq = self._tasks_completed_subquery()
        weekly_subq = self._weekly_xp_subquery(weekly_cutoff)

        rows = (
            self.db.query(
                User.id.label("user_id"),
                User.name.label("name"),
                User.level.label("level"),
                User.xp.label("xp"),
                User.streak.label("streak"),
                func.coalesce(tasks_subq.c.tasks_completed, 0).label("tasks_completed"),
                weekly_subq.c.weekly_xp.label("weekly_xp"),
            )
            .join(weekly_subq, weekly_subq.c.user_id == User.id)
            .outerjoin(tasks_subq, tasks_subq.c.user_id == User.id)
            .order_by(weekly_subq.c.weekly_xp.desc(), User.xp.desc(), User.id.asc())
            .limit(limit)
            .all()
        )

        rankings: list[dict] = []
        for rank_index, row in enumerate(rows, start=1):
            rankings.append(
                {
                    "rank": rank_index,
                    "user_id": int(row.user_id),
                    "name": str(row.name),
                    "level": int(row.level),
                    "xp": int(row.xp),
                    "tasks_completed": int(row.tasks_completed or 0),
                    "streak": int(row.streak or 0),
                    "weekly_xp": int(row.weekly_xp or 0),
                }
            )
        return rankings

    def get_user_stats(self, user_id: int) -> dict:
        """
        Return detailed stats for one user:
        - All RankingEntry fields
        - quizzes_taken = COUNT of quiz_attempts for this user
        - avg_quiz_score = AVG of quiz_attempts.score (None if no attempts)
        - rank = their position in get_rankings()
        """
        user = self.db.get(User, user_id)
        if not user:
            raise ValueError(f"User with id {user_id} not found")

        tasks_completed = (
            self.db.query(func.count(Task.id))
            .filter(Task.user_id == user_id, Task.status == "completed")
            .scalar()
            or 0
        )

        weekly_cutoff = self._weekly_cutoff()
        weekly_xp = (
            self.db.query(func.coalesce(func.sum(XPLog.amount), 0))
            .filter(XPLog.user_id == user_id, XPLog.logged_at >= weekly_cutoff)
            .scalar()
            or 0
        )

        quiz_agg = (
            self.db.query(
                func.count(QuizAttempt.id).label("quizzes_taken"),
                func.avg(QuizAttempt.score).label("avg_quiz_score"),
            )
            .filter(QuizAttempt.user_id == user_id)
            .one()
        )

        avg_score = (
            round(float(quiz_agg.avg_quiz_score), 1)
            if quiz_agg.avg_quiz_score is not None
            else None
        )

        return {
            "rank": self.get_user_rank(user_id),
            "name": user.name,
            "level": int(user.level),
            "xp": int(user.xp),
            "tasks_completed": int(tasks_completed),
            "streak": int(user.streak or 0),
            "quizzes_taken": int(quiz_agg.quizzes_taken or 0),
            "avg_quiz_score": avg_score,
            "weekly_xp": int(weekly_xp),
        }

    def get_user_rank(self, user_id: int) -> int:
        """Return the user's rank (1 = highest XP). O(n) is fine."""
        rows = (
            self.db.query(User.id)
            .order_by(User.xp.desc(), User.id.asc())
            .all()
        )
        for index, row in enumerate(rows, start=1):
            if int(row.id) == user_id:
                return index
        raise ValueError(f"User with id {user_id} not found")

    def _weekly_cutoff(self) -> datetime:
        return datetime.combine(date.today() - timedelta(days=7), time.min)

    def _tasks_completed_subquery(self):
        return (
            self.db.query(
                Task.user_id.label("user_id"),
                func.count(Task.id).label("tasks_completed"),
            )
            .filter(Task.status == "completed")
            .group_by(Task.user_id)
            .subquery()
        )

    def _weekly_xp_subquery(self, weekly_cutoff: datetime):
        return (
            self.db.query(
                XPLog.user_id.label("user_id"),
                func.sum(XPLog.amount).label("weekly_xp"),
            )
            .filter(XPLog.logged_at >= weekly_cutoff)
            .group_by(XPLog.user_id)
            .subquery()
        )
