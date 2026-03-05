from __future__ import annotations

import os
import sys
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
load_dotenv()

from features.stats.service import StatsService
from shared.database import SessionLocal
from shared.user_model import User


USER_ID = 1
BAR_WIDTH = 20


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
FILLED = symbol("\u2588", "#")
EMPTY = symbol("\u2591", ".")
DOT = symbol("\u00b7", "-")
DASH = symbol("\u2013", "-")
EM_DASH = symbol("\u2014", "-")


def clear_screen() -> None:
    os.system("cls" if os.name == "nt" else "clear")


def pause() -> None:
    input("\n(press Enter to return)")


def make_bar(value: float, max_value: float, width: int = BAR_WIDTH) -> str:
    if width <= 0:
        return ""
    if max_value <= 0 or value <= 0:
        return EMPTY * width
    ratio = min(max(value / max_value, 0.0), 1.0)
    filled = int(round(ratio * width))
    filled = min(max(filled, 0), width)
    return FILLED * filled + EMPTY * (width - filled)


def render_menu() -> None:
    print(HLINE * 37)
    print("  TaskArena - Statistics")
    print(HLINE * 37)
    print("  [1] Overview")
    print("  [2] Activity (last 7 days)")
    print("  [3] Activity (last 30 days)")
    print("  [4] Task breakdown")
    print("  [5] Quiz performance")
    print("  [q] Quit")


def show_overview(service: StatsService) -> None:
    overview = service.get_overview(USER_ID)
    user = service.db.get(User, USER_ID)
    if not user:
        print("User not found.")
        return

    print(HLINE * 65)
    print(
        f"  Overview - {user.name}  (Lv.{overview['level']} {DOT} Rank #{overview['rank']})"
    )
    print(HLINE * 65)
    print("  TASKS")
    print(
        f"    Total:          {overview['tasks_total']:<5} "
        f"Completed:  {overview['tasks_completed']:<5} "
        f"Pending:    {overview['tasks_pending']:<5}"
    )
    print(
        f"    Completion:     {overview['completion_rate']:.1f}%"
        f"             This week:  {overview['tasks_this_week']} tasks"
    )
    print()
    print("  XP & PROGRESS")
    print(
        f"    Total XP:       {overview['total_xp']:,}"
        f"             This week:  +{overview['xp_this_week']} XP"
    )
    print(f"    Streak:         {overview['current_streak']} days")
    print()
    print("  QUIZZES")
    avg = f"{overview['avg_quiz_score']:.1f}%" if overview["avg_quiz_score"] is not None else EM_DASH
    best = (
        f"{overview['best_quiz_score']:.1f}%"
        if overview["best_quiz_score"] is not None
        else EM_DASH
    )
    print(f"    Taken:          {overview['quizzes_taken']:<5}             Avg Score:  {avg}")
    print(f"    Best Score:     {best}")
    print(HLINE * 65)


def show_activity_days(service: StatsService, days: int) -> None:
    rows = service.get_daily_activity(USER_ID, days=days)
    if not rows:
        print("No activity data.")
        return

    max_tasks = max((int(item["tasks_completed"]) for item in rows), default=0)

    print(f"  Activity - Last {days} Days")
    print(f"  {HLINE * 50}")
    for item in rows:
        day = item["date"]
        tasks_completed = int(item["tasks_completed"])
        xp_earned = int(item["xp_earned"])
        bar = make_bar(tasks_completed, max_tasks, BAR_WIDTH)
        label = day.strftime("%a %b %d")
        print(f"  {label:<10} {bar}  {tasks_completed} tasks  +{xp_earned} XP")

    total_tasks = sum(int(item["tasks_completed"]) for item in rows)
    total_xp = sum(int(item["xp_earned"]) for item in rows)
    best_entry = max(rows, key=lambda x: int(x["tasks_completed"]))
    best_tasks = int(best_entry["tasks_completed"])
    best_day_label = best_entry["date"].strftime("%a") if best_tasks > 0 else EM_DASH
    print(f"  {HLINE * 50}")
    print(
        f"  Total:  {total_tasks} tasks   +{total_xp} XP   "
        f"Best day: {best_day_label} ({best_tasks} tasks)"
    )


def week_label(start_day: date) -> str:
    end_day = start_day + timedelta(days=6)
    start_label = start_day.strftime("%b %d")
    if start_day.month == end_day.month:
        end_label = end_day.strftime("%d")
    else:
        end_label = end_day.strftime("%b %d")
    return f"Week {start_label}{DASH}{end_label}"


def show_activity_weeks(service: StatsService, days: int = 30) -> None:
    rows = service.get_daily_activity(USER_ID, days=days)
    if not rows:
        print("No activity data.")
        return

    weekly_totals: dict[date, dict[str, int]] = defaultdict(lambda: {"tasks": 0, "xp": 0})
    for row in rows:
        current_day: date = row["date"]
        week_start = current_day - timedelta(days=current_day.weekday())
        weekly_totals[week_start]["tasks"] += int(row["tasks_completed"])
        weekly_totals[week_start]["xp"] += int(row["xp_earned"])

    weeks = sorted(weekly_totals.items(), key=lambda kv: kv[0], reverse=True)
    max_tasks = max((values["tasks"] for _, values in weeks), default=0)

    print("  Activity - Last 30 Days (by week)")
    print(f"  {HLINE * 50}")
    for start_day, values in weeks:
        tasks_completed = int(values["tasks"])
        xp_earned = int(values["xp"])
        bar = make_bar(tasks_completed, max_tasks, BAR_WIDTH)
        print(
            f"  {week_label(start_day):<18} {bar}  {tasks_completed} tasks  +{xp_earned} XP"
        )

    total_tasks = sum(values["tasks"] for _, values in weeks)
    total_xp = sum(values["xp"] for _, values in weeks)
    best_week, best_values = max(weeks, key=lambda kv: kv[1]["tasks"])
    print(f"  {HLINE * 50}")
    print(
        f"  Total:  {total_tasks} tasks   +{total_xp} XP   "
        f"Best week: {week_label(best_week)} ({best_values['tasks']} tasks)"
    )


def show_task_breakdown(service: StatsService) -> None:
    breakdown = service.get_task_breakdown(USER_ID)
    by_type = breakdown["by_type"]
    by_status = breakdown["by_status"]

    print("  Task Breakdown")
    print(f"  {HLINE * 40}")
    print("  By Type:")

    ordered_types = ["assignment", "study", "productivity"]
    extra_types = sorted(k for k in by_type.keys() if k not in ordered_types)
    all_types = ordered_types + extra_types
    max_completed = max((int(by_type.get(t, {}).get("completed", 0)) for t in all_types), default=0)

    for task_type in all_types:
        data = by_type.get(task_type, {"completed": 0, "pending": 0})
        completed = int(data.get("completed", 0))
        pending = int(data.get("pending", 0))
        bar = make_bar(completed, max_completed, width=12)
        print(f"    {task_type:<12} {bar}  {completed} done   {pending} pending")

    print()
    print("  By Status:")
    total_tasks = sum(int(v) for v in by_status.values())
    max_status = max((int(v) for v in by_status.values()), default=0)
    for status in ["completed", "pending"]:
        count = int(by_status.get(status, 0))
        percent = (count / total_tasks * 100.0) if total_tasks > 0 else 0.0
        bar = make_bar(count, max_status, width=20)
        print(f"    {status:<12} {bar}  {count} ({percent:.1f}%)")


def show_quiz_performance(service: StatsService) -> None:
    perf = service.get_quiz_performance(USER_ID)

    print("  Quiz Performance")
    print(f"  {HLINE * 40}")
    print(f"  Total attempts:  {perf['attempts_total']}")
    avg = f"{perf['avg_score']:.1f}%" if perf["avg_score"] is not None else EM_DASH
    best = f"{perf['best_score']:.1f}%" if perf["best_score"] is not None else EM_DASH
    print(f"  Average score:   {avg}")
    print(f"  Best score:      {best}")
    print()
    print("  By Difficulty:")

    by_difficulty = perf["by_difficulty"]
    max_avg = max(
        (
            float(data["avg"])
            for data in by_difficulty.values()
            if data.get("avg") is not None
        ),
        default=0.0,
    )
    for difficulty in ["easy", "medium", "hard"]:
        data = by_difficulty.get(difficulty, {"attempts": 0, "avg": None})
        attempts = int(data.get("attempts", 0))
        avg_score = data.get("avg")
        avg_text = f"{avg_score:.1f}%" if avg_score is not None else EM_DASH
        bar = make_bar(float(avg_score or 0.0), max_avg, width=20)
        noun = "attempt" if attempts == 1 else "attempts"
        print(f"    {difficulty:<7} {attempts} {noun:<8} avg: {avg_text:<6}  {bar}")


def main() -> None:
    db = SessionLocal()
    service = StatsService(db)

    try:
        while True:
            clear_screen()
            render_menu()
            choice = input("\nChoose an option: ").strip().lower()
            clear_screen()

            if choice == "1":
                show_overview(service)
                pause()
            elif choice == "2":
                show_activity_days(service, 7)
                pause()
            elif choice == "3":
                show_activity_weeks(service, 30)
                pause()
            elif choice == "4":
                show_task_breakdown(service)
                pause()
            elif choice == "5":
                show_quiz_performance(service)
                pause()
            elif choice == "q":
                print("Goodbye.")
                break
            else:
                print("Invalid option. Choose 1-5 or q.")
                pause()
    except KeyboardInterrupt:
        print("\nExiting Stats CLI.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
