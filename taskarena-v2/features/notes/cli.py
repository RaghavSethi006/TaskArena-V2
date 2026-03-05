import os
import sys
from pathlib import Path

from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
load_dotenv()

from features.notes.schemas import CourseCreate
from features.notes.service import NotesService
from shared.database import SessionLocal


USER_ID = 1
DIM = "\033[90m"
RESET = "\033[0m"


def clear_screen() -> None:
    os.system("cls" if os.name == "nt" else "clear")


def pause() -> None:
    input("\nPress Enter to continue...")


def dim_text(text: str) -> str:
    return f"{DIM}{text}{RESET}"


def truncate(text: str, max_len: int) -> str:
    collapsed = " ".join(text.split())
    if len(collapsed) <= max_len:
        return collapsed
    return collapsed[: max_len - 3] + "..."


def format_size(size: int | None) -> str:
    if size is None:
        return "-"
    if size < 1024:
        return f"{size} B"
    if size < 1024 * 1024:
        return f"{size / 1024:.0f} KB"
    return f"{size / (1024 * 1024):.2f} MB"


def read_int(prompt_text: str) -> int | None:
    raw = input(prompt_text).strip()
    if not raw or not raw.isdigit():
        return None
    return int(raw)


def compute_totals(service: NotesService) -> tuple[int, int, int]:
    courses = service.get_courses(USER_ID)
    folder_count = 0
    file_count = 0
    for course in courses:
        folders = service.get_folders(course.id)
        folder_count += len(folders)
        for folder in folders:
            file_count += len(service.get_files(folder.id))
    return len(courses), folder_count, file_count


def choose_course(service: NotesService):
    courses = service.get_courses(USER_ID)
    if not courses:
        print("No courses found. Add one first.")
        pause()
        return None

    for idx, course in enumerate(courses, start=1):
        code = f" ({course.code})" if course.code else ""
        print(f"[{idx}] {course.name}{code}")
    print("[b] Back")

    choice = input("\nSelect course: ").strip().lower()
    if choice == "b":
        return None
    if not choice.isdigit():
        print("Invalid selection.")
        pause()
        return None

    idx = int(choice)
    if idx < 1 or idx > len(courses):
        print("Invalid selection.")
        pause()
        return None
    return courses[idx - 1]


def add_course(service: NotesService) -> None:
    name = input("Course name: ").strip()
    if not name:
        print("Course name is required.")
        pause()
        return

    code = input("Course code (optional): ").strip() or None
    color = input("Color hex (optional, default #3b82f6): ").strip() or "#3b82f6"

    try:
        course = service.create_course(USER_ID, CourseCreate(name=name, code=code, color=color))
        print(f'Created course #{course.id}: "{course.name}"')
    except Exception as exc:
        print(f"Failed to create course: {exc}")
    pause()


def browse_courses(service: NotesService) -> None:
    while True:
        clear_screen()
        courses = service.get_courses(USER_ID)
        if not courses:
            print("No courses found. Add one from main menu.")
            pause()
            return

        print("Courses:")
        for idx, course in enumerate(courses, start=1):
            code = f" ({course.code})" if course.code else ""
            print(f"  [{idx}] {course.name}{code}")
        print("\n  [b] Back")

        choice = input("\nPick a course: ").strip().lower()
        if choice == "b":
            return
        if not choice.isdigit():
            print("Invalid selection.")
            pause()
            continue

        idx = int(choice)
        if idx < 1 or idx > len(courses):
            print("Invalid selection.")
            pause()
            continue
        browse_course_detail(service, courses[idx - 1].id)


def browse_course_detail(service: NotesService, course_id: int) -> None:
    while True:
        clear_screen()
        try:
            course = service.get_course(course_id)
        except ValueError as exc:
            print(str(exc))
            pause()
            return

        code = f" ({course.code})" if course.code else ""
        print("-------------------------------------")
        print(f"  {course.name}{code}")
        print("-------------------------------------")
        print("  Folders:")

        folders = service.get_folders(course.id)
        if not folders:
            print("  (none)")
        else:
            for idx, folder in enumerate(folders, start=1):
                files = service.get_files(folder.id)
                indexed = sum(1 for file_obj in files if file_obj.indexed)
                print(
                    f"  [{idx}] {truncate(folder.name, 30):<30} "
                    f"({len(files)} files, {indexed} indexed)"
                )

        print("\n  [a] Add folder")
        print("  [b] Back")

        choice = input("\nChoose: ").strip().lower()
        if choice == "b":
            return
        if choice == "a":
            folder_name = input("Folder name: ").strip()
            if not folder_name:
                print("Folder name cannot be empty.")
            else:
                try:
                    service.create_folder(course.id, folder_name)
                    print("Folder created.")
                except ValueError as exc:
                    print(str(exc))
            pause()
            continue

        if not choice.isdigit():
            print("Invalid selection.")
            pause()
            continue
        idx = int(choice)
        if idx < 1 or idx > len(folders):
            print("Invalid selection.")
            pause()
            continue
        browse_folder(service, course.id, folders[idx - 1].id)


def print_files_table(service: NotesService, folder_id: int) -> dict[int, object]:
    files = service.get_files(folder_id)
    files_by_id = {file_obj.id: file_obj for file_obj in files}

    if not files:
        print("No files in this folder.")
        return files_by_id

    print("ID   Name                            Size      Status")
    print("--   ------------------------------  --------  --------------------------")
    for file_obj in files:
        if file_obj.indexed:
            chunk_count = service.get_chunk_count(file_obj.id)
            status = f"✓ indexed ({chunk_count} chunks)"
        else:
            status = "○ not indexed"

        print(
            f"{file_obj.id:<4} "
            f"{truncate(file_obj.name, 30):<30}  "
            f"{format_size(file_obj.size):<8}  "
            f"{status}"
        )
        if file_obj.original_path:
            print(f"     {dim_text('Originally from: ' + file_obj.original_path)}")
    return files_by_id


def add_file_flow(service: NotesService, folder_id: int) -> None:
    source_path = input("Original file path: ").strip()
    if not source_path:
        print("File path is required.")
        pause()
        return

    default_name = Path(source_path).name
    display_name = input(f"Display name (Enter for '{default_name}'): ").strip() or default_name

    print("Copying to TaskArena library...")
    try:
        file_obj = service.add_file(folder_id=folder_id, name=display_name, original_path=source_path)
        print(f"✓ Saved to library (original: {file_obj.original_path})")
    except (ValueError, RuntimeError) as exc:
        print(str(exc))
        pause()
        return

    should_index = input("Index this file now? [Y/n]: ").strip().lower()
    if should_index in {"n", "no"}:
        pause()
        return

    print("Loading embedding model (first run may take a moment...)")
    print("Indexing...")
    try:
        chunk_count = service.index_file(file_obj.id)
        print(f"✓ Indexed {chunk_count} chunks from {file_obj.name}")
    except (ValueError, FileNotFoundError) as exc:
        print(str(exc))
    pause()


def index_file_flow(service: NotesService, files_by_id: dict[int, object]) -> None:
    if not files_by_id:
        print("No files to index.")
        pause()
        return

    file_id = read_int("File ID to index: ")
    if file_id is None:
        print("Invalid file ID.")
        pause()
        return
    if file_id not in files_by_id:
        print("File not found in this folder.")
        pause()
        return

    print("Loading embedding model (first run may take a moment...)")
    print("Indexing...")
    try:
        chunk_count = service.index_file(file_id)
        print(f"✓ Indexed {chunk_count} chunks from {files_by_id[file_id].name}")
    except (ValueError, FileNotFoundError) as exc:
        print(str(exc))
    pause()


def delete_file_flow(service: NotesService, files_by_id: dict[int, object]) -> None:
    if not files_by_id:
        print("No files to delete.")
        pause()
        return

    file_id = read_int("File ID to delete: ")
    if file_id is None:
        print("Invalid file ID.")
        pause()
        return
    if file_id not in files_by_id:
        print("File not found in this folder.")
        pause()
        return

    file_obj = files_by_id[file_id]
    confirm = input(f'Delete "{file_obj.name}"? [y/N]: ').strip().lower()
    if confirm != "y":
        print("Delete cancelled.")
        pause()
        return

    try:
        service.remove_file(file_id)
        print("File removed from library.")
    except ValueError as exc:
        print(str(exc))
    pause()


def browse_folder(service: NotesService, course_id: int, folder_id: int) -> None:
    while True:
        clear_screen()
        try:
            folder = service.get_folder(folder_id)
            service.get_course(course_id)
        except ValueError as exc:
            print(str(exc))
            pause()
            return

        print(f'Files in "{folder.name}":')
        print("----------------------------------------------------------------")
        files_by_id = print_files_table(service, folder.id)
        print("\n[a] Add file    [i] Index a file    [d] Delete file    [b] Back")

        choice = input("\nChoose: ").strip().lower()
        if choice == "b":
            return
        if choice == "a":
            add_file_flow(service, folder.id)
            continue
        if choice == "i":
            index_file_flow(service, files_by_id)
            continue
        if choice == "d":
            delete_file_flow(service, files_by_id)
            continue

        print("Invalid selection.")
        pause()


def search_flow(service: NotesService) -> None:
    clear_screen()
    course = choose_course(service)
    if not course:
        return

    query = input("Search query: ").strip()
    if not query:
        print("Query cannot be empty.")
        pause()
        return

    print("Loading embedding model (first run may take a moment...)")
    print("Searching...")
    try:
        results = service.search(query=query, course_id=course.id, top_k=5)
    except ValueError as exc:
        print(str(exc))
        pause()
        return

    clear_screen()
    print(f'Search results for "{query}" in {course.name}:')
    print("---------------------------------------------------------")
    if not results:
        print("No results found.")
        pause()
        return

    for idx, result in enumerate(results, start=1):
        chunk_number = int(result.get("chunk_index", 0)) + 1
        preview = truncate(result["chunk_content"], 120)
        print(f"{idx}. [{result['score']:.2f}] {result['file_name']} (chunk {chunk_number})")
        print(f'   "{preview}"')
        print()
    pause()


def run() -> None:
    db = SessionLocal()
    service = NotesService(db)

    try:
        while True:
            clear_screen()
            course_count, folder_count, file_count = compute_totals(service)
            print("-------------------------------------")
            print("  TaskArena - Study Library")
            print("-------------------------------------")
            print(f"  {course_count} courses  |  {folder_count} folders  |  {file_count} files")
            print()
            print("  [1] Browse courses")
            print("  [2] Add course")
            print("  [3] Search across a course (semantic)")
            print("  [q] Quit")

            choice = input("\nChoose an option: ").strip().lower()
            if choice == "1":
                browse_courses(service)
            elif choice == "2":
                clear_screen()
                add_course(service)
            elif choice == "3":
                search_flow(service)
            elif choice == "q":
                print("Goodbye.")
                break
            else:
                print("Invalid option.")
                pause()
    except KeyboardInterrupt:
        print("\nExiting Study Library.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
