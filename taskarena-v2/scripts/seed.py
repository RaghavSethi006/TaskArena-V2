import sys
from datetime import date, datetime, time, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from features.chatbot.models import ChatConversation, ChatMessage
from features.notes.models import Course, Folder
import features.quiz.models  # noqa: F401
import features.study_materials.models  # noqa: F401
from features.schedule.models import ScheduleEvent
from features.tasks.models import Task, XPLog
from shared.database import SessionLocal
from shared.user_model import User


def run_seed() -> None:
    root = Path(__file__).resolve().parent.parent
    data_dir = root / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    db = SessionLocal()
    try:
        existing_user = db.query(User).filter(User.email == "raghav@taskarena.com").first()
        if existing_user:
            raise ValueError(
                "Seed user already exists. Run scripts/reset_db.py first if you want a clean seed."
            )

        user = User(
            name="Raghav Sethi",
            email="raghav@taskarena.com",
            level=14,
            xp=2340,
            streak=7,
        )
        db.add(user)
        db.flush()

        physics = Course(
            user_id=user.id,
            name="Physics 201",
            code="PHYS201",
            color="#3b82f6",
        )
        orgo = Course(
            user_id=user.id,
            name="Organic Chemistry",
            code="CHEM301",
            color="#22c55e",
        )
        stats = Course(
            user_id=user.id,
            name="Statistics",
            code="STAT210",
            color="#8b5cf6",
        )
        db.add_all([physics, orgo, stats])
        db.flush()

        folders = [
            Folder(course_id=physics.id, name="Chapter 1 — Foundations", order_index=0),
            Folder(course_id=orgo.id, name="Chapter 1 — Foundations", order_index=0),
            Folder(course_id=stats.id, name="Chapter 1 — Foundations", order_index=0),
        ]
        db.add_all(folders)

        today = date.today()
        tasks = [
            Task(
                user_id=user.id,
                title="Essay on Renaissance Art",
                subject="Art History",
                type="assignment",
                status="pending",
                deadline=today + timedelta(days=3),
                points=15,
            ),
            Task(
                user_id=user.id,
                title="Problem Set 3 — Mechanics",
                subject="Physics",
                type="assignment",
                status="pending",
                deadline=today + timedelta(days=5),
                points=20,
                course_id=physics.id,
            ),
            Task(
                user_id=user.id,
                title="Review Chapter 7 Thermodynamics",
                subject="Physics",
                type="study",
                status="pending",
                deadline=today + timedelta(days=1),
                points=10,
                course_id=physics.id,
            ),
            Task(
                user_id=user.id,
                title="French Vocab Flashcards",
                subject="French",
                type="study",
                status="completed",
                deadline=today + timedelta(days=4),
                points=8,
                completed_at=datetime.utcnow(),
            ),
            Task(
                user_id=user.id,
                title="Organize semester notes",
                subject="Admin",
                type="productivity",
                status="pending",
                deadline=today + timedelta(days=2),
                points=5,
            ),
        ]
        db.add_all(tasks)

        events = [
            ScheduleEvent(
                user_id=user.id,
                title="Study: Thermodynamics Ch.7",
                type="study",
                course_id=physics.id,
                date=today,
                start_time=time(9, 0),
                duration=90,
                ai_suggested=False,
            ),
            ScheduleEvent(
                user_id=user.id,
                title="Essay draft",
                type="assignment",
                date=today,
                start_time=time(14, 0),
                duration=60,
                ai_suggested=False,
            ),
            ScheduleEvent(
                user_id=user.id,
                title="Physics Midterm",
                type="exam",
                course_id=physics.id,
                date=today + timedelta(days=1),
                start_time=time(10, 0),
                duration=120,
                ai_suggested=False,
            ),
        ]
        db.add_all(events)
        db.flush()

        conversation = ChatConversation(
            user_id=user.id,
            title="Newtonian Mechanics",
            context_course_id=physics.id,
        )
        db.add(conversation)
        db.flush()

        messages = [
            ChatMessage(
                conversation_id=conversation.id,
                role="user",
                content="Can you explain how Newton's second law applies to inclined planes?",
            ),
            ChatMessage(
                conversation_id=conversation.id,
                role="assistant",
                content="On an incline, resolve forces along and perpendicular to the plane; then use F = ma along the slope.",
                sources='["Physics 201 - Chapter 4 Notes.pdf"]',
                model_used="llama-3.3-70b-versatile",
            ),
        ]
        db.add_all(messages)

        xp_entries = [
            XPLog(user_id=user.id, amount=8, reason="Completed task: French Vocab Flashcards"),
            XPLog(user_id=user.id, amount=10, reason="Completed task: Review Chapter 6"),
            XPLog(user_id=user.id, amount=5, reason="Completed task: Weekly planning"),
        ]
        db.add_all(xp_entries)

        db.commit()

        print("Seed complete.")
        print(f"- Users: 1 (id={user.id})")
        print("- Courses: 3")
        print("- Folders: 3")
        print("- Tasks: 5")
        print("- Schedule events: 3")
        print("- Conversations: 1")
        print("- Messages: 2")
        print("- XP log entries: 3")
    except Exception as exc:
        db.rollback()
        print(f"Seed failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
