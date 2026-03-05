import os
import sys
from datetime import date, datetime
from pathlib import Path

from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
load_dotenv()

from features.tasks.schemas import TaskCreate, TaskUpdate
from features.tasks.service import TaskService
from shared.database import SessionLocal


USER_ID = 1
TASK_TYPES = {"1": "assignment", "2": "study", "3": "productivity"}


def clear_screen() -> None:
    os.system("cls" if os.name == "nt" else "clear")


def pause() -> None:
    input("\nPress Enter to continue...")


def format_date(value: date | None) -> str:
    if value is None:
        return "-"
    return value.strftime("%b %d")


def truncate(text: str, max_len: int) -> str:
    if len(text) <= max_len:
        return text
    if max_len <= 3:
        return text[:max_len]
    return text[: max_len - 3] + "..."


def print_task_table(tasks) -> None:
    if not tasks:
        print("No tasks found.")
        return

    print("ID   Title                                    Type           Subject        Due         Status")
    print("--   -------------------------------------    ------------   ------------   ----------  ----------")
    for task in tasks:
        subject = task.subject or "-"
        print(
            f"{task.id:<4} "
            f"{truncate(task.title, 37):<39} "
            f"{task.type:<14} "
            f"{truncate(subject, 12):<12} "
            f"{format_date(task.deadline):<10} "
            f"{task.status:<10}"
        )


def render_menu(service: TaskService) -> None:
    tasks = service.get_tasks(USER_ID)
    pending = sum(1 for task in tasks if task.status == "pending")
    completed = sum(1 for task in tasks if task.status == "completed")
    user = service.get_user(USER_ID)

    print("-------------------------------------")
    print("  TaskArena - Tasks")
    print("-------------------------------------")
    print(f"  Pending: {pending}  |  Completed: {completed}  |  XP: {user.xp}")
    print()
    print("  [1] View all tasks")
    print("  [2] View pending only")
    print("  [3] Add task")
    print("  [4] Complete a task")
    print("  [5] Update a task")
    print("  [6] Delete a task")
    print("  [7] View XP log")
    print("  [q] Quit")
    print("-------------------------------------")


def read_non_empty(prompt_text: str) -> str:
    while True:
        value = input(prompt_text).strip()
        if value:
            return value
        print("Value cannot be empty.")


def read_optional_date(prompt_text: str) -> date | None:
    while True:
        raw = input(prompt_text).strip()
        if raw == "":
            return None
        try:
            return datetime.strptime(raw, "%Y-%m-%d").date()
        except ValueError:
            print("Invalid date. Use YYYY-MM-DD.")


def read_optional_positive_int(prompt_text: str, default: int | None = None) -> int | None:
    while True:
        raw = input(prompt_text).strip()
        if raw == "":
            return default
        try:
            value = int(raw)
        except ValueError:
            print("Please enter a valid integer.")
            continue
        if value <= 0:
            print("Value must be greater than 0.")
            continue
        return value


def read_task_id(prompt_text: str) -> int | None:
    raw = input(prompt_text).strip()
    if not raw:
        print("Task ID is required.")
        return None
    if not raw.isdigit():
        print("Task ID must be a number.")
        return None
    return int(raw)


def view_tasks(service: TaskService, pending_only: bool = False) -> None:
    status = "pending" if pending_only else None
    tasks = service.get_tasks(USER_ID, status=status)
    print_task_table(tasks)


def add_task(service: TaskService) -> None:
    title = read_non_empty("Title: ")

    print("Type:")
    print("  [1] assignment")
    print("  [2] study")
    print("  [3] productivity")
    task_type = None
    while task_type is None:
        choice = input("Choose type [1/2/3]: ").strip()
        task_type = TASK_TYPES.get(choice)
        if task_type is None:
            print("Invalid choice. Please enter 1, 2, or 3.")

    subject_raw = input("Subject (optional): ").strip()
    subject = subject_raw or None
    deadline = read_optional_date("Deadline (YYYY-MM-DD, optional): ")
    points = read_optional_positive_int("Points (default 5): ", default=5)

    data = TaskCreate(
        title=title,
        subject=subject,
        type=task_type,
        deadline=deadline,
        points=points or 5,
    )
    task = service.create_task(USER_ID, data)
    print(f'Created task #{task.id}: "{task.title}"')


def complete_task(service: TaskService) -> None:
    pending_tasks = service.get_tasks(USER_ID, status="pending")
    if not pending_tasks:
        print("No pending tasks to complete.")
        return

    print_task_table(pending_tasks)
    task_id = read_task_id("\nTask ID to complete: ")
    if task_id is None:
        return

    try:
        task = service.get_task(task_id)
        if task.user_id != USER_ID:
            print("Task does not belong to the active user.")
            return
        if task.status != "pending":
            print("Task is not pending.")
            return

        completed, xp = service.complete_task(task_id)
        user = service.get_user(USER_ID)
        print(f'OK "{completed.title}" completed! +{xp} XP earned. Total: {user.xp} XP')
    except ValueError as exc:
        print(str(exc))
    except PermissionError as exc:
        print(str(exc))


def update_task(service: TaskService) -> None:
    tasks = service.get_tasks(USER_ID)
    if not tasks:
        print("No tasks available.")
        return

    print_task_table(tasks)
    task_id = read_task_id("\nTask ID to update: ")
    if task_id is None:
        return

    try:
        task = service.get_task(task_id)
        if task.user_id != USER_ID:
            print("Task does not belong to the active user.")
            return
    except ValueError as exc:
        print(str(exc))
        return

    print("Leave fields empty to keep current value.")
    new_title = input(f"Title [{task.title}]: ").strip()
    new_subject = input(f"Subject [{task.subject or '-'}]: ").strip()
    new_status = input(f"Status [{task.status}] (pending/completed): ").strip().lower()
    new_deadline_raw = input(
        f"Deadline [{task.deadline.isoformat() if task.deadline else '-'}] (YYYY-MM-DD): "
    ).strip()
    new_points_raw = input(f"Points [{task.points}]: ").strip()

    updates: dict[str, object] = {}

    if new_title:
        updates["title"] = new_title
    if new_subject:
        updates["subject"] = new_subject
    if new_status:
        if new_status not in {"pending", "completed"}:
            print("Invalid status. Use pending or completed.")
            return
        updates["status"] = new_status
    if new_deadline_raw:
        try:
            updates["deadline"] = datetime.strptime(new_deadline_raw, "%Y-%m-%d").date()
        except ValueError:
            print("Invalid deadline. Use YYYY-MM-DD.")
            return
    if new_points_raw:
        if not new_points_raw.isdigit():
            print("Points must be a positive integer.")
            return
        points_value = int(new_points_raw)
        if points_value <= 0:
            print("Points must be greater than 0.")
            return
        updates["points"] = points_value

    if not updates:
        print("No changes to update.")
        return

    try:
        updated = service.update_task(task_id, TaskUpdate(**updates))
        print(f'Updated task #{updated.id}: "{updated.title}"')
    except ValueError as exc:
        print(str(exc))


def delete_task(service: TaskService) -> None:
    tasks = service.get_tasks(USER_ID)
    if not tasks:
        print("No tasks available.")
        return

    print_task_table(tasks)
    task_id = read_task_id("\nTask ID to delete: ")
    if task_id is None:
        return

    try:
        task = service.get_task(task_id)
        if task.user_id != USER_ID:
            print("Task does not belong to the active user.")
            return
    except ValueError as exc:
        print(str(exc))
        return

    confirmation = input(f'Delete "{task.title}"? [y/N]: ').strip().lower()
    if confirmation != "y":
        print("Delete cancelled.")
        return

    try:
        service.delete_task(task_id)
        print(f'Deleted task #{task_id}: "{task.title}"')
    except ValueError as exc:
        print(str(exc))


def view_xp_log(service: TaskService) -> None:
    entries = service.get_xp_log(USER_ID, limit=20)
    if not entries:
        print("No XP log entries found.")
        return

    print("ID   XP    Logged At            Reason")
    print("--   ----  -------------------  ----------------------------------------")
    for entry in entries:
        stamp = entry.logged_at.strftime("%Y-%m-%d %H:%M")
        print(f"{entry.id:<4} {entry.amount:<4}  {stamp:<19}  {truncate(entry.reason, 40)}")


def main() -> None:
    db = SessionLocal()
    service = TaskService(db)

    try:
        while True:
            clear_screen()
            try:
                render_menu(service)
            except ValueError as exc:
                print(str(exc))
                break

            choice = input("\nChoose an option: ").strip().lower()
            clear_screen()

            if choice == "1":
                view_tasks(service, pending_only=False)
                pause()
            elif choice == "2":
                view_tasks(service, pending_only=True)
                pause()
            elif choice == "3":
                add_task(service)
                pause()
            elif choice == "4":
                complete_task(service)
                pause()
            elif choice == "5":
                update_task(service)
                pause()
            elif choice == "6":
                delete_task(service)
                pause()
            elif choice == "7":
                view_xp_log(service)
                pause()
            elif choice == "q":
                print("Goodbye.")
                break
            else:
                print("Invalid option. Choose 1-7 or q.")
                pause()
    except KeyboardInterrupt:
        print("\nExiting Tasks CLI.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
