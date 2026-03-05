# TaskArena v2 — Phase 1A: Tasks CLI
# Depends on: Phase 0 complete (DB exists, seed data present)
# Goal: Full task CRUD + XP system working in terminal

---

## PROMPT

---

You are continuing to build TaskArena v2. Phase 0 is complete — the database exists at `data/taskarena.db` with all tables and seed data.

Before writing any code read these docs:
1. `docs/ARCHITECTURE.md` — the service pattern (most important)
2. `docs/CONVENTIONS.md` — the rules for service.py, naming, error handling
3. `docs/DATABASE.md` — the tasks and xp_log table schemas

Your job is **Phase 1A only** — the Tasks CLI feature. Build exactly these files and nothing else:

```
features/tasks/schemas.py
features/tasks/service.py
features/tasks/cli.py
features/tasks/README.md
```

---

## `features/tasks/schemas.py`

Pydantic v2 schemas. Three per resource — Create, Update, Out.

```python
from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional, Literal

class TaskCreate(BaseModel):
    title: str
    subject: Optional[str] = None
    type: Literal["assignment", "study", "productivity"]
    deadline: Optional[date] = None
    points: int = 5
    course_id: Optional[int] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    status: Optional[Literal["pending", "completed"]] = None
    deadline: Optional[date] = None
    points: Optional[int] = None

class TaskOut(BaseModel):
    id: int
    title: str
    subject: Optional[str]
    type: str
    status: str
    deadline: Optional[date]
    points: int
    course_id: Optional[int]
    created_at: datetime
    completed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

class XPLogOut(BaseModel):
    id: int
    user_id: int
    amount: int
    reason: str
    logged_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

---

## `features/tasks/service.py`

This is the most important file. Read CONVENTIONS.md before writing it.

**Critical rules:**
- NO imports from fastapi, click, rich, or any HTTP/CLI library
- NO print statements
- NO formatting or display logic
- Only pure Python + SQLAlchemy
- Raise `ValueError` for not-found errors, `PermissionError` for invalid state transitions

```python
class TaskService:
    def __init__(self, db: Session):
        self.db = db

    def get_tasks(self, user_id: int, type: str = None, status: str = None) -> list[Task]:
        """Return tasks for user, optionally filtered by type and/or status. Ordered by deadline asc (nulls last)."""

    def get_task(self, task_id: int) -> Task:
        """Return single task. Raise ValueError if not found."""

    def create_task(self, user_id: int, data: TaskCreate) -> Task:
        """Create and return new task."""

    def update_task(self, task_id: int, data: TaskUpdate) -> Task:
        """Update task fields. Only update fields that are not None in data. Raise ValueError if not found."""

    def complete_task(self, task_id: int) -> tuple[Task, int]:
        """
        Mark task as completed. Set completed_at to utcnow.
        Award XP via _award_xp. Update user streak if needed.
        Returns (task, xp_earned).
        Raise ValueError if task not found.
        Raise PermissionError if task is already completed.
        """

    def delete_task(self, task_id: int) -> None:
        """Delete task. Raise ValueError if not found."""

    def get_xp_log(self, user_id: int, limit: int = 20) -> list[XPLog]:
        """Return recent XP log entries for user, newest first."""

    def _award_xp(self, user_id: int, amount: int, reason: str) -> int:
        """
        Private helper. Add amount to user.xp. Create XPLog entry.
        Also call _update_streak(user).
        Returns amount awarded.
        """

    def _update_streak(self, user: User) -> None:
        """
        Private helper. If user.last_active was yesterday, increment streak.
        If user.last_active was today, do nothing.
        If user.last_active was before yesterday, reset streak to 1.
        Update user.last_active to today.
        Also update user.level based on xp thresholds.
        """

    def _xp_for_level(self, level: int) -> int:
        """
        XP thresholds: [0, 100, 250, 500, 850, 1300, 1900, 2700, 3700, 5000]
        For level > 10: previous threshold + (level * 700)
        """
```

---

## `features/tasks/cli.py`

Interactive terminal menu. Uses `TaskService` exclusively — no direct DB queries.

**Must handle:**
- `sys.path.insert` at top so shared/ is importable when run directly
- Load `.env` using `python-dotenv` at the top
- Graceful exit on `KeyboardInterrupt` (Ctrl+C)
- Clear screen between menu renders (optional but nice)
- Input validation — never crash on bad input

**Menu structure:**
```
─────────────────────────────────────
  TaskArena — Tasks
─────────────────────────────────────
  Pending: 4  |  Completed: 1  |  XP: 2340

  [1] View all tasks
  [2] View pending only
  [3] Add task
  [4] Complete a task
  [5] Update a task
  [6] Delete a task
  [7] View XP log
  [q] Quit
─────────────────────────────────────
```

**View tasks output format:**
```
ID   Title                                    Type           Subject        Due         Status
──   ─────────────────────────────────────    ──────────     ──────────     ─────────   ──────────
1    Essay on Renaissance Art                 assignment     Art History    Mar 05      ⏳ pending
2    Problem Set 3 — Mechanics                assignment     Physics        Mar 07      ⏳ pending
4    French Vocab Flashcards                  study          French         Mar 06      ✓  completed
```

**Add task — prompt for:**
1. Title (required — re-prompt if empty)
2. Type — show numbered list, user picks 1/2/3
3. Subject (optional — Enter to skip)
4. Deadline (optional — format YYYY-MM-DD, validate it parses, Enter to skip)
5. Points (optional — default 5, must be integer > 0)

**Complete task:**
- Show pending tasks list first
- Ask for task ID
- Validate it exists and is pending
- On success print: `✓ "{title}" completed! +{xp} XP earned. Total: {new_xp} XP`

**Delete task:**
- Show all tasks
- Ask for task ID
- Ask for confirmation: `Delete "{title}"? [y/N]`
- Default is N (safe)

---

## `features/tasks/README.md`

Write a short README covering:
- What this feature does
- How to run: `python features/tasks/cli.py` (from project root with venv active)
- What to test manually
- The gate condition

---

## Verification

Run these after building and confirm all pass:

```bash
# From project root with venv active:

# 1. Run the CLI
python features/tasks/cli.py

# 2. Manually test:
#    - View tasks (should show 5 from seed)
#    - Add a new task (assignment, Physics, due next week)
#    - Complete a task
#    - View XP log (should show the XP entry)
#    - Delete a task
#    - Quit with q and Ctrl+C both work

# 3. Verify DB state after completing a task:
sqlite3 data/taskarena.db "SELECT xp, streak FROM users WHERE id=1;"
# xp should have increased

sqlite3 data/taskarena.db "SELECT * FROM xp_log ORDER BY id DESC LIMIT 3;"
# Should show the XP entry for the completed task

sqlite3 data/taskarena.db "SELECT id, title, status, completed_at FROM tasks WHERE status='completed';"
# completed_at should be set
```

---

## Rules

1. `service.py` has zero knowledge of the CLI — no print, no input, no formatting
2. `cli.py` has zero direct DB queries — everything goes through `TaskService`
3. All errors from service are caught in cli.py and printed as friendly messages
4. Never crash on bad user input — always validate before calling service
5. Do not modify any file outside `features/tasks/`
6. Do not create schemas or models — models.py already exists from Phase 0

---

## Done when

- [ ] `python features/tasks/cli.py` runs without errors
- [ ] Can view, add, complete, update, delete tasks through the menu
- [ ] Completing a task increases `users.xp` in the DB
- [ ] Completing a task creates a row in `xp_log`
- [ ] `completed_at` is set on completed tasks
- [ ] Bad input (letters where ID expected, invalid date) does not crash the CLI
- [ ] Ctrl+C exits cleanly
