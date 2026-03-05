# Stats CLI (Phase 1G)

Stats CLI shows task progress, XP activity, ranking context, and quiz performance using only DB-backed aggregates.

## What It Shows

- Overview: tasks, completion rate, XP, streak, rank, weekly deltas, quiz summary
- Activity charts:
  - last 7 days (daily bars)
  - last 30 days grouped by week
- Task breakdown by type and status
- Quiz performance overall and by difficulty

## How To Get Meaningful Data

- Complete tasks in `features/tasks/cli.py` to increase completed counts and weekly XP
- Take quizzes in `features/quiz/cli.py` to populate attempts and score metrics
- More `xp_log` activity makes the charts and weekly sections richer

## Run

From project root (`taskarena-v2`):

```bash
python features/stats/cli.py
```

## Verify Numbers

Examples to compare against CLI output:

```bash
sqlite3 data/taskarena.db "SELECT COUNT(*) FROM tasks WHERE status='completed' AND user_id=1;"
sqlite3 data/taskarena.db "SELECT SUM(amount) FROM xp_log WHERE user_id=1 AND logged_at >= date('now', '-7 days');"
sqlite3 data/taskarena.db "SELECT AVG(score) FROM quiz_attempts WHERE user_id=1;"
```

## Gate Conditions

- All 5 views render from the CLI
- Overview fields match DB aggregates
- Activity includes zero-value days (no missing dates)
- Bars scale relative to the max value in each dataset
- Quiz sections show `—` gracefully when there are no attempts
