# TaskArena v2 — API Reference

Base URL: `http://localhost:8765`  
Interactive docs: `http://localhost:8765/docs`  
All requests/responses use JSON unless noted.

---

## Tasks

### GET /api/tasks
List tasks for the current user.

**Query params:**
| Param | Type | Options |
|---|---|---|
| type | string | `assignment`, `study`, `productivity` |
| status | string | `pending`, `completed` |

**Response:** `Task[]`
```json
[
  {
    "id": 1,
    "title": "Essay on Renaissance Art",
    "subject": "Art History",
    "type": "assignment",
    "status": "pending",
    "deadline": "2026-03-10",
    "points": 15,
    "course_id": 3,
    "created_at": "2026-03-02T14:00:00"
  }
]
```

---

### POST /api/tasks
Create a new task.

**Body:**
```json
{
  "title": "Problem Set 3",
  "subject": "Physics",
  "type": "assignment",
  "deadline": "2026-03-15",
  "points": 20,
  "course_id": 1
}
```

**Response:** `Task` (201 Created)

---

### PATCH /api/tasks/{id}
Update task fields.

**Body:** (all optional)
```json
{
  "title": "Updated title",
  "deadline": "2026-03-20",
  "status": "completed"
}
```

**Response:** `Task`

---

### POST /api/tasks/{id}/complete
Mark a task as complete and award XP.

**Response:**
```json
{
  "task": { ...Task },
  "xp_earned": 15,
  "new_total_xp": 340,
  "leveled_up": false
}
```

---

### DELETE /api/tasks/{id}
Delete a task.

**Response:** 204 No Content

---

## Chatbot

### GET /api/conversations
List all conversations.

**Response:** `Conversation[]`
```json
[
  {
    "id": 1,
    "title": "Newtonian Mechanics",
    "context_course_id": 1,
    "created_at": "2026-03-01T10:00:00",
    "updated_at": "2026-03-02T14:30:00",
    "message_count": 12
  }
]
```

---

### POST /api/conversations
Create a new conversation.

**Body:**
```json
{
  "title": "Organic Chemistry Help",
  "context_course_id": 2
}
```

**Response:** `Conversation` (201)

---

### GET /api/conversations/{id}/messages
Get all messages in a conversation.

**Response:** `Message[]`
```json
[
  {
    "id": 1,
    "conversation_id": 1,
    "role": "user",
    "content": "Explain Newton's third law",
    "sources": [],
    "model_used": null,
    "created_at": "2026-03-02T14:00:00"
  },
  {
    "id": 2,
    "conversation_id": 1,
    "role": "assistant",
    "content": "Newton's third law states...",
    "sources": ["Physics Ch4 — Newton's Laws.pdf"],
    "model_used": "llama-3.3-70b-versatile",
    "created_at": "2026-03-02T14:00:05"
  }
]
```

---

### POST /api/conversations/{id}/messages
Send a message. **Returns SSE stream.**

**Body:**
```json
{
  "content": "Explain Newton's third law",
  "provider": "groq",
  "model": "llama-3.3-70b-versatile"
}
```

**Response:** `text/event-stream`
```
data: {"token": "Newton"}

data: {"token": "'s"}

data: {"token": " third"}

data: {"token": " law"}

data: {"done": true, "sources": ["Physics Ch4.pdf"], "message_id": 42}
```

**Testing with curl:**
```bash
curl -N -X POST http://localhost:8765/api/conversations/1/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "hello", "provider": "groq"}'
```

---

### DELETE /api/conversations/{id}
Delete a conversation and all its messages.

**Response:** 204

---

## Schedule

### GET /api/schedule
Get events within a date range.

**Query params:**
| Param | Type | Example |
|---|---|---|
| from | date | `2026-03-01` |
| to | date | `2026-03-31` |

**Response:** `ScheduleEvent[]`
```json
[
  {
    "id": 1,
    "title": "Study: Thermodynamics Ch.7",
    "type": "study",
    "course_id": 1,
    "date": "2026-03-02",
    "start_time": "19:00",
    "duration": 90,
    "notes": null,
    "ai_suggested": false
  }
]
```

---

### POST /api/schedule
Create an event.

**Body:**
```json
{
  "title": "Physics Midterm",
  "type": "exam",
  "course_id": 1,
  "date": "2026-03-10",
  "start_time": "10:00",
  "duration": 120
}
```

**Response:** `ScheduleEvent` (201)

---

### PATCH /api/schedule/{id}
Update an event.

**Response:** `ScheduleEvent`

---

### DELETE /api/schedule/{id}
Delete an event.

**Response:** 204

---

### GET /api/schedule/suggestions
Get AI-generated study block suggestions based on upcoming task deadlines.

**Response:**
```json
{
  "suggestions": [
    {
      "title": "Study: Thermodynamics Ch.7",
      "type": "study",
      "date": "2026-03-04",
      "start_time": "19:00",
      "duration": 90,
      "course": "Physics 201",
      "reason": "Midterm in 2 days — needs 2 more focused sessions",
      "priority": "high"
    }
  ]
}
```

---

### POST /api/schedule/suggestions/accept
Accept a suggestion and create it as a real event.

**Body:** (a suggestion object from the above endpoint)
```json
{
  "title": "Study: Thermodynamics Ch.7",
  "type": "study",
  "date": "2026-03-04",
  "start_time": "19:00",
  "duration": 90,
  "course_id": 1
}
```

**Response:** `ScheduleEvent` (201)

---

## Notes

### GET /api/courses
List courses.

**Response:** `Course[]`

---

### POST /api/courses
Create a course.

**Body:**
```json
{
  "name": "Physics 201",
  "code": "PHYS201",
  "color": "#3b82f6"
}
```

---

### GET /api/courses/{id}/folders
List folders in a course.

---

### POST /api/courses/{id}/folders
Create a folder.

**Body:** `{ "name": "Chapter 3 — Thermodynamics" }`

---

### GET /api/folders/{id}/files
List files in a folder.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Lecture Notes Week 3.pdf",
    "path": "/Users/user/Documents/Physics/week3.pdf",
    "size": 245000,
    "indexed": true,
    "indexed_at": "2026-03-01T12:00:00"
  }
]
```

---

### POST /api/folders/{id}/files
Add a file to a folder. Triggers indexing in background.

**Body:** `multipart/form-data` OR JSON path:
```json
{ "name": "Lecture Notes Week 3.pdf", "path": "/absolute/path/to/file.pdf" }
```

**Response:** `File` (201) — `indexed` will be `false` initially

---

### POST /api/files/{id}/index
Re-index a file (if indexing failed or file was updated).

**Response:**
```json
{ "file_id": 1, "chunks_created": 24, "indexed_at": "2026-03-02T15:00:00" }
```

---

### DELETE /api/files/{id}
Delete file record and all its chunks.

**Response:** 204

---

## Quiz

### GET /api/quizzes
List all quizzes.

**Query params:** `course_id` (optional)

**Response:** `Quiz[]` with `best_score` and `attempt_count` included.

---

### POST /api/quizzes/generate
Generate a quiz using AI. **Returns SSE stream** with progress events.

**Body:**
```json
{
  "course_id": 1,
  "folder_id": null,
  "n_questions": 10,
  "difficulty": "medium",
  "provider": "groq"
}
```

**Response:** `text/event-stream`
```
data: {"step": "Searching course materials", "progress": 1, "total": 4}

data: {"step": "Extracting key concepts", "progress": 2, "total": 4}

data: {"step": "Generating questions", "progress": 3, "total": 4}

data: {"step": "Saving quiz", "progress": 4, "total": 4}

data: {"done": true, "quiz_id": 5, "question_count": 10}
```

---

### GET /api/quizzes/{id}
Get quiz with all questions.

**Response:** `Quiz` with `questions: QuizQuestion[]`

---

### POST /api/quizzes/{id}/attempts
Submit a completed quiz attempt.

**Body:**
```json
{
  "answers": {
    "1": "b",
    "2": "a",
    "3": "d"
  },
  "time_taken": 342
}
```

**Response:**
```json
{
  "score": 73.3,
  "correct": 7,
  "total": 10,
  "xp_earned": 35,
  "results": [
    {
      "question_id": 1,
      "correct": true,
      "chosen": "b",
      "answer": "b",
      "explanation": "..."
    }
  ]
}
```

---

### GET /api/quizzes/{id}/attempts
Get attempt history for a quiz.

---

### DELETE /api/quizzes/{id}
Delete a quiz and all its questions/attempts.

**Response:** 204

---

## Leaderboard

### GET /api/leaderboard
Get rankings.

**Query params:** `limit` (default 10), `period` (`alltime` | `weekly`)

**Response:**
```json
[
  {
    "rank": 1,
    "user_id": 1,
    "name": "Raghav Sethi",
    "level": 14,
    "xp": 2340,
    "tasks_completed": 87,
    "streak": 12
  }
]
```

---

## Statistics

### GET /api/stats/overview
Summary stats for the current user.

**Response:**
```json
{
  "tasks_completed": 42,
  "tasks_pending": 8,
  "total_xp": 1240,
  "current_streak": 7,
  "longest_streak": 12,
  "quizzes_taken": 5,
  "avg_quiz_score": 80.4,
  "rank": 1
}
```

---

### GET /api/stats/activity
Daily activity for chart data.

**Query params:** `days` (default 7, max 90)

**Response:**
```json
[
  { "date": "2026-02-24", "tasks_completed": 4, "xp_earned": 45 },
  { "date": "2026-02-25", "tasks_completed": 7, "xp_earned": 80 }
]
```

---

### GET /api/stats/breakdown
Task breakdown by type and status.

**Response:**
```json
{
  "by_type": {
    "assignment": { "completed": 12, "pending": 3 },
    "study": { "completed": 8, "pending": 4 },
    "productivity": { "completed": 5, "pending": 1 }
  }
}
```

---

## Profile

### GET /api/profile
Get current user profile.

---

### PATCH /api/profile
Update profile.

**Body:** (all optional)
```json
{
  "name": "Raghav Sethi",
  "email": "raghav@example.com"
}
```

---

### GET /api/profile/ai-config
Get current AI provider configuration.

**Response:**
```json
{
  "provider": "groq",
  "model": "llama-3.3-70b-versatile",
  "groq_key_set": true,
  "local_model_loaded": false,
  "ollama_available": false
}
```

---

### PATCH /api/profile/ai-config
Update AI configuration.

**Body:**
```json
{
  "provider": "groq",
  "model": "llama-3.1-8b-instant",
  "groq_api_key": "gsk_..."
}
```

---

## Error Responses

| Status | When |
|---|---|
| 400 | Bad request (malformed body) |
| 404 | Resource not found |
| 422 | Validation error (missing/wrong type field) — body contains details |
| 500 | Server error — check uvicorn logs |

All errors follow:
```json
{ "detail": "Human readable error message" }
```

422 errors include field-level details:
```json
{
  "detail": [
    {
      "loc": ["body", "type"],
      "msg": "Input should be 'assignment', 'study' or 'productivity'",
      "type": "literal_error"
    }
  ]
}
```
