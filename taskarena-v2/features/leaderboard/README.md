# Leaderboard CLI (Phase 1F)

Leaderboard CLI shows all-time and weekly rankings from `users`, `tasks`, and `xp_log`, plus personal stats for the active user.

## What It Shows

- All-time ranking by total XP
- Weekly ranking by XP earned in the last 7 days (`xp_log`)
- Completed task counts
- Current streak
- My stats view with quiz attempt summary

## How To Populate Data

Meaningful leaderboard data comes from XP activity:

- Complete tasks in `features/tasks/cli.py`
- Take quizzes in `features/quiz/cli.py`
- Any XP awards create `xp_log` rows and update weekly ranking totals

## Run

From project root (`taskarena-v2`):

```bash
python features/leaderboard/cli.py
```

## Gate Conditions

- CLI opens and tables render correctly
- Seed user appears with expected total XP near top
- Weekly XP reflects recent `xp_log` rows
- "My stats" values align with DB aggregates
- Top 3 ranks show medals, current user row shows `▶` marker
