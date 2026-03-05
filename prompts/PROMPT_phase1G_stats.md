# TaskArena v2 — Phase 1G: Stats CLI
# Depends on: Phase 0, 1A, 1E complete (needs tasks + quiz_attempts data)
# Goal: All stat aggregations accurate + ASCII bar chart in terminal

---

## PROMPT

---

You are continuing to build TaskArena v2. Phases 0 through 1F are complete.

Before writing any code read:
1. `docs/DATABASE.md` — all table schemas, especially the common queries section
2. `docs/CONVENTIONS.md` — service rules

Your job is **Phase 1G only** — the Stats CLI. Build exactly these files:

```
features/stats/schemas.py
features/stats/service.py
features/stats/cli.py
features/stats/README.md
```

---

## `features/stats/schemas.py`

```python
# OverviewStats:
#   tasks_completed (int), tasks_pending (int), tasks_total (int),
#   completion_rate (float — percentage),
#   total_xp (int), current_streak (int), longest_streak (int — NOTE: not tracked yet, return current_streak),
#   quizzes_taken (int), avg_quiz_score (Optional[float]), best_quiz_score (Optional[float]),
#   rank (int), level (int),
#   xp_this_week (int), tasks_this_week (int)

# DailyActivity:
#   date (date), tasks_completed (int), xp_earned (int)

# TaskBreakdown:
#   by_type: dict[str, dict] — {"assignment": {"completed": N, "pending": N}, ...}
#   by_status: dict[str, int] — {"pending": N, "completed": N}
```

---

## `features/stats/service.py`

```python
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

    def get_daily_activity(self, user_id: int, days: int = 7) -> list[dict]:
        """
        Return one entry per day for the last N days.
        Each entry: {date, tasks_completed, xp_earned}
        - tasks_completed: count of tasks.completed_at on that date
        - xp_earned: sum of xp_log.amount on that date
        Fill in 0s for days with no activity (every day must be present).
        Order ascending (oldest first).
        """

    def get_task_breakdown(self, user_id: int) -> dict:
        """
        Return TaskBreakdown.
        by_type counts tasks grouped by type + status.
        by_status counts all tasks by status.
        """

    def get_quiz_performance(self, user_id: int) -> dict:
        """
        Return:
        - attempts_total (int)
        - avg_score (Optional[float])
        - best_score (Optional[float])
        - by_difficulty: dict — {"easy": {attempts, avg}, "medium": {...}, "hard": {...}}
        """
```

---

## `features/stats/cli.py`

**Main menu:**
```
─────────────────────────────────────
  TaskArena — Statistics
─────────────────────────────────────
  [1] Overview
  [2] Activity (last 7 days)
  [3] Activity (last 30 days)
  [4] Task breakdown
  [5] Quiz performance
  [q] Quit
```

**Overview (option 1):**
```
─────────────────────────────────────────────────────────────────
  Overview — Raghav Sethi  (Lv.14 · Rank #1)
─────────────────────────────────────────────────────────────────
  TASKS
    Total:          42    Completed:  38    Pending:    4
    Completion:     90.5%             This week:  7 tasks

  XP & PROGRESS
    Total XP:       2,340             This week:  +145 XP
    Streak:         12 days

  QUIZZES
    Taken:          5                 Avg Score:  76.4%
    Best Score:     92.0%
─────────────────────────────────────────────────────────────────
```

**Activity bar chart (option 2 — last 7 days):**
```
  Activity — Last 7 Days
  ──────────────────────────────────────────────────
  Mon Feb 24  ████████████░░░░░░░░  4 tasks  +45 XP
  Tue Feb 25  ██████████████████░░  7 tasks  +80 XP
  Wed Feb 26  ░░░░░░░░░░░░░░░░░░░░  0 tasks  +0 XP
  Thu Feb 27  ████████░░░░░░░░░░░░  3 tasks  +30 XP
  Fri Feb 28  ██████████░░░░░░░░░░  4 tasks  +40 XP
  Sat Mar 01  ████░░░░░░░░░░░░░░░░  2 tasks  +15 XP
  Sun Mar 02  ██████░░░░░░░░░░░░░░  3 tasks  +35 XP
  ──────────────────────────────────────────────────
  Total:  23 tasks   +245 XP   Best day: Tue (7 tasks)
```

Bar chart implementation:
- Width: 20 chars total
- Filled: `█` proportional to max day value
- Empty: `░`
- Scale relative to max value in the period (max = 20 filled blocks)
- If all zeros: all empty blocks

**30-day chart** — same format but grouped by week:
```
  Week Mar 02–08   ████████████░░░░  23 tasks  +245 XP
  Week Feb 23–Mar01 ██████████░░░░░░  19 tasks  +190 XP
  ...
```

**Task breakdown (option 4):**
```
  Task Breakdown
  ────────────────────────────────────────
  By Type:
    assignment   ████████████  12 done   3 pending
    study        ████████      8 done    4 pending
    productivity ██████        5 done    1 pending

  By Status:
    completed    ████████████████████  25 (89.3%)
    pending      ██                    3 (10.7%)
```

**Quiz performance (option 5):**
```
  Quiz Performance
  ────────────────────────────────────────
  Total attempts:  5
  Average score:   76.4%
  Best score:      92.0%

  By Difficulty:
    easy    2 attempts  avg: 88.5%  ████████████████████
    medium  2 attempts  avg: 70.0%  ██████████████░░░░░░
    hard    1 attempt   avg: 65.0%  █████████████░░░░░░░
```

---

## `features/stats/README.md`

Cover: what it shows, how to get meaningful data (complete tasks, take quizzes), how to run, how to verify numbers, gate conditions.

---

## Verification

```bash
# 1. Run the CLI
python features/stats/cli.py

# 2. Check Overview numbers against raw DB:
sqlite3 data/taskarena.db "SELECT COUNT(*) FROM tasks WHERE status='completed' AND user_id=1;"
# Must match "Completed" in overview

sqlite3 data/taskarena.db "SELECT SUM(amount) FROM xp_log WHERE user_id=1 AND logged_at >= date('now', '-7 days');"
# Must match "This week" XP

sqlite3 data/taskarena.db "SELECT AVG(score) FROM quiz_attempts WHERE user_id=1;"
# Must match "Avg Score" in overview

# 3. View activity chart — verify bars are proportional to actual counts
# 4. All numbers must match the raw queries above exactly
```

---

## Rules

1. Every number in the UI must be derivable from a DB query — no hardcoded values
2. `get_daily_activity` must fill in zero-value days — missing days break the chart
3. Bar chart fills are proportional to max value in the dataset, not absolute
4. Do not import from any other feature's `service.py`
5. Do not modify any file outside `features/stats/`

---

## Done when

- [ ] CLI runs and displays all 5 views
- [ ] Overview numbers verified against raw sqlite3 queries (must match exactly)
- [ ] Activity bar chart renders correctly, proportional bars
- [ ] Zero-activity days show empty bars (not missing rows)
- [ ] Quiz performance section shows `—` gracefully when no attempts exist
