from __future__ import annotations

import json
from datetime import date, datetime, timedelta

from sqlalchemy import case, func
from sqlalchemy.orm import Session

import features.chatbot.models  # noqa: F401
import features.notes.models  # noqa: F401
import features.schedule.models  # noqa: F401
import features.tasks.models  # noqa: F401
import shared.user_model  # noqa: F401
from features.quiz.generator import QuizGenerator
from features.quiz.models import Quiz, QuizAttempt, QuizQuestion
from features.tasks.models import XPLog
from shared.user_model import User


class QuizService:
    def __init__(self, db: Session):
        self.db = db
        self.generator = QuizGenerator()

    def get_quizzes(self, course_id: int = None, user_id: int | None = None) -> list[Quiz]:
        """
        Return all quizzes, optionally filtered by course_id.
        Include question_count, best_score, attempt_count as computed fields.
        Order by created_at desc.
        """
        query = self.db.query(Quiz)
        if course_id is not None:
            query = query.filter(Quiz.course_id == course_id)
        quizzes = query.order_by(Quiz.created_at.desc(), Quiz.id.desc()).all()
        if not quizzes:
            return []

        quiz_ids = [quiz.id for quiz in quizzes]
        question_rows = (
            self.db.query(
                QuizQuestion.quiz_id.label("quiz_id"),
                func.count(QuizQuestion.id).label("question_count"),
            )
            .filter(QuizQuestion.quiz_id.in_(quiz_ids))
            .group_by(QuizQuestion.quiz_id)
            .all()
        )
        attempt_query = (
            self.db.query(
                QuizAttempt.quiz_id.label("quiz_id"),
                func.count(QuizAttempt.id).label("attempt_count"),
                func.max(QuizAttempt.score).label("best_score"),
            )
            .filter(QuizAttempt.quiz_id.in_(quiz_ids))
        )
        if user_id is not None:
            attempt_query = attempt_query.filter(QuizAttempt.user_id == user_id)
        attempt_rows = attempt_query.group_by(QuizAttempt.quiz_id).all()

        question_counts = {row.quiz_id: int(row.question_count or 0) for row in question_rows}
        attempt_counts = {row.quiz_id: int(row.attempt_count or 0) for row in attempt_rows}
        best_scores = {
            row.quiz_id: (round(float(row.best_score), 1) if row.best_score is not None else None)
            for row in attempt_rows
        }

        for quiz in quizzes:
            quiz.question_count = question_counts.get(quiz.id, 0)
            quiz.attempt_count = attempt_counts.get(quiz.id, 0)
            quiz.best_score = best_scores.get(quiz.id)

        return quizzes

    def get_quiz(self, quiz_id: int) -> tuple[Quiz, list[QuizQuestion]]:
        """Return (quiz, questions_ordered_by_index). Raise ValueError if not found."""
        quiz = self.db.get(Quiz, quiz_id)
        if not quiz:
            raise ValueError(f"Quiz with id {quiz_id} not found")

        questions = (
            self.db.query(QuizQuestion)
            .filter(QuizQuestion.quiz_id == quiz_id)
            .order_by(
                case((QuizQuestion.order_index.is_(None), 1), else_=0),
                QuizQuestion.order_index.asc(),
                QuizQuestion.id.asc(),
            )
            .all()
        )
        return quiz, questions

    def delete_quiz(self, quiz_id: int) -> None:
        quiz, _ = self.get_quiz(quiz_id)
        self.db.delete(quiz)
        self.db.commit()

    async def generate_quiz(
        self,
        course_id: int,
        n_questions: int = 10,
        difficulty: str = "medium",
        folder_id: int = None,
        provider: str = "groq",
        progress_callback=None,
    ) -> Quiz:
        """
        1. Call generator.generate() with all params + progress_callback
        2. Create Quiz record with title from generator output
        3. Create QuizQuestion records for each question
        4. Return the saved Quiz object
        """
        generated = await self.generator.generate(
            course_id=course_id,
            db=self.db,
            n_questions=n_questions,
            difficulty=difficulty,
            folder_id=folder_id,
            provider=provider,
            progress_callback=progress_callback,
        )

        questions = generated.get("questions", [])
        if len(questions) < 3:
            raise ValueError("AI returned fewer than 3 questions. Try again.")

        title = str(generated.get("title", "")).strip() or "Generated Quiz"
        quiz = Quiz(course_id=course_id, title=title, difficulty=difficulty)
        self.db.add(quiz)
        self.db.flush()

        for index, question in enumerate(questions, start=1):
            options = question["options"]
            self.db.add(
                QuizQuestion(
                    quiz_id=quiz.id,
                    question=question["question"],
                    option_a=options["a"],
                    option_b=options["b"],
                    option_c=options["c"],
                    option_d=options["d"],
                    correct=question["correct"],
                    explanation=question["explanation"],
                    order_index=index,
                )
            )

        self.db.commit()
        self.db.refresh(quiz)
        return quiz

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
           Use TaskService._award_xp pattern - import User and XPLog directly
        6. Return AttemptResult dict with per-question breakdown

        Save answers as json.dumps({str(question_id): chosen_option}).
        """
        quiz, questions = self.get_quiz(quiz_id)
        if not questions:
            raise ValueError("Quiz has no questions.")
        if time_taken < 0:
            raise ValueError("time_taken must be >= 0")

        normalized_answers: dict[str, str] = {}
        for qid, choice in answers.items():
            letter = str(choice).strip().lower()
            if letter in {"a", "b", "c", "d"}:
                normalized_answers[str(qid)] = letter

        correct_count = 0
        results: list[dict] = []
        for question in questions:
            chosen = normalized_answers.get(str(question.id), "")
            is_correct = chosen == question.correct
            if is_correct:
                correct_count += 1

            results.append(
                {
                    "question_id": question.id,
                    "correct": is_correct,
                    "chosen": chosen,
                    "answer": question.correct,
                    "explanation": question.explanation or "",
                }
            )

        total = len(questions)
        score = round((correct_count / total) * 100, 1)

        attempt = QuizAttempt(
            quiz_id=quiz_id,
            user_id=user_id,
            score=score,
            answers=json.dumps(normalized_answers),
            time_taken=time_taken,
        )
        self.db.add(attempt)

        xp_base = {"easy": 20, "medium": 35, "hard": 50}[quiz.difficulty]
        xp_earned = xp_base + (25 if score == 100.0 else 0)
        self._award_xp(
            user_id=user_id,
            amount=xp_earned,
            reason=f"Completed quiz: {quiz.title} ({score}%)",
        )

        self.db.commit()
        self.db.refresh(attempt)

        return {
            "score": score,
            "correct": correct_count,
            "total": total,
            "xp_earned": xp_earned,
            "results": results,
        }

    def get_attempts(self, quiz_id: int, user_id: int) -> list[QuizAttempt]:
        """Return attempt history for this quiz, newest first."""
        return (
            self.db.query(QuizAttempt)
            .filter(
                QuizAttempt.quiz_id == quiz_id,
                QuizAttempt.user_id == user_id,
            )
            .order_by(QuizAttempt.taken_at.desc(), QuizAttempt.id.desc())
            .all()
        )

    def get_best_score(self, quiz_id: int, user_id: int) -> float | None:
        """Return highest score (0-100), or None if no attempts."""
        best = (
            self.db.query(func.max(QuizAttempt.score))
            .filter(
                QuizAttempt.quiz_id == quiz_id,
                QuizAttempt.user_id == user_id,
            )
            .scalar()
        )
        if best is None:
            return None
        return round(float(best), 1)

    def _get_user(self, user_id: int) -> User:
        user = self.db.get(User, user_id)
        if not user:
            raise ValueError(f"User with id {user_id} not found")
        return user

    def _award_xp(self, user_id: int, amount: int, reason: str) -> int:
        user = self._get_user(user_id)
        user.xp += amount
        self._update_streak(user)
        self.db.add(
            XPLog(
                user_id=user_id,
                amount=amount,
                reason=reason,
                logged_at=datetime.utcnow(),
            )
        )
        return amount

    def _update_streak(self, user: User) -> None:
        today = date.today()
        yesterday = today - timedelta(days=1)

        if user.last_active == today:
            pass
        elif user.last_active == yesterday:
            user.streak += 1
        else:
            user.streak = 1

        user.last_active = today

        level = 1
        while user.xp >= self._xp_for_level(level + 1):
            level += 1
        user.level = level

    def _xp_for_level(self, level: int) -> int:
        if level < 1:
            raise ValueError("Level must be >= 1")

        thresholds = [0, 100, 250, 500, 850, 1300, 1900, 2700, 3700, 5000]
        if level <= len(thresholds):
            return thresholds[level - 1]

        xp_required = thresholds[-1]
        for current_level in range(11, level + 1):
            xp_required += current_level * 700
        return xp_required
