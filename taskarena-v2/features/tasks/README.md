# Tasks CLI (Phase 1A)

This feature provides terminal-based task management for TaskArena v2:
- View all tasks or only pending tasks
- Add, update, complete, and delete tasks
- Award XP when tasks are completed
- View recent XP log entries

## Run

From project root (`taskarena-v2`) with virtual environment active:

```bash
python features/tasks/cli.py
```

## Manual Test Checklist

1. View seeded tasks (should show 5 tasks initially).
2. Add a new task with type, optional subject/deadline, and points.
3. Complete a pending task and confirm XP increases.
4. View XP log and confirm a new completion entry exists.
5. Update a task title/subject/status/deadline/points.
6. Delete a task and confirm safe confirmation prompt.
7. Quit with `q` and confirm `Ctrl+C` exits cleanly.

## Gate Condition

Phase 1A is complete when task CRUD + completion XP flow works end-to-end from the CLI and DB checks confirm:
- `users.xp` increases after task completion
- `xp_log` includes the new completion row
- `tasks.completed_at` is set for completed tasks
