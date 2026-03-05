# Schedule CLI (Phase 1D)

Schedule CLI adds calendar event CRUD plus AI-generated study suggestions grounded in real task deadlines.

## What It Covers

- View current week events (Mon-Sun)
- View month calendar with event markers
- Add events manually
- Delete events
- Generate AI study suggestions from pending tasks with deadlines
- Accept one/all suggestions into `schedule_events` with `ai_suggested=1`

## Run

From project root (`taskarena-v2`):

```bash
python features/schedule/cli.py
```

## AI Suggestion Requirements

- Needs pending tasks with deadlines in DB (seed data includes these)
- Needs a working AI provider:
  - Groq: `GROQ_API_KEY` in `.env`
  - Local: valid local model path in settings
  - Ollama: local Ollama server running

If provider call fails or returns malformed JSON, CLI shows a friendly message and continues without crashing.

## Suggested Manual Verification

```bash
# 1) Run CLI
python features/schedule/cli.py

# 2) View week (should include 3 seed events)

# 3) Add a manual event

# 4) Run AI suggestions and accept one

# 5) Verify accepted suggestion is persisted with ai_suggested=1
sqlite3 data/taskarena.db "SELECT title, date, start_time, ai_suggested FROM schedule_events ORDER BY date, start_time;"
```

## Gate Conditions

- Weekly view shows seeded events
- Can add and delete events
- AI suggestion call completes and returns suggestion rows when provider is configured
- Suggestions are based on task deadlines loaded from DB
- Accepting a suggestion creates a row with `ai_suggested=1`
- Invalid date/time inputs are retried and do not crash CLI
