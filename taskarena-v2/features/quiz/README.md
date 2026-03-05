# Quiz CLI (Phase 1E)

Quiz CLI generates multiple-choice quizzes from indexed notes and supports interactive quiz-taking with scoring, attempt history, and XP rewards.

## Dependencies

- Requires Phase 1B notes indexing to be complete.
- Quiz generation needs indexed files (`files.indexed = 1` with `file_chunks` rows).
- AI provider must be configured (`groq`, `local`, or `ollama`).

If no indexed content is available, generation exits with a clear error instead of crashing.

## Run

From project root (`taskarena-v2`):

```bash
python features/quiz/cli.py
```

## Suggested Test Workflow

1. Ensure at least one course has indexed files from the Notes CLI.
2. Open Quiz CLI and generate a 10-question quiz.
3. Take the quiz and answer all questions.
4. Open results to confirm attempt history and best score.
5. Verify DB rows:

```bash
sqlite3 data/taskarena.db "SELECT id, title, difficulty FROM quizzes;"
sqlite3 data/taskarena.db "SELECT COUNT(*) FROM quiz_questions WHERE quiz_id=1;"
sqlite3 data/taskarena.db "SELECT score, time_taken FROM quiz_attempts ORDER BY id DESC LIMIT 1;"
sqlite3 data/taskarena.db "SELECT xp FROM users WHERE id=1;"
```

## Gate Conditions

- CLI runs and shows quiz hub menu.
- Quiz generation shows progress steps and saves quiz/questions to DB.
- Taking a quiz shows per-question feedback and final results.
- Attempt rows are saved with score/time.
- `users.xp` increases after each quiz attempt.
- Generating without indexed files shows a clear, user-friendly error.
