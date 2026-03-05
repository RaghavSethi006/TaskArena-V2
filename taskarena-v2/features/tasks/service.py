from __future__ import annotations

from datetime import date, datetime, timedelta

from sqlalchemy import case
from sqlalchemy.orm import Session

import features.chatbot.models  # noqa: F401
import features.notes.models  # noqa: F401
import features.quiz.models  # noqa: F401
import features.schedule.models  # noqa: F401
from features.tasks.models import Task, XPLog
from features.tasks.schemas import TaskCreate, TaskUpdate
from shared.user_model import User


class TaskService:
    def __init__(self, db: Session):
        self.db = db

    def get_tasks(self, user_id: int, type: str = None, status: str = None) -> list[Task]:
        """Return tasks for user, optionally filtered by type and/or status. Ordered by deadline asc (nulls last)."""
        query = self.db.query(Task).filter(Task.user_id == user_id)

        if type:
            query = query.filter(Task.type == type)
        if status:
            query = query.filter(Task.status == status)

        return (
            query.order_by(
                case((Task.deadline.is_(None), 1), else_=0),
                Task.deadline.asc(),
                Task.id.asc(),
            )
            .all()
        )

    def get_task(self, task_id: int) -> Task:
        """Return single task. Raise ValueError if not found."""
        task = self.db.get(Task, task_id)
        if not task:
            raise ValueError(f"Task with id {task_id} not found")
        return task

    def get_user(self, user_id: int) -> User:
        """Return a user. Raise ValueError if not found."""
        user = self.db.get(User, user_id)
        if not user:
            raise ValueError(f"User with id {user_id} not found")
        return user

    def create_task(self, user_id: int, data: TaskCreate) -> Task:
        """Create and return new task."""
        task = Task(
            user_id=user_id,
            title=data.title,
            subject=data.subject,
            type=data.type,
            deadline=data.deadline,
            points=data.points,
            course_id=data.course_id,
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def update_task(self, task_id: int, data: TaskUpdate) -> Task:
        """Update task fields. Only update fields that are not None in data. Raise ValueError if not found."""
        task = self.get_task(task_id)
        updates = data.model_dump(exclude_none=True)

        if "status" in updates:
            new_status = updates["status"]
            if new_status == "completed":
                task.completed_at = task.completed_at or datetime.utcnow()
            elif new_status == "pending":
                task.completed_at = None

        for field_name, value in updates.items():
            setattr(task, field_name, value)

        self.db.commit()
        self.db.refresh(task)
        return task

    def complete_task(self, task_id: int) -> tuple[Task, int]:
        """
        Mark task as completed. Set completed_at to utcnow.
        Award XP via _award_xp. Update user streak if needed.
        Returns (task, xp_earned).
        Raise ValueError if task not found.
        Raise PermissionError if task is already completed.
        """
        task = self.get_task(task_id)
        if task.status == "completed":
            raise PermissionError(f"Task with id {task_id} is already completed")

        task.status = "completed"
        task.completed_at = datetime.utcnow()
        xp_earned = self._award_xp(
            user_id=task.user_id,
            amount=task.points,
            reason=f"Completed task: {task.title}",
        )

        self.db.commit()
        self.db.refresh(task)
        return task, xp_earned

    def delete_task(self, task_id: int) -> None:
        """Delete task. Raise ValueError if not found."""
        task = self.get_task(task_id)
        self.db.delete(task)
        self.db.commit()

    def get_xp_log(self, user_id: int, limit: int = 20) -> list[XPLog]:
        """Return recent XP log entries for user, newest first."""
        return (
            self.db.query(XPLog)
            .filter(XPLog.user_id == user_id)
            .order_by(XPLog.logged_at.desc(), XPLog.id.desc())
            .limit(limit)
            .all()
        )

    def _award_xp(self, user_id: int, amount: int, reason: str) -> int:
        """
        Private helper. Add amount to user.xp. Create XPLog entry.
        Also call _update_streak(user).
        Returns amount awarded.
        """
        user = self.get_user(user_id)
        user.xp += amount
        self._update_streak(user)

        log_entry = XPLog(user_id=user_id, amount=amount, reason=reason, logged_at=datetime.utcnow())
        self.db.add(log_entry)
        return amount

    def _update_streak(self, user: User) -> None:
        """
        Private helper. If user.last_active was yesterday, increment streak.
        If user.last_active was today, do nothing.
        If user.last_active was before yesterday, reset streak to 1.
        Update user.last_active to today.
        Also update user.level based on xp thresholds.
        """
        today = date.today()
        yesterday = today - timedelta(days=1)

        if user.last_active == today:
            pass
        elif user.last_active == yesterday:
            user.streak += 1
        else:
            user.streak = 1

        user.last_active = today

        level = 1
        while user.xp >= self._xp_for_level(level + 1):
            level += 1
        user.level = level

    def _xp_for_level(self, level: int) -> int:
        """
        XP thresholds: [0, 100, 250, 500, 850, 1300, 1900, 2700, 3700, 5000]
        For level > 10: previous threshold + (level * 700)
        """
        if level < 1:
            raise ValueError("Level must be >= 1")

        thresholds = [0, 100, 250, 500, 850, 1300, 1900, 2700, 3700, 5000]
        if level <= len(thresholds):
            return thresholds[level - 1]

        xp_required = thresholds[-1]
        for current_level in range(11, level + 1):
            xp_required += current_level * 700
        return xp_required
