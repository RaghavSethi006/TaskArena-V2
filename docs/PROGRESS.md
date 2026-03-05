# TaskArena v2 — Progress Tracker

> Update this file at the end of every coding session. One line per session. Honest status only.

---

## Current Status

**Phase:** 0 — Not started  
**Last worked on:** —  
**Blocking issues:** None

---

## Session Log

| Date | What was done | Files created/changed | Status |
|---|---|---|---|
| — | Project started | — | — |

---

## Phase Gates

| Phase | Status | Date completed | Notes |
|---|---|---|---|
| Phase 0 — Bootstrap | ⬜ Not started | — | |
| Phase 1A — Tasks CLI | ⬜ Not started | — | |
| Phase 1B — Notes CLI | ⬜ Not started | — | |
| Phase 1C — Chatbot CLI | ⬜ Not started | — | |
| Phase 1D — Schedule CLI | ⬜ Not started | — | |
| Phase 1E — Quiz CLI | ⬜ Not started | — | |
| Phase 1F — Leaderboard CLI | ⬜ Not started | — | |
| Phase 1G — Stats CLI | ⬜ Not started | — | |
| Phase 2 — Backend | ⬜ Not started | — | |
| Phase 3A — Frontend shell | ⬜ Not started | — | |
| Phase 3B — Chatbot UI | ⬜ Not started | — | |
| Phase 3C — Schedule UI | ⬜ Not started | — | |
| Phase 3D — Core pages | ⬜ Not started | — | |
| Phase 3E — Remaining pages | ⬜ Not started | — | |
| Phase 3F — Polish | ⬜ Not started | — | |
| v2.0 Ship | ⬜ Not started | — | |

Legend: ⬜ Not started · 🔄 In progress · ✅ Complete · ❌ Blocked

---

## Known Issues / Blockers

_None yet. Add issues here as they come up._

---

## Decisions Made During Build

_Document any mid-build decisions that deviate from the original architecture here, so future sessions know why._

| Decision | Reason | Date |
|---|---|---|
| — | — | — |

---

## Quick Reference — Key Commands

```bash
# Start everything (Phase 2+ only)
source .venv/bin/activate
uvicorn backend.main:app --reload --port 8765 &
cd frontend && npm run tauri dev

# Run a specific CLI feature
python features/tasks/cli.py
python features/chatbot/cli.py
python features/schedule/cli.py

# Database
alembic upgrade head                              # apply migrations
alembic revision --autogenerate -m "description"  # new migration
python scripts/seed.py                            # seed test data
python scripts/reset_db.py                        # wipe and recreate
sqlite3 data/taskarena.db ".tables"               # check tables

# Check env
python -c "from dotenv import load_dotenv; import os; load_dotenv(); print('GROQ:', os.environ.get('GROQ_API_KEY', 'NOT SET')[:8])"
```
