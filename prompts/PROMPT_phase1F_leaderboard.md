# TaskArena v2 — Phase 1F: Leaderboard CLI
# Depends on: Phase 0, 1A complete (needs users + xp_log data)
# Goal: Rankings display correctly from DB — all-time and weekly

---

## PROMPT

---

You are continuing to build TaskArena v2. Phases 0 through 1E are complete.

Before writing any code read:
1. `docs/DATABASE.md` — users and xp_log schemas, the weekly XP query
2. `docs/CONVENTIONS.md` — service rules

Your job is **Phase 1F only** — the Leaderboard CLI. Build exactly these files:

```
features/leaderboard/schemas.py
features/leaderboard/service.py
features/leaderboard/cli.py
features/leaderboard/README.md
```

---

## `features/leaderboard/schemas.py`

```python
# RankingEntry:
#   rank (int), user_id (int), name (str), level (int),
#   xp (int), tasks_completed (int), streak (int),
#   weekly_xp (int)  ← XP earned in last 7 days from xp_log

# UserStats:
#   rank (int), name (str), level (int), xp (int),
#   tasks_completed (int), streak (int),
#   quizzes_taken (int), avg_quiz_score (Optional[float]),
#   weekly_xp (int)
```

---

## `features/leaderboard/service.py`

```python
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
        Use SQLAlchemy queries only — no raw SQL strings.
        """

    def get_weekly_rankings(self, limit: int = 10) -> list[dict]:
        """
        Rank users by XP earned in the last 7 days (from xp_log).
        Same fields as get_rankings() but sorted by weekly_xp desc.
        Only include users who have earned XP in the last 7 days.
        """

    def get_user_stats(self, user_id: int) -> dict:
        """
        Return detailed stats for one user:
        - All RankingEntry fields
        - quizzes_taken = COUNT of quiz_attempts for this user
        - avg_quiz_score = AVG of quiz_attempts.score (None if no attempts)
        - rank = their position in get_rankings()
        """

    def get_user_rank(self, user_id: int) -> int:
        """Return the user's rank (1 = highest XP). O(n) is fine."""
```

---

## `features/leaderboard/cli.py`

**Main menu:**
```
─────────────────────────────────────
  TaskArena — Leaderboard
─────────────────────────────────────
  [1] All-time rankings
  [2] This week's rankings
  [3] My stats
  [q] Quit
```

**All-time rankings table:**
```
─────────────────────────────────────────────────────────────────────────
  ALL-TIME LEADERBOARD
─────────────────────────────────────────────────────────────────────────
  Rank  Name              Level   XP        Tasks   Streak   Weekly XP
  ────  ────────────────  ──────  ────────  ──────  ───────  ─────────
  🥇 1  Raghav Sethi      Lv.14   2,340     87      12d      +145
  🥈 2  Priya Sharma      Lv.12   2,180     82      9d       +80
  🥉 3  Arjun Patel       Lv.11   1,960     75      7d       +60
     4  (you if >3rd)

─────────────────────────────────────────────────────────────────────────
  (press Enter to return)
```

Rules:
- 🥇🥈🥉 emojis for top 3 ranks
- Numbers right-aligned using `str.rjust()`
- Current user (id=1) row: prefix with `▶` and add `← YOU` suffix
- XP formatted with comma separator: `2,340`
- Streak shown as `Nd` format

**Weekly rankings table** — same format but sorted by Weekly XP column.

**My stats:**
```
─────────────────────────────────────
  Your Stats
─────────────────────────────────────
  Name:         Raghav Sethi
  Rank:         #1 of 4 users
  Level:        14
  Total XP:     2,340
  This Week:    +145 XP

  Tasks Done:   87
  Streak:       12 days 🔥

  Quizzes:      5 taken
  Avg Score:    76.4%
─────────────────────────────────────
```

---

## `features/leaderboard/README.md`

Cover: what it shows, how to populate meaningful data (complete tasks to earn XP), how to run, gate conditions.

---

## Verification

```bash
# 1. Run the CLI
python features/leaderboard/cli.py

# 2. Verify rankings show seed user (Raghav Sethi, 2340 XP, rank 1)

# 3. Complete a task in the Tasks CLI, then recheck leaderboard
#    XP should have increased and weekly XP should show the new amount

# 4. DB check:
sqlite3 data/taskarena.db "SELECT u.name, u.xp, COUNT(t.id) as tasks FROM users u LEFT JOIN tasks t ON t.user_id=u.id AND t.status='completed' GROUP BY u.id;"
```

---

## Rules

1. `service.py` uses SQLAlchemy ORM queries — no raw SQL strings
2. Weekly XP must use `xp_log.logged_at >= date.today() - timedelta(days=7)` — not tasks table
3. No cross-feature imports except `shared/` and direct model imports
4. Do not modify any file outside `features/leaderboard/`

---

## Done when

- [ ] CLI runs, rankings table displays correctly
- [ ] Seed user (Raghav, 2340 XP) shows as rank 1
- [ ] Weekly XP column reflects recent xp_log entries
- [ ] "My stats" shows accurate numbers matching raw DB counts
- [ ] Top 3 have trophy emojis, current user has `▶` marker
