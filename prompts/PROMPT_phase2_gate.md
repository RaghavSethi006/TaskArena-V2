# TaskArena v2 — Phase 2 Gate Check
# Run this after Phase 2B is complete
# Every check must pass before Phase 3 starts. No exceptions.

---

## PROMPT

---

TaskArena v2 Phase 2 is built. Run the following verification checks with the server running. Report the result of every single check. Do not mark as passed until all succeed.

**Start the server first:**
```bash
uvicorn backend.main:app --reload --port 8765
```

---

## Check 1 — Server starts cleanly

```bash
# Look at the startup output in the uvicorn terminal
# Expected lines:
# INFO  taskarena: TaskArena backend starting...
# INFO  taskarena: Database: data/taskarena.db
# INFO  taskarena: AI provider: groq
# INFO  uvicorn: Application startup complete.
```
✅ PASS if no errors on startup
❌ FAIL if any ImportError, AttributeError, or exception on startup

---

## Check 2 — All routers registered

```bash
curl -s http://localhost:8765/docs | grep -o '"tags":\["[^"]*"\]' | sort -u
```

Expected (all 8 must appear):
- chatbot
- leaderboard
- notes
- profile
- quiz
- schedule
- stats
- system
- tasks

---

## Check 3 — Tasks endpoints

```bash
# List tasks
curl -s http://localhost:8765/api/tasks | python -c "import sys,json; d=json.load(sys.stdin); print(f'tasks: {len(d)}')"
# Expected: tasks: 5 (or more if you added during testing)

# Create task
curl -s -X POST http://localhost:8765/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Gate check task","type":"study","points":5}' \
  | python -c "import sys,json; d=json.load(sys.stdin); print(f'created id: {d[\"id\"]}')"
# Expected: created id: <number>

# Complete task (use the ID from above)
curl -s -X POST http://localhost:8765/api/tasks/<ID>/complete \
  | python -c "import sys,json; d=json.load(sys.stdin); print(f'xp_earned: {d[\"xp_earned\"]}, total: {d[\"new_total_xp\"]}')"
# Expected: xp_earned: 5, total: <number>

# 404 test
curl -s http://localhost:8765/api/tasks/99999 | python -c "import sys,json; d=json.load(sys.stdin); print(d['detail'])"
# Expected: Task with id 99999 not found
```

---

## Check 4 — Notes endpoints

```bash
# Courses
curl -s http://localhost:8765/api/notes/courses | python -c "import sys,json; d=json.load(sys.stdin); print(f'courses: {len(d)}')"
# Expected: courses: 3 (or more)

# Folders
curl -s http://localhost:8765/api/notes/courses/1/folders | python -c "import sys,json; d=json.load(sys.stdin); print(f'folders: {len(d)}')"
# Expected: folders: 1 or more

# Files in folder
curl -s http://localhost:8765/api/notes/folders/1/files | python -c "import sys,json; d=json.load(sys.stdin); print(f'files: {len(d)}')"
# Expected: files: 0 or more (depends on what you indexed in Phase 1B)
```

---

## Check 5 — Stats endpoints

```bash
curl -s http://localhost:8765/api/stats/overview \
  | python -c "import sys,json; d=json.load(sys.stdin); print(f'tasks_completed={d[\"tasks_completed\"]}, xp={d[\"total_xp\"]}, streak={d[\"current_streak\"]}')"
# Expected: all three values are non-zero numbers

curl -s "http://localhost:8765/api/stats/activity?days=7" \
  | python -c "import sys,json; d=json.load(sys.stdin); print(f'days returned: {len(d)}')"
# Expected: days returned: 7

curl -s http://localhost:8765/api/stats/breakdown \
  | python -c "import sys,json; d=json.load(sys.stdin); print('breakdown keys:', list(d.keys()))"
# Expected: breakdown keys: ['by_type', 'by_status']
```

---

## Check 6 — Leaderboard endpoints

```bash
curl -s http://localhost:8765/api/leaderboard \
  | python -c "import sys,json; d=json.load(sys.stdin); print(f'rank 1: {d[0][\"name\"]} ({d[0][\"xp\"]} XP)')"
# Expected: rank 1: Raghav Sethi (2375 XP or similar)

curl -s "http://localhost:8765/api/leaderboard?period=weekly" \
  | python -c "import sys,json; d=json.load(sys.stdin); print(f'weekly entries: {len(d)}')"
# Expected: weekly entries: 1 or more

curl -s http://localhost:8765/api/leaderboard/me \
  | python -c "import sys,json; d=json.load(sys.stdin); print(f'my rank: {d[\"rank\"]}, level: {d[\"level\"]}')"
# Expected: rank and level are integers
```

---

## Check 7 — Schedule endpoints

```bash
curl -s "http://localhost:8765/api/schedule?from=2026-01-01&to=2026-12-31" \
  | python -c "import sys,json; d=json.load(sys.stdin); print(f'events: {len(d)}')"
# Expected: events: 7 (seed data + any you added)

curl -s http://localhost:8765/api/schedule/week \
  | python -c "import sys,json; d=json.load(sys.stdin); print(f'week events: {len(d)}')"
# Expected: week events: number (0+ is fine)

# Create event
curl -s -X POST http://localhost:8765/api/schedule \
  -H "Content-Type: application/json" \
  -d '{"title":"Gate check event","type":"study","date":"2026-03-10","duration":60}' \
  | python -c "import sys,json; d=json.load(sys.stdin); print(f'created event id: {d[\"id\"]}')"
# Expected: created event id: <number>
```

---

## Check 8 — Profile endpoint

```bash
curl -s http://localhost:8765/api/profile \
  | python -c "import sys,json; d=json.load(sys.stdin); print(f'user: {d[\"name\"]}, level: {d[\"level\"]}')"
# Expected: user: Raghav Sethi, level: 14

curl -s http://localhost:8765/api/profile/ai-config \
  | python -c "import sys,json; d=json.load(sys.stdin); print(f'provider: {d[\"provider\"]}, groq_key_set: {d[\"groq_key_set\"]}')"
# Expected: provider: groq, groq_key_set: True (if GROQ_API_KEY is set)
```

---

## Check 9 — Quiz endpoints

```bash
curl -s http://localhost:8765/api/quizzes \
  | python -c "import sys,json; d=json.load(sys.stdin); print(f'quizzes: {len(d)}')"
# Expected: quizzes: 1 or more (from Phase 1E testing)

curl -s http://localhost:8765/api/quizzes/1 \
  | python -c "import sys,json; d=json.load(sys.stdin); print(f'questions: {len(d[\"questions\"])}')"
# Expected: questions: 5 or more
```

---

## Check 10 — SSE streaming (most important)

This check must be run manually in a terminal. The tokens must appear one by one — not all at once.

```bash
# Chatbot streaming — watch tokens appear in real time
curl -N -X POST http://localhost:8765/api/chat/conversations/1/messages \
  -H "Content-Type: application/json" \
  -d '{"content":"say exactly: hello world","provider":"groq"}'
```

Expected output (tokens stream one by one, not all dumped at once):
```
data: {"token":"hello"}
data: {"token":" world"}
data: {"done":true,"sources":[],"message_id":21}
```

✅ PASS if tokens appear progressively
❌ FAIL if response is delayed then dumps all at once (buffering issue)

```bash
# Quiz generation streaming
curl -N -X POST http://localhost:8765/api/quizzes/generate \
  -H "Content-Type: application/json" \
  -d '{"course_id":1,"n_questions":3,"difficulty":"easy","provider":"groq"}'
```

Expected output:
```
data: {"step":"Searching course materials","progress":1,"total":4}
data: {"step":"Building quiz prompt","progress":2,"total":4}
data: {"step":"Generating questions with AI","progress":3,"total":4}
data: {"step":"Saving quiz","progress":4,"total":4}
data: {"done":true,"quiz_id":3}
```

✅ PASS if progress steps appear sequentially
❌ FAIL if nothing appears until the very end

---

## Check 11 — Error handling

```bash
# 404
curl -s http://localhost:8765/api/tasks/99999 \
  | python -c "import sys,json; d=json.load(sys.stdin); assert d['detail'], 'no detail field'"
echo "404 handler: OK"

# 422 validation
curl -s -X POST http://localhost:8765/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"missing type field"}' \
  | python -c "import sys,json; d=json.load(sys.stdin); assert d['detail'], 'no detail'"
echo "422 handler: OK"

# 400 invalid state (complete an already-completed task)
# First get a completed task ID:
sqlite3 data/taskarena.db "SELECT id FROM tasks WHERE status='completed' LIMIT 1;"
# Then try to complete it again:
curl -s -X POST http://localhost:8765/api/tasks/<completed_id>/complete \
  | python -c "import sys,json; d=json.load(sys.stdin); print('400 response:', d['detail'])"
# Expected: Task is already completed
```

---

## Check 12 — No direct DB access in routers

```bash
grep -rn "db\.query\|SessionLocal\|engine\." backend/routers/
```

Expected: no matches. All DB access goes through services.

---

## Pass criteria

All 12 checks must show expected results.

If all pass, report:
```
✅ Phase 2 Gate: PASSED
All 8 routers verified.
SSE streaming confirmed working for chatbot and quiz generation.
Error handling returns correct status codes.
No direct DB access in routers.
Ready to begin Phase 3 — Frontend.
```

If any fail, report exactly which check failed and what output was produced.
