# TaskArena v2 — Phase 1 Gate Check
# Run this BEFORE starting Phase 2
# Every item must pass. No exceptions.

---

## PROMPT

---

You are checking whether TaskArena v2 Phase 1 is complete and ready for Phase 2.

Do not build anything new. Do not fix features. This is a verification pass only.

Run each check below. Report the result of every single one. If anything fails, stop and report what failed — do not proceed to say "ready for Phase 2" until every check passes.

---

## Checks

### 1. File structure — confirm all these files exist:

```
features/tasks/schemas.py
features/tasks/service.py
features/tasks/cli.py
features/tasks/README.md

features/notes/schemas.py
features/notes/service.py
features/notes/indexer.py
features/notes/cli.py
features/notes/README.md

features/chatbot/schemas.py
features/chatbot/ai_service.py
features/chatbot/rag_service.py
features/chatbot/service.py
features/chatbot/cli.py
features/chatbot/README.md

features/schedule/schemas.py
features/schedule/ai_suggestions.py
features/schedule/service.py
features/schedule/cli.py
features/schedule/README.md

features/quiz/schemas.py
features/quiz/generator.py
features/quiz/service.py
features/quiz/cli.py
features/quiz/README.md

features/leaderboard/schemas.py
features/leaderboard/service.py
features/leaderboard/cli.py
features/leaderboard/README.md

features/stats/schemas.py
features/stats/service.py
features/stats/cli.py
features/stats/README.md
```

### 2. No forbidden imports in service files

Run this check — none of these should appear in any `service.py` file:

```bash
grep -rn "from fastapi\|import fastapi\|from click\|import click\|from rich\|import rich\|print(\|input(" features/*/service.py
```

Expected output: nothing (no matches). Any match is a violation.

### 3. No cross-feature service imports

```bash
grep -rn "from features\." features/tasks/service.py features/schedule/service.py features/leaderboard/service.py features/stats/service.py
```

Expected output: nothing. (Chatbot and quiz importing from notes.indexer is the only allowed exception.)

### 4. Database integrity

```bash
sqlite3 data/taskarena.db "
SELECT 'users' as tbl, COUNT(*) FROM users
UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL SELECT 'courses', COUNT(*) FROM courses
UNION ALL SELECT 'schedule_events', COUNT(*) FROM schedule_events
UNION ALL SELECT 'chat_conversations', COUNT(*) FROM chat_conversations
UNION ALL SELECT 'chat_messages', COUNT(*) FROM chat_messages
UNION ALL SELECT 'xp_log', COUNT(*) FROM xp_log;
"
```

Expected: users≥1, tasks≥5, courses≥3, schedule_events≥3, chat_conversations≥1, chat_messages≥2, xp_log≥1

### 5. XP system works

```bash
sqlite3 data/taskarena.db "SELECT name, xp, streak FROM users WHERE id=1;"
sqlite3 data/taskarena.db "SELECT COUNT(*) FROM xp_log WHERE user_id=1;"
```

xp must be > 0. xp_log must have entries.

### 6. Notes indexer works

```bash
sqlite3 data/taskarena.db "SELECT COUNT(*) FROM file_chunks;"
```

Expected: > 0 (at least one file must have been indexed during Phase 1B testing)

### 7. Quiz data exists

```bash
sqlite3 data/taskarena.db "SELECT id, title, difficulty FROM quizzes;"
sqlite3 data/taskarena.db "SELECT COUNT(*) FROM quiz_questions;"
sqlite3 data/taskarena.db "SELECT quiz_id, score, time_taken FROM quiz_attempts;"
```

Expected: at least 1 quiz, questions for it, and at least 1 attempt with a score.

### 8. Schedule AI suggestions ran at least once

```bash
sqlite3 data/taskarena.db "SELECT COUNT(*) FROM schedule_events WHERE ai_suggested=1;"
```

Expected: ≥ 1 (must have accepted at least one suggestion during Phase 1D testing)

### 9. Chat history exists

```bash
sqlite3 data/taskarena.db "SELECT id, role, substr(content,1,50) FROM chat_messages ORDER BY id;"
```

Expected: both 'user' and 'assistant' role messages present.

### 10. Import check — all CLIs importable without error

```bash
python -c "
import sys; sys.path.insert(0, '.')
from features.tasks.service import TaskService
from features.notes.service import NotesService
from features.notes.indexer import Indexer
from features.chatbot.service import ChatService
from features.chatbot.ai_service import get_ai
from features.schedule.service import ScheduleService
from features.quiz.service import QuizService
from features.leaderboard.service import LeaderboardService
from features.stats.service import StatsService
print('All imports OK')
"
```

Expected output: `All imports OK`

---

## Pass criteria

All 10 checks must show expected results.

If all pass, report:
```
✅ Phase 1 Gate: PASSED
All 7 CLI features verified.
All service files clean (no HTTP/CLI imports).
Database has real data from manual testing.
Ready to begin Phase 2 — Backend Assembly.
```

If any fail, report exactly which check failed and what the output was. Do not mark as passed.
