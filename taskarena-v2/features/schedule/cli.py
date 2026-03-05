from __future__ import annotations

import asyncio
import calendar
import os
import sys
from datetime import date, datetime, time, timedelta
from pathlib import Path

from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
load_dotenv()

from features.notes.models import Course
from features.schedule.schemas import EventCreate
from features.schedule.service import ScheduleService
from shared.config import settings
from shared.database import SessionLocal


USER_ID = 1
EVENT_TYPES = {
    "1": "study",
    "2": "assignment",
    "3": "exam",
    "4": "break",
    "5": "other",
}


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
POINTER = symbol("\u25b6", ">")
CHECK = symbol("\u2713", "[OK]")
SPARKLE = symbol("\u2726", "*")
EN_DASH = symbol("\u2013", "-")


def supports_color() -> bool:
    return sys.stdout.isatty() and os.getenv("NO_COLOR") is None


def colorize(text: str, color_code: str) -> str:
    if not supports_color():
        return text
    return f"\033[{color_code}m{text}\033[0m"


TYPE_COLORS = {
    "study": "36",
    "assignment": "35",
    "exam": "31",
    "break": "32",
    "other": "37",
}

PRIORITY_COLORS = {
    "high": "91",
    "medium": "93",
    "low": "92",
}


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


def format_event_type_label(event_type: str) -> str:
    label = f"[{event_type}]"
    return colorize(label, TYPE_COLORS.get(event_type, "37"))


def format_priority_label(priority: str) -> str:
    upper = priority.upper()
    return colorize(f"[{upper}]", PRIORITY_COLORS.get(priority.lower(), "37"))


def week_bounds(ref: date | None = None) -> tuple[date, date]:
    ref_date = ref or date.today()
    start = ref_date - timedelta(days=ref_date.weekday())
    end = start + timedelta(days=6)
    return start, end


def month_day_year(d: date) -> str:
    return f"{d.strftime('%B')} {d.day}, {d.year}"


def week_title(start: date, end: date) -> str:
    left = f"{start.strftime('%B')} {start.day}"
    if start.month == end.month:
        right = f"{end.day}, {end.year}"
    else:
        right = f"{end.strftime('%B')} {end.day}, {end.year}"
    return f"Week of {left} {EN_DASH} {right}"


def parse_required_date(prompt_text: str) -> date:
    while True:
        raw = input(prompt_text).strip()
        try:
            return datetime.strptime(raw, "%Y-%m-%d").date()
        except ValueError:
            print("Invalid date. Use YYYY-MM-DD.")


def parse_optional_time(prompt_text: str) -> time | None:
    while True:
        raw = input(prompt_text).strip()
        if not raw:
            return None
        try:
            return datetime.strptime(raw, "%H:%M").time()
        except ValueError:
            print("Invalid time. Use HH:MM (24-hour).")


def parse_optional_duration(prompt_text: str) -> int | None:
    while True:
        raw = input(prompt_text).strip()
        if not raw:
            return None
        try:
            value = int(raw)
        except ValueError:
            print("Duration must be an integer.")
            continue
        if value <= 0:
            print("Duration must be greater than 0.")
            continue
        return value


def read_non_empty(prompt_text: str) -> str:
    while True:
        value = input(prompt_text).strip()
        if value:
            return value
        print("Value cannot be empty.")


def select_course_id(service: ScheduleService) -> int | None:
    courses = (
        service.db.query(Course)
        .filter(Course.user_id == USER_ID)
        .order_by(Course.name.asc(), Course.id.asc())
        .all()
    )
    if not courses:
        print("No courses found. Continuing without linking a course.")
        return None

    print("Courses:")
    for idx, course in enumerate(courses, start=1):
        label = f"{course.name} ({course.code})" if course.code else course.name
        print(f"  [{idx}] {label}")
    print("  [Enter] Skip")

    while True:
        raw = input("Choose course: ").strip()
        if raw == "":
            return None
        if not raw.isdigit():
            print("Enter a number or press Enter to skip.")
            continue
        idx = int(raw)
        if idx < 1 or idx > len(courses):
            print("Invalid selection.")
            continue
        return courses[idx - 1].id


def render_main_menu() -> None:
    start, end = week_bounds()
    print(HLINE * 37)
    print("  TaskArena - Smart Schedule")
    print(HLINE * 37)
    print(f"  {week_title(start, end)}")
    print()
    print("  [1] View this week")
    print("  [2] View a month")
    print("  [3] Add event")
    print("  [4] Delete event")
    print(f"  [5] {SPARKLE} AI Study Suggestions")
    print("  [q] Quit")


def render_weekly_view(service: ScheduleService) -> None:
    start, end = week_bounds()
    events = service.get_week_events(USER_ID)
    by_day: dict[date, list] = {}
    for event in events:
        by_day.setdefault(event.date, []).append(event)

    print(HLINE * 65)
    print(f"  {week_title(start, end)}")
    print(HLINE * 65)

    for i in range(7):
        day = start + timedelta(days=i)
        day_events = by_day.get(day, [])
        header = f"{day.strftime('%a').upper()} {day.strftime('%b')} {day.day:02d}"
        if day == date.today():
            header = f"{POINTER} {header}"
        else:
            header = f"  {header}"
        print(header)

        if not day_events:
            print("    (no events)")
            print()
            continue

        for event in day_events:
            start_time = event.start_time.strftime("%H:%M") if event.start_time else "--:--"
            duration = f"{event.duration}min" if event.duration is not None else "--"
            label = format_event_type_label(event.type)
            title = truncate(event.title, 34)
            print(f"    {start_time:<5}  {title:<36} {duration:>6}  {label}")
        print()

    print(HLINE * 65)


def parse_month_input() -> tuple[int, int]:
    while True:
        raw = input("Month (YYYY-MM, Enter for current): ").strip()
        if raw == "":
            today = date.today()
            return today.year, today.month
        try:
            parsed = datetime.strptime(raw, "%Y-%m")
            return parsed.year, parsed.month
        except ValueError:
            print("Invalid month. Use YYYY-MM.")


def render_month_view(service: ScheduleService) -> None:
    year, month = parse_month_input()
    events = service.get_month_events(USER_ID, year=year, month=month)
    event_days = {event.date.day for event in events}

    cal = calendar.Calendar(firstweekday=6)
    weeks = cal.monthdayscalendar(year, month)
    title = f"{date(year, month, 1).strftime('%B')} {year}"

    print()
    print(f"      {title}")
    print("  Su  Mo  Tu  We  Th  Fr  Sa")

    for week in weeks:
        cells: list[str] = []
        for day in week:
            if day == 0:
                cells.append("   ")
            elif day in event_days:
                cells.append(f"[{day:>2}]")
            else:
                cells.append(f"{day:>3}")
        print(" ".join(cells))

    print(f"\nTotal events this month: {len(events)}")


def add_event(service: ScheduleService) -> None:
    title = read_non_empty("Title: ")

    print("Type:")
    print("  [1] study")
    print("  [2] assignment")
    print("  [3] exam")
    print("  [4] break")
    print("  [5] other")
    event_type = None
    while event_type is None:
        choice = input("Choose type [1-5]: ").strip()
        event_type = EVENT_TYPES.get(choice)
        if event_type is None:
            print("Invalid choice. Enter 1-5.")

    event_date = parse_required_date("Date (YYYY-MM-DD): ")
    start_time = parse_optional_time("Start time (HH:MM, optional): ")
    duration = parse_optional_duration("Duration in minutes (optional): ")
    notes_raw = input("Notes (optional): ").strip()
    notes = notes_raw or None

    link_course = input("Link to course? [y/N]: ").strip().lower()
    course_id = select_course_id(service) if link_course == "y" else None

    try:
        event = service.create_event(
            USER_ID,
            EventCreate(
                title=title,
                type=event_type,
                date=event_date,
                start_time=start_time,
                duration=duration,
                notes=notes,
                course_id=course_id,
            ),
        )
    except ValueError as exc:
        print(str(exc))
        return

    time_label = event.start_time.strftime("%H:%M") if event.start_time else "no start time"
    print(f'{CHECK} Added event #{event.id}: "{event.title}" on {event.date.isoformat()} at {time_label}')


def delete_event(service: ScheduleService) -> None:
    today = date.today()
    upcoming = service.get_events(USER_ID, today - timedelta(days=7), today + timedelta(days=30))
    if not upcoming:
        print("No events available to delete.")
        return

    print("ID   Date        Time   Title")
    print("--   ----------  -----  ------------------------------------------")
    for event in upcoming:
        time_label = event.start_time.strftime("%H:%M") if event.start_time else "--:--"
        print(f"{event.id:<4} {event.date.isoformat():<10}  {time_label:<5}  {truncate(event.title, 42)}")

    raw = input("\nEvent ID to delete: ").strip()
    if not raw.isdigit():
        print("Event ID must be a number.")
        return
    event_id = int(raw)

    try:
        event = service.get_event(event_id)
    except ValueError as exc:
        print(str(exc))
        return

    if event.user_id != USER_ID:
        print("Event does not belong to the active user.")
        return

    confirm = input(f'Delete "{event.title}"? [y/N]: ').strip().lower()
    if confirm != "y":
        print("Delete cancelled.")
        return

    service.delete_event(event_id)
    print(f'{CHECK} Deleted event #{event_id}: "{event.title}"')


def format_suggestion_when(suggestion: dict) -> str:
    date_raw = str(suggestion.get("date", "")).strip()
    time_raw = str(suggestion.get("start_time", "")).strip()
    try:
        day = datetime.strptime(date_raw, "%Y-%m-%d").date()
        pretty_day = f"{day.strftime('%a')} {day.strftime('%b')} {day.day:02d}"
    except ValueError:
        pretty_day = date_raw or "Unknown day"

    try:
        when_time = datetime.strptime(time_raw, "%H:%M").strftime("%H:%M")
    except ValueError:
        when_time = time_raw or "TBD"
    return f"{pretty_day}, {when_time}"


def resolve_course_id_from_suggestion(service: ScheduleService, course_name: str | None) -> int | None:
    if not course_name:
        return None
    normalized = course_name.strip().lower()
    if not normalized:
        return None

    course = (
        service.db.query(Course)
        .filter(Course.user_id == USER_ID)
        .all()
    )
    for item in course:
        if item.name.strip().lower() == normalized:
            return item.id
    return None


def accept_one_suggestion(service: ScheduleService, suggestion: dict) -> None:
    course_name = str(suggestion.get("course", "")).strip() or None
    course_id = resolve_course_id_from_suggestion(service, course_name)
    try:
        event = service.accept_suggestion(USER_ID, suggestion, course_id=course_id)
    except ValueError as exc:
        print(f"Could not accept suggestion: {exc}")
        return

    when = month_day_year(event.date)
    at = event.start_time.strftime("%H:%M") if event.start_time else "TBD"
    print(f"{CHECK} Added to your schedule: {event.title} on {when} at {at}")


def ai_suggestions_flow(service: ScheduleService) -> None:
    provider = settings.ai_provider if settings.ai_provider in {"groq", "local", "ollama"} else "groq"

    tasks = service.ai.analyze_workload(USER_ID, service.db)
    print(f"  {SPARKLE} Generating AI study suggestions...")
    print(f"  Analyzing {len(tasks)} upcoming deadlines...\n")
    if not tasks:
        print("No pending tasks with deadlines in the next 14 days.")
        return

    try:
        suggestions = asyncio.run(service.get_ai_suggestions(USER_ID, provider=provider))
    except Exception as exc:
        print(f"Could not generate suggestions right now: {exc}")
        print("Please verify your AI provider setup and try again.")
        return

    if not suggestions:
        print("No suggestions were generated. This can happen if the provider failed or returned bad JSON.")
        return

    print(HLINE * 65)
    print("  Suggestions for the next 7 days:")
    print(HLINE * 65)
    print()
    for idx, suggestion in enumerate(suggestions, start=1):
        priority = str(suggestion.get("priority", "low")).lower()
        title = str(suggestion.get("title", "Study Block")).strip() or "Study Block"
        when = format_suggestion_when(suggestion)
        duration = suggestion.get("duration", "-")
        course = str(suggestion.get("course", "No course")).strip() or "No course"
        reason = str(suggestion.get("reason", "")).strip() or "No reason provided."

        print(f"  [{idx}] {format_priority_label(priority)} {title}")
        print(f"      {when} {EN_DASH} {duration} min")
        print(f"      {course}")
        print(f"      -> {reason}")
        print()

    print(HLINE * 65)
    print("  [a] Accept a suggestion    [all] Accept all    [Enter] Skip")
    action = input("  Choice: ").strip().lower()

    if action == "":
        return
    if action == "all":
        for suggestion in suggestions:
            accept_one_suggestion(service, suggestion)
        return
    if action == "a":
        raw = input("Accept suggestion [1]: ").strip()
        if not raw.isdigit():
            print("Invalid selection.")
            return
        picked = int(raw)
        if picked < 1 or picked > len(suggestions):
            print("Invalid selection.")
            return
        accept_one_suggestion(service, suggestions[picked - 1])
        return

    print("Invalid option. Skipping suggestions.")


def main() -> None:
    db = SessionLocal()
    service = ScheduleService(db)

    try:
        while True:
            clear_screen()
            render_main_menu()
            choice = input("\nChoose an option: ").strip().lower()
            clear_screen()

            if choice == "1":
                render_weekly_view(service)
                pause()
            elif choice == "2":
                render_month_view(service)
                pause()
            elif choice == "3":
                add_event(service)
                pause()
            elif choice == "4":
                delete_event(service)
                pause()
            elif choice == "5":
                ai_suggestions_flow(service)
                pause()
            elif choice == "q":
                print("Goodbye.")
                break
            else:
                print("Invalid option. Choose 1-5 or q.")
                pause()
    except KeyboardInterrupt:
        print("\nExiting Schedule CLI.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
