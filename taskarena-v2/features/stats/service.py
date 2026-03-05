from __future__ import annotations

from datetime import date, datetime, time, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

import features.chatbot.models  # noqa: F401
import features.notes.models  # noqa: F401
import features.quiz.models  # noqa: F401
import features.schedule.models  # noqa: F401
import features.tasks.models  # noqa: F401
from features.quiz.models import Quiz, QuizAttempt
from features.tasks.models import Task, XPLog
from shared.user_model import User


class StatsService:
    def __init__(self, db: Session):
        self.db = db

    def get_overview(self, user_id: int) -> dict:
        """
        Return all OverviewStats fields.
        - completion_rate = (tasks_completed / tasks_total * 100) if tasks_total > 0 else 0
        - avg_quiz_score = AVG(score) from quiz_attempts for this user
        - best_quiz_score = MAX(score) from quiz_attempts
        - xp_this_week = SUM from xp_log where logged_at >= 7 days ago
        - tasks_this_week = COUNT from tasks where completed_at >= 7 days ago
        - rank = user's rank by xp among all users
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
        tasks_pending = (
            self.db.query(func.count(Task.id))
            .filter(Task.user_id == user_id, Task.status == "pending")
            .scalar()
            or 0
        )
        tasks_total = (
            self.db.query(func.count(Task.id))
            .filter(Task.user_id == user_id)
            .scalar()
            or 0
        )

        completion_rate = round((tasks_completed / tasks_total * 100.0), 1) if tasks_total > 0 else 0.0
        weekly_cutoff = self._weekly_cutoff()

        xp_this_week = (
            self.db.query(func.coalesce(func.sum(XPLog.amount), 0))
            .filter(XPLog.user_id == user_id, XPLog.logged_at >= weekly_cutoff)
            .scalar()
            or 0
        )
        tasks_this_week = (
            self.db.query(func.count(Task.id))
            .filter(
                Task.user_id == user_id,
                Task.status == "completed",
                Task.completed_at.is_not(None),
                Task.completed_at >= weekly_cutoff,
            )
            .scalar()
            or 0
        )

        quiz_agg = (
            self.db.query(
                func.count(QuizAttempt.id).label("quizzes_taken"),
                func.avg(QuizAttempt.score).label("avg_score"),
                func.max(QuizAttempt.score).label("best_score"),
            )
            .filter(QuizAttempt.user_id == user_id)
            .one()
        )

        avg_score = round(float(quiz_agg.avg_score), 1) if quiz_agg.avg_score is not None else None
        best_score = round(float(quiz_agg.best_score), 1) if quiz_agg.best_score is not None else None

        return {
            "tasks_completed": int(tasks_completed),
            "tasks_pending": int(tasks_pending),
            "tasks_total": int(tasks_total),
            "completion_rate": completion_rate,
            "total_xp": int(user.xp),
            "current_streak": int(user.streak or 0),
            "longest_streak": int(user.streak or 0),
            "quizzes_taken": int(quiz_agg.quizzes_taken or 0),
            "avg_quiz_score": avg_score,
            "best_quiz_score": best_score,
            "rank": self._get_rank(user_id),
            "level": int(user.level),
            "xp_this_week": int(xp_this_week),
            "tasks_this_week": int(tasks_this_week),
        }

    def get_daily_activity(self, user_id: int, days: int = 7) -> list[dict]:
        """
        Return one entry per day for the last N days.
        Each entry: {date, tasks_completed, xp_earned}
        - tasks_completed: count of tasks.completed_at on that date
        - xp_earned: sum of xp_log.amount on that date
        Fill in 0s for days with no activity (every day must be present).
        Order ascending (oldest first).
        """
        if days <= 0:
            return []

        end_day = date.today()
        start_day = end_day - timedelta(days=days - 1)
        start_dt = datetime.combine(start_day, time.min)

        task_rows = (
            self.db.query(
                func.date(Task.completed_at).label("day"),
                func.count(Task.id).label("tasks_completed"),
            )
            .filter(
                Task.user_id == user_id,
                Task.status == "completed",
                Task.completed_at.is_not(None),
                Task.completed_at >= start_dt,
            )
            .group_by(func.date(Task.completed_at))
            .all()
        )
        xp_rows = (
            self.db.query(
                func.date(XPLog.logged_at).label("day"),
                func.coalesce(func.sum(XPLog.amount), 0).label("xp_earned"),
            )
            .filter(XPLog.user_id == user_id, XPLog.logged_at >= start_dt)
            .group_by(func.date(XPLog.logged_at))
            .all()
        )

        tasks_by_day = {str(row.day): int(row.tasks_completed or 0) for row in task_rows}
        xp_by_day = {str(row.day): int(row.xp_earned or 0) for row in xp_rows}

        output: list[dict] = []
        for offset in range(days):
            current_day = start_day + timedelta(days=offset)
            key = current_day.isoformat()
            output.append(
                {
                    "date": current_day,
                    "tasks_completed": tasks_by_day.get(key, 0),
                    "xp_earned": xp_by_day.get(key, 0),
                }
            )
        return output

    def get_task_breakdown(self, user_id: int) -> dict:
        """
        Return TaskBreakdown.
        by_type counts tasks grouped by type + status.
        by_status counts all tasks by status.
        """
        type_rows = (
            self.db.query(
                Task.type.label("task_type"),
                Task.status.label("status"),
                func.count(Task.id).label("count"),
            )
            .filter(Task.user_id == user_id)
            .group_by(Task.type, Task.status)
            .all()
        )
        status_rows = (
            self.db.query(Task.status.label("status"), func.count(Task.id).label("count"))
            .filter(Task.user_id == user_id)
            .group_by(Task.status)
            .all()
        )

        by_type: dict[str, dict] = {
            "assignment": {"completed": 0, "pending": 0},
            "study": {"completed": 0, "pending": 0},
            "productivity": {"completed": 0, "pending": 0},
        }
        for row in type_rows:
            task_type = str(row.task_type)
            status = str(row.status)
            if task_type not in by_type:
                by_type[task_type] = {"completed": 0, "pending": 0}
            if status not in by_type[task_type]:
                by_type[task_type][status] = 0
            by_type[task_type][status] = int(row.count or 0)

        by_status: dict[str, int] = {"pending": 0, "completed": 0}
        for row in status_rows:
            by_status[str(row.status)] = int(row.count or 0)

        return {"by_type": by_type, "by_status": by_status}

    def get_quiz_performance(self, user_id: int) -> dict:
        """
        Return:
        - attempts_total (int)
        - avg_score (Optional[float])
        - best_score (Optional[float])
        - by_difficulty: dict - {"easy": {attempts, avg}, "medium": {...}, "hard": {...}}
        """
        totals = (
            self.db.query(
                func.count(QuizAttempt.id).label("attempts_total"),
                func.avg(QuizAttempt.score).label("avg_score"),
                func.max(QuizAttempt.score).label("best_score"),
            )
            .filter(QuizAttempt.user_id == user_id)
            .one()
        )

        diff_rows = (
            self.db.query(
                Quiz.difficulty.label("difficulty"),
                func.count(QuizAttempt.id).label("attempts"),
                func.avg(QuizAttempt.score).label("avg_score"),
            )
            .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
            .filter(QuizAttempt.user_id == user_id)
            .group_by(Quiz.difficulty)
            .all()
        )

        by_difficulty: dict[str, dict] = {
            "easy": {"attempts": 0, "avg": None},
            "medium": {"attempts": 0, "avg": None},
            "hard": {"attempts": 0, "avg": None},
        }
        for row in diff_rows:
            key = str(row.difficulty)
            by_difficulty[key] = {
                "attempts": int(row.attempts or 0),
                "avg": round(float(row.avg_score), 1) if row.avg_score is not None else None,
            }

        return {
            "attempts_total": int(totals.attempts_total or 0),
            "avg_score": round(float(totals.avg_score), 1) if totals.avg_score is not None else None,
            "best_score": round(float(totals.best_score), 1) if totals.best_score is not None else None,
            "by_difficulty": by_difficulty,
        }

    def _get_rank(self, user_id: int) -> int:
        ordered_users = (
            self.db.query(User.id)
            .order_by(User.xp.desc(), User.id.asc())
            .all()
        )
        for index, row in enumerate(ordered_users, start=1):
            if int(row.id) == user_id:
                return index
        raise ValueError(f"User with id {user_id} not found")

    def _weekly_cutoff(self) -> datetime:
        return datetime.combine(date.today() - timedelta(days=7), time.min)
