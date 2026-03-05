# TaskArena v2 — Phase 1D: Schedule CLI
# Depends on: Phase 0, 1A, 1B, 1C complete
# Goal: Schedule CRUD + AI suggestions grounded in real task deadlines

---

## PROMPT

---

You are continuing to build TaskArena v2. Phases 0 through 1C are complete.

Before writing any code read these docs:
1. `docs/DATABASE.md` — schedule_events schema
2. `docs/PROMPTS.md` — the schedule AI suggestions system prompt and user prompt templates
3. `docs/AI_GUIDE.md` — get_ai() factory, how to use complete() for non-streaming AI calls
4. `docs/CONVENTIONS.md` — service rules

Your job is **Phase 1D only** — the Schedule CLI. Build exactly these files:

```
features/schedule/schemas.py
features/schedule/ai_suggestions.py
features/schedule/service.py
features/schedule/cli.py
features/schedule/README.md
```

---

## `features/schedule/schemas.py`

```python
# EventCreate: title, type (Literal study/assignment/exam/break/other),
#              date (date), start_time (Optional[time]),
#              duration (Optional[int] minutes), notes (Optional[str]),
#              course_id (Optional[int])

# EventUpdate: all fields optional

# EventOut: all fields + id, ai_suggested, created_at
#           model_config = ConfigDict(from_attributes=True)

# SuggestionOut: title, type, date (str), start_time (str),
#                duration (int), course (str), reason (str),
#                priority (Literal high/medium/low)
```

---

## `features/schedule/ai_suggestions.py`

```python
class ScheduleAI:
    """
    Analyzes task deadlines and existing schedule,
    generates study block suggestions via AI.
    """

    def analyze_workload(self, user_id: int, db: Session) -> list:
        """
        Load all pending tasks for user_id with a deadline set.
        Filter to tasks due within the next 14 days.
        Order by deadline ascending.
        Return list of Task objects.
        """

    def get_existing_events(self, user_id: int, db: Session) -> list:
        """
        Load all schedule events for the next 7 days.
        Return list of ScheduleEvent objects.
        """

    def format_tasks_for_prompt(self, tasks: list) -> str:
        """
        Format tasks as a bulleted list for the AI prompt.
        Each line: "- {title} ({subject}) due {deadline} [{type}]"
        If no tasks: return "No upcoming deadlines."
        """

    def format_events_for_prompt(self, events: list) -> str:
        """
        Format existing events for the prompt.
        Each line: "- {date} {start_time}: {title} ({duration}min)"
        If no events: return "No existing events scheduled."
        """

    async def generate_suggestions(self, user_id: int, db: Session, provider: str = "groq") -> list[dict]:
        """
        Full pipeline:
        1. analyze_workload → tasks
        2. get_existing_events → events
        3. Build prompt using templates from docs/PROMPTS.md
        4. Call ai.complete() with the prompt
        5. Parse JSON response → list of suggestion dicts
        6. Return suggestions (empty list if no tasks or AI fails)

        Use try/except around JSON parsing.
        If AI returns malformed JSON, return [] and print a warning.
        today = date.today().strftime("%Y-%m-%d")
        """

    def _parse_suggestions(self, raw: str) -> list[dict]:
        """
        Parse AI JSON response.
        Strip markdown fences if present (```json ... ```).
        Parse with json.loads.
        Return suggestions list from parsed["suggestions"].
        Return [] on any parse error.
        """
```

---

## `features/schedule/service.py`

```python
class ScheduleService:
    def __init__(self, db: Session):
        self.db = db
        self.ai = ScheduleAI()

    def get_events(self, user_id: int, date_from: date, date_to: date) -> list[ScheduleEvent]:
        """Return events for user between date_from and date_to inclusive, ordered by date + start_time."""

    def get_event(self, event_id: int) -> ScheduleEvent:
        """Raise ValueError if not found."""

    def create_event(self, user_id: int, data: EventCreate) -> ScheduleEvent:

    def update_event(self, event_id: int, data: EventUpdate) -> ScheduleEvent:

    def delete_event(self, event_id: int) -> None:

    def get_week_events(self, user_id: int) -> list[ScheduleEvent]:
        """Return events for current week (Mon–Sun)."""

    def get_month_events(self, user_id: int, year: int, month: int) -> list[ScheduleEvent]:
        """Return all events for the given month."""

    async def get_ai_suggestions(self, user_id: int, provider: str = "groq") -> list[dict]:
        """Delegate to self.ai.generate_suggestions()."""

    def accept_suggestion(self, user_id: int, suggestion: dict, course_id: int = None) -> ScheduleEvent:
        """
        Convert a suggestion dict into a real ScheduleEvent.
        Set ai_suggested = True.
        Parse date string to date object, start_time string to time object.
        """
```

---

## `features/schedule/cli.py`

**Main menu:**
```
─────────────────────────────────────
  TaskArena — Smart Schedule
─────────────────────────────────────
  Week of March 2 – 8, 2026

  [1] View this week
  [2] View a month
  [3] Add event
  [4] Delete event
  [5] ✦ AI Study Suggestions
  [q] Quit
```

**Weekly view (option 1):**
```
─────────────────────────────────────────────────────────────────
  Week of March 2 – 8, 2026
─────────────────────────────────────────────────────────────────
  MON Mar 02
    09:00  Study: Thermodynamics Ch.7        90min  [study]
    14:00  Essay draft                       60min  [assignment]

  TUE Mar 03
    (no events)

  WED Mar 04
    10:00  Physics Midterm                  120min  [exam]

  THU Mar 05 – SUN Mar 08
    (no events)
─────────────────────────────────────────────────────────────────
```
- Event type shown as colored bracket label: [study] [exam] [assignment] [break]
- Today's day header is prefixed with ▶

**Monthly view (option 2):**
```
  Month (YYYY-MM, Enter for current): 2026-03

        March 2026
  Su  Mo  Tu  We  Th  Fr  Sa
   1 [ 2]  3   4   5   6   7     ← [ ] = has events
   8   9  10  11  12  13  14
  ...
  Total events this month: 7
```

**Add event (option 3):**
Prompt for: title, type (numbered list), date (YYYY-MM-DD), start time (HH:MM, optional), duration in minutes (optional), link to course? (y/N)

**AI Suggestions (option 5):**
```
  ✦ Generating AI study suggestions...
  Analyzing 4 upcoming deadlines...

  ─────────────────────────────────────────────────────────────────
  Suggestions for the next 7 days:
  ─────────────────────────────────────────────────────────────────

  [1] [HIGH] Study: Thermodynamics Ch.7
      Wed Mar 04, 19:00 — 90 min
      Physics 201
      → Midterm in 2 days — needs 2 more focused sessions

  [2] [MEDIUM] Review Essay Outline
      Thu Mar 05, 18:00 — 60 min
      Art History
      → Essay due in 5 days — structure review recommended

  ─────────────────────────────────────────────────────────────────
  [a] Accept a suggestion    [all] Accept all    [Enter] Skip
```

**Accept flow:**
- "Accept suggestion [1]: " → converted to real event with ai_suggested=True
- "✓ Added to your schedule: Study: Thermodynamics Ch.7 on Wed Mar 04 at 19:00"

**Priority label colors (if terminal supports):**
- HIGH → red/rose
- MEDIUM → amber/yellow
- LOW → green

---

## `features/schedule/README.md`

Cover: purpose, how to run, how to test AI suggestions (need tasks with deadlines from seed data), note about provider requirement, gate conditions.

---

## Verification

```bash
# 1. Run the CLI
python features/schedule/cli.py

# 2. View this week — should show 3 seed events

# 3. Add a new event manually

# 4. Run AI suggestions (requires GROQ_API_KEY or local model):
#    Should reference the task deadlines from seed data in its suggestions

# 5. Accept one suggestion

# 6. Verify DB:
sqlite3 data/taskarena.db "SELECT title, date, start_time, ai_suggested FROM schedule_events ORDER BY date, start_time;"
# ai_suggested should be 1 for the accepted suggestion
```

---

## Rules

1. `ai_suggestions.py` imports `Task` and `ScheduleEvent` models directly from the DB — it does NOT import from `features/tasks/service.py`
2. `service.py` is async only for `get_ai_suggestions` — everything else is sync
3. `cli.py` uses `asyncio.run()` for the suggestions call only
4. If AI provider fails or returns bad JSON, show a friendly error — don't crash
5. Date/time parsing must be robust — invalid inputs prompt the user to retry
6. Do not modify any file outside `features/schedule/`

---

## Done when

- [ ] CLI runs, weekly view shows seed events
- [ ] Can add and delete events
- [ ] AI suggestions call completes and returns at least 2 suggestions
- [ ] Suggestions reference actual task deadlines from the DB
- [ ] Accepting a suggestion creates a `schedule_events` row with `ai_suggested=1`
- [ ] Bad date input is handled gracefully
