# TaskArena v2 — Phase 1E: Quiz CLI
# Depends on: Phase 0, 1A, 1B, 1C, 1D complete (RAG must work)
# Goal: AI quiz generation from indexed notes + interactive quiz-taking + scoring

---

## PROMPT

---

You are continuing to build TaskArena v2. Phases 0 through 1D are complete.

Before writing any code read these docs:
1. `docs/PROMPTS.md` — the quiz generation system prompt and user prompt templates exactly
2. `docs/DATABASE.md` — quizzes, quiz_questions, quiz_attempts schemas
3. `docs/AI_GUIDE.md` — get_ai() factory, using complete() for structured JSON output
4. `docs/CONVENTIONS.md` — service rules

Your job is **Phase 1E only** — the Quiz CLI. Build exactly these files:

```
features/quiz/schemas.py
features/quiz/generator.py
features/quiz/service.py
features/quiz/cli.py
features/quiz/README.md
```

---

## `features/quiz/schemas.py`

```python
# QuizCreate: title, course_id (int), difficulty (Literal easy/medium/hard)
# QuizOut: id, title, course_id, difficulty, created_at,
#          question_count (int), best_score (Optional[float]), attempt_count (int)
#          model_config = ConfigDict(from_attributes=True)

# QuestionOut: id, quiz_id, question, option_a, option_b, option_c, option_d,
#              correct, explanation, order_index

# AttemptCreate: answers (dict[int, str] — question_id → chosen option letter),
#               time_taken (int — seconds)

# AttemptResult: score (float), correct (int), total (int), xp_earned (int),
#                results (list[QuestionResult])

# QuestionResult: question_id, correct (bool), chosen (str), answer (str), explanation (str)
```

---

## `features/quiz/generator.py`

```python
class QuizGenerator:
    """
    Generates MCQ quizzes from course notes using AI.
    Uses RAG to find relevant content, then prompts AI to generate questions.
    """

    def __init__(self):
        from features.notes.indexer import Indexer
        self.indexer = Indexer()

    def get_context(self, course_id: int, folder_id: int = None, db: Session = None, n_chunks: int = 15) -> str:
        """
        Get study material context for quiz generation.
        If folder_id provided: only use chunks from files in that folder.
        Otherwise: use a broad sample from across the course.
        For broad sampling: load up to n_chunks evenly distributed chunks
        from all indexed files in the course (not similarity-based — we want coverage).
        Return formatted context string.
        """

    def build_prompt(self, context: str, n_questions: int, difficulty: str) -> str:
        """
        Use the exact prompt template from docs/PROMPTS.md quiz generation section.
        Fill in {context}, {n_questions}, {difficulty}.
        Return the complete prompt string.
        """

    def _parse_response(self, raw: str) -> dict:
        """
        Parse AI JSON response.
        Strip ```json ... ``` fences if present.
        Parse with json.loads.
        Validate structure: must have "questions" list with required fields.
        Raise ValueError with helpful message if structure is wrong.
        """

    async def generate(
        self,
        course_id: int,
        db: Session,
        n_questions: int = 10,
        difficulty: str = "medium",
        folder_id: int = None,
        provider: str = "groq",
        progress_callback = None,  # callable(step: str, current: int, total: int)
    ) -> dict:
        """
        Full generation pipeline:
        1. progress_callback("Searching course materials", 1, 4)
        2. Get context via self.get_context()
        3. progress_callback("Building quiz prompt", 2, 4)
        4. Build prompt
        5. progress_callback("Generating questions with AI", 3, 4)
        6. Call ai.complete() with the prompt
           - Use system prompt from docs/PROMPTS.md
           - max_tokens = 3000
        7. progress_callback("Parsing response", 4, 4)
        8. Parse response
        9. Return dict: {title, questions: [{question, options, correct, explanation}]}

        Raise RuntimeError if context is empty (no indexed files).
        Raise ValueError if AI returns unparseable response after 2 retries.
        """
```

---

## `features/quiz/service.py`

```python
class QuizService:
    def __init__(self, db: Session):
        self.db = db
        self.generator = QuizGenerator()

    def get_quizzes(self, course_id: int = None) -> list[Quiz]:
        """
        Return all quizzes, optionally filtered by course_id.
        Include question_count, best_score, attempt_count as computed fields.
        Order by created_at desc.
        """

    def get_quiz(self, quiz_id: int) -> tuple[Quiz, list[QuizQuestion]]:
        """Return (quiz, questions_ordered_by_index). Raise ValueError if not found."""

    def delete_quiz(self, quiz_id: int) -> None:

    async def generate_quiz(
        self,
        course_id: int,
        n_questions: int = 10,
        difficulty: str = "medium",
        folder_id: int = None,
        provider: str = "groq",
        progress_callback = None,
    ) -> Quiz:
        """
        1. Call generator.generate() with all params + progress_callback
        2. Create Quiz record with title from generator output
        3. Create QuizQuestion records for each question
        4. Return the saved Quiz object
        """

    def submit_attempt(self, quiz_id: int, user_id: int, answers: dict[int, str], time_taken: int) -> dict:
        """
        Grade the attempt:
        1. Load quiz questions
        2. Compare answers to correct answers
        3. Calculate score as percentage
        4. Save QuizAttempt to DB (answers as JSON string)
        5. Award XP based on score + difficulty:
           - easy:   20 base XP
           - medium: 35 base XP
           - hard:   50 base XP
           - perfect score (100%): +25 bonus XP
           Use TaskService._award_xp pattern — import User and XPLog directly
        6. Return AttemptResult dict with per-question breakdown

        Save answers as json.dumps({str(question_id): chosen_option}).
        """

    def get_attempts(self, quiz_id: int, user_id: int) -> list[QuizAttempt]:
        """Return attempt history for this quiz, newest first."""

    def get_best_score(self, quiz_id: int, user_id: int) -> float | None:
        """Return highest score (0-100), or None if no attempts."""
```

---

## `features/quiz/cli.py`

**Main menu:**
```
─────────────────────────────────────
  TaskArena — Quiz Hub
─────────────────────────────────────
  5 quizzes  |  12 attempts  |  avg score: 76%

  [1] View all quizzes
  [2] Generate new quiz
  [3] Take a quiz
  [4] View results
  [q] Quit
```

**View quizzes (option 1):**
```
  ID   Title                               Course          Diff    Qs  Best    Tries
  ──   ──────────────────────────────────  ──────────────  ──────  ──  ──────  ─────
  1    Classical Mechanics Prep            Physics 201     medium  10  73.0%   2
  2    Thermodynamics Essentials           Physics 201     hard    8   —       0
```

**Generate quiz (option 2):**
1. Pick course from numbered list
2. Pick folder or "All folders"
3. Pick difficulty: easy / medium / hard
4. How many questions? (5–20, default 10)
5. Show provider currently active, offer to change
6. Then show live generation progress:
```
  Generating quiz... (this may take 30–90 seconds)
  ────────────────────────────────────────────────
  ✓ Searching course materials
  ✓ Building quiz prompt
  ⟳ Generating questions with AI...
```
(update in-place using `\r` or reprint line with status)

7. On completion:
```
  ✓ Quiz generated: "Classical Mechanics — Thermodynamics Focus"
    10 questions  |  medium difficulty  |  Physics 201
  Start it now? [Y/n]:
```

**Take a quiz (option 3):**
1. Show quiz list → pick one
2. Optionally show existing best score
3. Begin:

```
──────────────────────────────────────────────────────────────────
  Classical Mechanics Prep  |  medium  |  Q 3 of 10
──────────────────────────────────────────────────────────────────

  What does Newton's third law state about interaction forces?

    a) Forces cause objects to accelerate
    b) Every action has an equal and opposite reaction
    c) Objects at rest remain at rest unless acted upon
    d) Force equals mass times acceleration

  Your answer (a/b/c/d): _
```

After each answer:
```
  ✓ Correct! (+10 XP toward quiz total)
    Explanation: Newton's third law describes force pairs...

  Press Enter for next question...
```
or:
```
  ✗ Incorrect. Correct answer: b
    Explanation: Newton's third law describes force pairs...

  Press Enter for next question...
```

After all questions — results screen:
```
──────────────────────────────────────────────────────────────────
  Quiz Complete!
──────────────────────────────────────────────────────────────────
  Score:     7 / 10  (70.0%)
  XP Earned: 35
  Time:      4m 12s
  Best ever: 73.0%  (this attempt: new best? no)

  Question breakdown:
  Q1  ✓  What is Newton's first law...
  Q2  ✗  Calculate the net force when...  (you: c  correct: a)
  Q3  ✓  ...
  ...
──────────────────────────────────────────────────────────────────
```

**View results (option 4):**
- Pick quiz → show attempt history with date, score, time
- Highlight best attempt

---

## `features/quiz/README.md`

Cover: purpose, dependency on notes indexer (must have indexed files), how to run, test workflow, gate conditions.

---

## Verification

```bash
# Prerequisites: must have at least one course with indexed files from Phase 1B

# 1. Run the CLI
python features/quiz/cli.py

# 2. Generate a quiz from Physics 201
#    Watch progress steps appear
#    Should complete with 10 questions

# 3. Take the quiz — answer all questions

# 4. Verify DB state:
sqlite3 data/taskarena.db "SELECT id, title, difficulty FROM quizzes;"
sqlite3 data/taskarena.db "SELECT COUNT(*) FROM quiz_questions WHERE quiz_id=1;"
# Should be 10
sqlite3 data/taskarena.db "SELECT score, time_taken FROM quiz_attempts ORDER BY id DESC LIMIT 1;"
# Should show your score and time

sqlite3 data/taskarena.db "SELECT xp FROM users WHERE id=1;"
# Should have increased
```

---

## Rules

1. `generator.py` imports `Indexer` from `features.notes.indexer` — does NOT duplicate embedding logic
2. `service.py` handles XP directly using `User` and `XPLog` models — does NOT import `TaskService`
3. Quiz answers stored as JSON string in DB: `json.dumps({str(qid): answer})`
4. Score calculation: `(correct_count / total_questions) * 100`, rounded to 1 decimal
5. Timer starts when first question is shown, ends when last answer submitted
6. If AI returns fewer questions than requested, save what was returned (minimum 3 — raise error if fewer)
7. Do not modify any file outside `features/quiz/`

---

## Done when

- [ ] CLI runs, quiz list shows (empty at first)
- [ ] Generate a quiz — progress steps print, quiz saved to DB
- [ ] Take a quiz — questions print one by one, feedback shown per answer
- [ ] Results screen shows score, XP earned, per-question breakdown
- [ ] `quiz_attempts` table has the attempt with correct score
- [ ] `users.xp` increased after completing quiz
- [ ] Attempting to generate with no indexed files gives a clear error
