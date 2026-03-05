from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import func

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
load_dotenv()

from features.notes.models import Course, Folder
from features.quiz.models import QuizAttempt
from features.quiz.service import QuizService
from shared.config import settings
from shared.database import SessionLocal


USER_ID = 1


def supports_text(text: str) -> bool:
    encoding = sys.stdout.encoding or "utf-8"
    try:
        text.encode(encoding)
        return True
    except UnicodeEncodeError:
        return False


def symbol(preferred: str, fallback: str) -> str:
    return preferred if supports_text(preferred) else fallback


HLINE = symbol("\u2500", "-")
CHECK = symbol("\u2713", "[OK]")
XMARK = symbol("\u2717", "[X]")
SPARKLE = symbol("\u2726", "*")
SPIN = symbol("\u27f3", "~")
EM_DASH = symbol("\u2014", "-")


def clear_screen() -> None:
    os.system("cls" if os.name == "nt" else "clear")


def pause() -> None:
    input("\nPress Enter to continue...")


def truncate(text: str, max_len: int) -> str:
    if len(text) <= max_len:
        return text
    if max_len <= 3:
        return text[:max_len]
    return text[: max_len - 3] + "..."


def fmt_score(score: float | None) -> str:
    if score is None:
        return EM_DASH
    return f"{score:.1f}%"


def fmt_seconds(seconds: int | None) -> str:
    if seconds is None:
        return "-"
    m, s = divmod(max(seconds, 0), 60)
    return f"{m}m {s:02d}s"


def menu_stats(service: QuizService) -> tuple[int, int, float]:
    total_quizzes = len(service.get_quizzes())
    total_attempts = (
        service.db.query(func.count(QuizAttempt.id))
        .filter(QuizAttempt.user_id == USER_ID)
        .scalar()
        or 0
    )
    avg_score = (
        service.db.query(func.avg(QuizAttempt.score))
        .filter(QuizAttempt.user_id == USER_ID)
        .scalar()
    )
    return total_quizzes, int(total_attempts), round(float(avg_score), 1) if avg_score else 0.0


def render_main_menu(service: QuizService) -> None:
    total_quizzes, total_attempts, avg_score = menu_stats(service)
    print(HLINE * 37)
    print("  TaskArena - Quiz Hub")
    print(HLINE * 37)
    print(f"  {total_quizzes} quizzes  |  {total_attempts} attempts  |  avg score: {avg_score:.0f}%")
    print()
    print("  [1] View all quizzes")
    print("  [2] Generate new quiz")
    print("  [3] Take a quiz")
    print("  [4] View results")
    print("  [q] Quit")


def get_courses(service: QuizService) -> list[Course]:
    return (
        service.db.query(Course)
        .filter(Course.user_id == USER_ID)
        .order_by(Course.name.asc(), Course.id.asc())
        .all()
    )


def get_course_name_map(service: QuizService) -> dict[int, str]:
    return {course.id: course.name for course in get_courses(service)}


def select_course(service: QuizService) -> Course | None:
    courses = get_courses(service)
    if not courses:
        print("No courses found.")
        return None

    print("Pick a course:")
    for idx, course in enumerate(courses, start=1):
        label = f"{course.name} ({course.code})" if course.code else course.name
        print(f"  [{idx}] {label}")
    print("  [b] Back")

    while True:
        raw = input("Course: ").strip().lower()
        if raw == "b":
            return None
        if not raw.isdigit():
            print("Enter a number or b.")
            continue
        idx = int(raw)
        if idx < 1 or idx > len(courses):
            print("Invalid selection.")
            continue
        return courses[idx - 1]


def select_folder(service: QuizService, course_id: int) -> int | None:
    folders = (
        service.db.query(Folder)
        .filter(Folder.course_id == course_id)
        .order_by(Folder.order_index.asc(), Folder.id.asc())
        .all()
    )
    if not folders:
        print("No folders for this course. Using all folders.")
        return None

    print("Scope:")
    print("  [0] All folders")
    for idx, folder in enumerate(folders, start=1):
        print(f"  [{idx}] {folder.name}")

    while True:
        raw = input("Choose folder scope: ").strip()
        if raw == "" or raw == "0":
            return None
        if not raw.isdigit():
            print("Enter a number.")
            continue
        idx = int(raw)
        if idx < 1 or idx > len(folders):
            print("Invalid selection.")
            continue
        return folders[idx - 1].id


def select_difficulty() -> str:
    print("Difficulty:")
    print("  [1] easy")
    print("  [2] medium")
    print("  [3] hard")
    mapping = {"1": "easy", "2": "medium", "3": "hard"}
    while True:
        raw = input("Choose difficulty [1-3]: ").strip()
        choice = mapping.get(raw)
        if choice:
            return choice
        print("Invalid choice.")


def select_question_count(default: int = 10) -> int:
    while True:
        raw = input(f"How many questions? (5-20, Enter for {default}): ").strip()
        if raw == "":
            return default
        if not raw.isdigit():
            print("Enter a number.")
            continue
        value = int(raw)
        if value < 5 or value > 20:
            print("Question count must be between 5 and 20.")
            continue
        return value


def select_provider(current: str) -> str:
    print(f"Current provider: {current}")
    print("  [1] groq")
    print("  [2] local")
    print("  [3] ollama")
    raw = input("Change provider? (Enter to keep current): ").strip()
    mapping = {"1": "groq", "2": "local", "3": "ollama"}
    if raw == "":
        return current
    return mapping.get(raw, current)


def view_quizzes(service: QuizService) -> None:
    quizzes = service.get_quizzes()
    if not quizzes:
        print("No quizzes found.")
        return

    course_names = get_course_name_map(service)
    print("ID   Title                               Course          Diff    Qs  Best    Tries")
    print("--   ----------------------------------  --------------  ------  --  ------  -----")
    for quiz in quizzes:
        print(
            f"{quiz.id:<4} "
            f"{truncate(quiz.title, 34):<34}  "
            f"{truncate(course_names.get(quiz.course_id, '-'), 14):<14}  "
            f"{quiz.difficulty:<6}  "
            f"{getattr(quiz, 'question_count', 0):<2}  "
            f"{fmt_score(getattr(quiz, 'best_score', None)):<6}  "
            f"{getattr(quiz, 'attempt_count', 0):<5}"
        )


def pick_quiz(service: QuizService) -> int | None:
    quizzes = service.get_quizzes()
    if not quizzes:
        print("No quizzes available.")
        return None

    course_names = get_course_name_map(service)
    print("Available quizzes:")
    for quiz in quizzes:
        best = fmt_score(service.get_best_score(quiz.id, USER_ID))
        print(
            f"  [{quiz.id}] {quiz.title} ({course_names.get(quiz.course_id, '-')}, "
            f"{quiz.difficulty}, best: {best})"
        )

    raw = input("Quiz ID (Enter to cancel): ").strip()
    if raw == "":
        return None
    if not raw.isdigit():
        print("Quiz ID must be a number.")
        return None
    return int(raw)


def generate_quiz_flow(service: QuizService, provider: str) -> str:
    course = select_course(service)
    if not course:
        return provider

    folder_id = select_folder(service, course.id)
    difficulty = select_difficulty()
    n_questions = select_question_count(default=10)
    provider = select_provider(provider)

    print("\nGenerating quiz... (this may take 30-90 seconds)")
    print(HLINE * 48)

    state = {"last": None}

    def progress(step: str, current: int, total: int) -> None:
        _ = current, total
        if state["last"] and state["last"] != step:
            print(f"  {CHECK} {state['last']}")
        state["last"] = step
        print(f"  {SPIN} {step}...")

    try:
        quiz = asyncio.run(
            service.generate_quiz(
                course_id=course.id,
                n_questions=n_questions,
                difficulty=difficulty,
                folder_id=folder_id,
                provider=provider,
                progress_callback=progress,
            )
        )
    except RuntimeError as exc:
        print(f"\nCould not generate quiz: {exc}")
        print("Tip: make sure this course has indexed files from the Notes CLI.")
        return provider
    except ValueError as exc:
        print(f"\nCould not generate quiz: {exc}")
        return provider
    except Exception as exc:
        print(f"\nQuiz generation failed: {exc}")
        return provider

    if state["last"]:
        print(f"  {CHECK} {state['last']}")

    _, questions = service.get_quiz(quiz.id)
    print(f'\n{CHECK} Quiz generated: "{quiz.title}"')
    print(f"  {len(questions)} questions  |  {quiz.difficulty} difficulty  |  {course.name}")

    start_now = input("Start it now? [Y/n]: ").strip().lower()
    if start_now in {"", "y", "yes"}:
        take_quiz_flow(service, quiz.id)
    return provider


def read_answer() -> str:
    while True:
        raw = input("  Your answer (a/b/c/d): ").strip().lower()
        if raw in {"a", "b", "c", "d"}:
            return raw
        print("  Please enter a, b, c, or d.")


def take_quiz_flow(service: QuizService, quiz_id: int | None = None) -> None:
    selected_quiz_id = quiz_id if quiz_id is not None else pick_quiz(service)
    if selected_quiz_id is None:
        return

    try:
        quiz, questions = service.get_quiz(selected_quiz_id)
    except ValueError as exc:
        print(str(exc))
        return

    if not questions:
        print("This quiz has no questions.")
        return

    best_before = service.get_best_score(quiz.id, USER_ID)
    if best_before is not None:
        print(f"Best score so far: {best_before:.1f}%")
    input("Press Enter to begin...")

    answers: dict[int, str] = {}
    started_at = datetime.utcnow()

    for idx, question in enumerate(questions, start=1):
        clear_screen()
        print(HLINE * 66)
        print(f"  {quiz.title}  |  {quiz.difficulty}  |  Q {idx} of {len(questions)}")
        print(HLINE * 66)
        print()
        print(f"  {question.question}")
        print()
        print(f"    a) {question.option_a}")
        print(f"    b) {question.option_b}")
        print(f"    c) {question.option_c}")
        print(f"    d) {question.option_d}")
        print()

        choice = read_answer()
        answers[question.id] = choice
        is_correct = choice == question.correct

        print()
        if is_correct:
            print(f"  {CHECK} Correct! (+10 XP toward quiz total)")
        else:
            print(f"  {XMARK} Incorrect. Correct answer: {question.correct}")
        print(f"    Explanation: {question.explanation or 'No explanation provided.'}")

        if idx < len(questions):
            input("\n  Press Enter for next question...")
        else:
            input("\n  Press Enter to finish...")

    elapsed = int((datetime.utcnow() - started_at).total_seconds())

    result = service.submit_attempt(
        quiz_id=quiz.id,
        user_id=USER_ID,
        answers=answers,
        time_taken=elapsed,
    )
    best_after = service.get_best_score(quiz.id, USER_ID)
    new_best = best_before is None or result["score"] > best_before

    clear_screen()
    print(HLINE * 66)
    print("  Quiz Complete!")
    print(HLINE * 66)
    print(f"  Score:     {result['correct']} / {result['total']}  ({result['score']:.1f}%)")
    print(f"  XP Earned: {result['xp_earned']}")
    print(f"  Time:      {fmt_seconds(elapsed)}")
    print(
        f"  Best ever: {fmt_score(best_after)}  "
        f"(this attempt: new best? {'yes' if new_best else 'no'})"
    )

    question_map = {q.id: q.question for q in questions}
    print("\n  Question breakdown:")
    for idx, item in enumerate(result["results"], start=1):
        icon = CHECK if item["correct"] else XMARK
        q_text = truncate(question_map.get(item["question_id"], "Question"), 52)
        if item["correct"]:
            print(f"  Q{idx:<2} {icon}  {q_text}")
        else:
            chosen = item["chosen"] or "-"
            print(f"  Q{idx:<2} {icon}  {q_text}  (you: {chosen}  correct: {item['answer']})")
    print(HLINE * 66)


def view_results_flow(service: QuizService) -> None:
    quiz_id = pick_quiz(service)
    if quiz_id is None:
        return

    try:
        quiz, _ = service.get_quiz(quiz_id)
    except ValueError as exc:
        print(str(exc))
        return

    attempts = service.get_attempts(quiz_id=quiz.id, user_id=USER_ID)
    if not attempts:
        print("No attempts for this quiz yet.")
        return

    best = max((attempt.score or 0.0) for attempt in attempts)
    print(f'Results for "{quiz.title}":')
    print("ID   Date                Score   Time     Best")
    print("--   ------------------  ------  -------  ----")
    for attempt in attempts:
        stamp = attempt.taken_at.strftime("%Y-%m-%d %H:%M")
        marker = "<==" if (attempt.score or 0.0) == best else ""
        print(
            f"{attempt.id:<4} "
            f"{stamp:<18}  "
            f"{fmt_score(attempt.score):<6}  "
            f"{fmt_seconds(attempt.time_taken):<7}  "
            f"{marker}"
        )


def main() -> None:
    db = SessionLocal()
    service = QuizService(db)
    provider = settings.ai_provider if settings.ai_provider in {"groq", "local", "ollama"} else "groq"

    try:
        while True:
            clear_screen()
            render_main_menu(service)
            choice = input("\nChoose an option: ").strip().lower()
            clear_screen()

            if choice == "1":
                view_quizzes(service)
                pause()
            elif choice == "2":
                provider = generate_quiz_flow(service, provider)
                pause()
            elif choice == "3":
                take_quiz_flow(service)
                pause()
            elif choice == "4":
                view_results_flow(service)
                pause()
            elif choice == "q":
                print("Goodbye.")
                break
            else:
                print("Invalid option. Choose 1-4 or q.")
                pause()
    except KeyboardInterrupt:
        print("\nExiting Quiz CLI.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
