# TaskArena v2 — Database

## Overview

Single SQLite file at `data/taskarena.db`. Managed entirely through SQLAlchemy + Alembic.

**Rule:** Never manually edit the DB schema. All changes go through `alembic revision --autogenerate`.

---

## Setup

```bash
# First time
alembic upgrade head

# After any model change
alembic revision --autogenerate -m "describe the change"
alembic upgrade head

# Reset completely (dev only)
python scripts/reset_db.py
alembic upgrade head
python scripts/seed.py
```

---

## Full Schema

### users
Primary user profile. Single user in v2 (id=1), but schema is multi-user ready.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT NOT NULL | Display name |
| email | TEXT UNIQUE | Optional |
| level | INTEGER DEFAULT 1 | Derived from XP thresholds |
| xp | INTEGER DEFAULT 0 | Total XP earned all time |
| streak | INTEGER DEFAULT 0 | Current consecutive active days |
| last_active | DATE | Updated when any task is completed |
| created_at | DATETIME | |

---

### courses
Study courses the user is enrolled in.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK → users | |
| name | TEXT NOT NULL | e.g. "Physics 201" |
| code | TEXT | e.g. "PHYS201" |
| color | TEXT DEFAULT '#3b82f6' | Hex color for UI |
| created_at | DATETIME | |

---

### folders
Folders inside a course for organizing files.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| course_id | INTEGER FK → courses CASCADE | |
| name | TEXT NOT NULL | e.g. "Chapter 3 — Thermodynamics" |
| order_index | INTEGER DEFAULT 0 | For manual reordering |

---

### files
Individual study files inside folders.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| folder_id | INTEGER FK → folders CASCADE | |
| name | TEXT NOT NULL | Display name |
| path | TEXT NOT NULL | Absolute local file path |
| size | INTEGER | File size in bytes |
| indexed | BOOLEAN DEFAULT FALSE | Has the RAG indexer processed this? |
| indexed_at | DATETIME | When indexing completed |
| created_at | DATETIME | |

---

### file_chunks
RAG chunks from indexed files. One file → many chunks.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| file_id | INTEGER FK → files CASCADE | |
| content | TEXT NOT NULL | Raw text content of this chunk |
| chunk_index | INTEGER | Order within the file |
| embedding | BLOB | SciBERT embedding as numpy array bytes |

**Query pattern:** Embed the user's query, compute cosine similarity against all embeddings for a given course, return top-k chunks as context.

---

### tasks
User tasks — assignments, study sessions, productivity items.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK → users | |
| title | TEXT NOT NULL | |
| subject | TEXT | Freeform subject label |
| type | TEXT | CHECK: 'assignment', 'study', 'productivity' |
| status | TEXT DEFAULT 'pending' | CHECK: 'pending', 'completed' |
| deadline | DATE | |
| points | INTEGER DEFAULT 5 | XP awarded on completion |
| course_id | INTEGER FK → courses | Optional link to a course |
| created_at | DATETIME | |
| completed_at | DATETIME | Set when status → 'completed' |

---

### schedule_events
Calendar events — manually created or AI-suggested.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK → users | |
| title | TEXT NOT NULL | |
| type | TEXT | CHECK: 'study', 'assignment', 'exam', 'break', 'other' |
| course_id | INTEGER FK → courses | Optional |
| date | DATE NOT NULL | |
| start_time | TIME | HH:MM format |
| duration | INTEGER | Minutes |
| notes | TEXT | Optional notes |
| ai_suggested | BOOLEAN DEFAULT FALSE | Was this created by AI suggestions? |
| created_at | DATETIME | |

---

### chat_conversations
A named conversation session in the AI Tutor.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK → users | |
| title | TEXT | Auto-generated from first message |
| context_course_id | INTEGER FK → courses | Which course's files to use for RAG |
| created_at | DATETIME | |
| updated_at | DATETIME | Updated on each new message |

---

### chat_messages
Individual messages within a conversation.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| conversation_id | INTEGER FK → chat_conversations CASCADE | |
| role | TEXT | CHECK: 'user', 'assistant' |
| content | TEXT NOT NULL | Full message text |
| sources | TEXT | JSON array of cited filenames e.g. `["Physics Ch4.pdf"]` |
| model_used | TEXT | e.g. 'qwen2.5-local', 'llama-3.3-70b-versatile' |
| created_at | DATETIME | |

---

### quizzes
An AI-generated quiz attached to a course.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| course_id | INTEGER FK → courses | |
| title | TEXT NOT NULL | |
| difficulty | TEXT | CHECK: 'easy', 'medium', 'hard' |
| created_at | DATETIME | |

---

### quiz_questions
Individual MCQ questions within a quiz.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| quiz_id | INTEGER FK → quizzes CASCADE | |
| question | TEXT NOT NULL | The question text |
| option_a | TEXT NOT NULL | |
| option_b | TEXT NOT NULL | |
| option_c | TEXT NOT NULL | |
| option_d | TEXT NOT NULL | |
| correct | TEXT NOT NULL | CHECK: 'a', 'b', 'c', 'd' |
| explanation | TEXT | Why the correct answer is correct |
| order_index | INTEGER | |

---

### quiz_attempts
A user's attempt at taking a quiz.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| quiz_id | INTEGER FK → quizzes | |
| user_id | INTEGER FK → users | |
| score | REAL | Percentage 0.0–100.0 |
| answers | TEXT | JSON: `{"question_id": "chosen_option", ...}` |
| time_taken | INTEGER | Seconds |
| taken_at | DATETIME | |

---

### xp_log
Audit trail of every XP award.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK → users | |
| amount | INTEGER | XP earned |
| reason | TEXT | Human-readable e.g. "Completed task: Essay draft" |
| logged_at | DATETIME | Used for weekly leaderboard and stats |

---

## Entity Relationships

```
users
  ├── courses (1:many)
  │     ├── folders (1:many)
  │     │     └── files (1:many)
  │     │           └── file_chunks (1:many)   ← RAG index
  │     └── quizzes (1:many)
  │           ├── quiz_questions (1:many)
  │           └── quiz_attempts (1:many)
  ├── tasks (1:many)
  ├── schedule_events (1:many)
  ├── chat_conversations (1:many)
  │     └── chat_messages (1:many)
  └── xp_log (1:many)
```

---

## Common Queries

```sql
-- Tasks due in next 3 days (for AI schedule suggestions)
SELECT * FROM tasks
WHERE user_id = 1
  AND status = 'pending'
  AND deadline BETWEEN date('now') AND date('now', '+3 days')
ORDER BY deadline ASC;

-- XP earned this week (for weekly leaderboard)
SELECT user_id, SUM(amount) as weekly_xp
FROM xp_log
WHERE logged_at >= date('now', '-7 days')
GROUP BY user_id
ORDER BY weekly_xp DESC;

-- Most recent conversation messages (for chat context)
SELECT role, content FROM chat_messages
WHERE conversation_id = ?
ORDER BY created_at ASC
LIMIT 20;

-- Files that need indexing
SELECT * FROM files WHERE indexed = FALSE;

-- Quiz best score per user
SELECT quiz_id, MAX(score) as best_score
FROM quiz_attempts
WHERE user_id = 1
GROUP BY quiz_id;
```

---

## XP Level Thresholds

| Level | XP Required |
|---|---|
| 1 | 0 |
| 2 | 100 |
| 3 | 250 |
| 4 | 500 |
| 5 | 850 |
| 6 | 1,300 |
| 7 | 1,900 |
| 8 | 2,700 |
| 9 | 3,700 |
| 10 | 5,000 |
| 11+ | prev + (level × 700) |

```python
def xp_for_level(level: int) -> int:
    thresholds = [0, 100, 250, 500, 850, 1300, 1900, 2700, 3700, 5000]
    if level <= len(thresholds):
        return thresholds[level - 1]
    return thresholds[-1] + sum((l * 700) for l in range(11, level + 1))
```

## XP Rewards

| Action | XP |
|---|---|
| Complete assignment task | 15 |
| Complete study task | 10 |
| Complete productivity task | 5 |
| Complete quiz (easy) | 20 |
| Complete quiz (medium) | 35 |
| Complete quiz (hard) | 50 |
| Perfect quiz score | +25 bonus |
| 7-day streak maintained | 50 |
| Add + index a new file | 5 |
