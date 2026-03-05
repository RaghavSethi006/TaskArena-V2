from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
load_dotenv()

from features.chatbot.service import ChatService
from features.notes.models import Course, File as NoteFile, Folder
from shared.config import settings
from shared.database import SessionLocal


USER_ID = 1
LINE = "-------------------------------------------------"


def supports_text(text: str) -> bool:
    encoding = sys.stdout.encoding or "utf-8"
    try:
        text.encode(encoding)
        return True
    except UnicodeEncodeError:
        return False


def symbol(preferred: str, fallback: str) -> str:
    return preferred if supports_text(preferred) else fallback


LIGHTNING = symbol("\u26a1", "[G]")
LAPTOP = symbol("\U0001F4BB", "[L]")
LLAMA = symbol("\U0001F999", "[O]")
SOURCE_ICON = symbol("\U0001F4C4", "[Sources]")
BOOK_ICON = symbol("\U0001F4DA", "[Course]")
FOLDER_ICON = symbol("\U0001F4C1", "[Folder]")
FILE_ICON = symbol("\U0001F4C4", "[File]")
CHAT_ICON = symbol("\U0001F4AC", "[Chat]")
CHECK_ICON = symbol("\u2713", "[OK]")

PROVIDER_PRESETS = [
    {
        "id": 1,
        "provider": "groq",
        "model": settings.groq_model,
        "label": f"{LIGHTNING} Groq",
        "description": f"{settings.groq_model} (fast, cloud)",
    },
    {
        "id": 2,
        "provider": "groq",
        "model": "llama-3.1-8b-instant",
        "label": f"{LIGHTNING} Groq",
        "description": "llama-3.1-8b-instant (fastest, cloud)",
    },
    {
        "id": 3,
        "provider": "local",
        "model": Path(settings.local_model_path).name,
        "label": f"{LAPTOP} Local",
        "description": "Qwen2.5-7B (private, offline)",
    },
    {
        "id": 4,
        "provider": "ollama",
        "model": settings.ollama_model,
        "label": f"{LLAMA} Ollama",
        "description": f"{settings.ollama_model} (local server)",
    },
]


def clear_screen() -> None:
    os.system("cls" if os.name == "nt" else "clear")


def pause() -> None:
    input("\nPress Enter to continue...")


def provider_title(provider: str, model: str | None) -> str:
    if provider == "groq":
        return f"{LIGHTNING} Groq · {model or settings.groq_model}"
    if provider == "local":
        return f"{LAPTOP} Local · {Path(settings.local_model_path).name}"
    if provider == "ollama":
        return f"{LLAMA} Ollama · {model or settings.ollama_model}"
    return f"{provider} · {model or '-'}"


def parse_sources(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    return [str(item) for item in parsed]


def select_provider(current_provider: str, current_model: str | None) -> tuple[str, str | None]:
    current_id = 1
    for preset in PROVIDER_PRESETS:
        if preset["provider"] == current_provider and preset["model"] == current_model:
            current_id = preset["id"]
            break

    print("  Switch AI provider:")
    for preset in PROVIDER_PRESETS:
        print(f"  [{preset['id']}] {preset['label']} - {preset['description']}")
    print(f"  Current: [{current_id}]")
    raw = input("  Enter number (Enter to keep current): ").strip()
    if not raw:
        return current_provider, current_model
    if not raw.isdigit():
        print("Invalid selection. Keeping current provider.")
        return current_provider, current_model

    choice = int(raw)
    selected = next((preset for preset in PROVIDER_PRESETS if preset["id"] == choice), None)
    if not selected:
        print("Invalid selection. Keeping current provider.")
        return current_provider, current_model
    return selected["provider"], selected["model"]


def list_courses(db) -> list[Course]:
    return (
        db.query(Course)
        .filter(Course.user_id == USER_ID)
        .order_by(Course.name.asc(), Course.id.asc())
        .all()
    )


def course_name(db, course_id: int | None) -> str:
    if course_id is None:
        return "no context"
    course = db.get(Course, course_id)
    if not course:
        return "no context"
    return course.name


def context_description(db, conversation) -> str:
    if conversation.context_file_id is not None:
        file_obj = db.get(NoteFile, conversation.context_file_id)
        if file_obj:
            return f"{FILE_ICON} {file_obj.name}"
    if conversation.context_folder_id is not None:
        folder = db.get(Folder, conversation.context_folder_id)
        if folder:
            return f"{FOLDER_ICON} {folder.name}"
    if conversation.context_course_id is not None:
        course = db.get(Course, conversation.context_course_id)
        if course:
            return f"{BOOK_ICON} {course.name} (full course)"
    return f"{CHAT_ICON} No RAG context"


def conversation_summaries(service: ChatService, db) -> list[dict]:
    rows = []
    for conversation in service.get_conversations(USER_ID):
        message_count = len(service.get_messages(conversation.id))
        rows.append(
            {
                "conversation": conversation,
                "message_count": message_count,
                "course_name": course_name(db, conversation.context_course_id),
            }
        )
    return rows


def pick_conversation(service: ChatService, db) -> int | None:
    rows = conversation_summaries(service, db)
    if not rows:
        print("No saved conversations yet.")
        pause()
        return None

    print("  Conversations:")
    for idx, row in enumerate(rows, start=1):
        conv = row["conversation"]
        print(
            f"  [{idx}] {conv.title or 'New Conversation'} "
            f"({row['message_count']} msgs · {row['course_name']})"
        )

    raw = input("  Enter number: ").strip()
    if not raw.isdigit():
        print("Invalid selection.")
        pause()
        return None

    picked = int(raw)
    if picked < 1 or picked > len(rows):
        print("Invalid selection.")
        pause()
        return None
    return rows[picked - 1]["conversation"].id


def pick_course(db) -> Course | None:
    courses = list_courses(db)
    if not courses:
        print("No courses found.")
        return None

    print("  Courses:")
    for idx, course in enumerate(courses, start=1):
        label = f"{course.name} ({course.code})" if course.code else course.name
        print(f"  [{idx}] {label}")
    print("  [b] Back")

    raw = input("  Enter number: ").strip().lower()
    if raw == "b":
        return None
    if not raw.isdigit():
        print("Invalid selection.")
        return None
    selected = int(raw)
    if selected < 1 or selected > len(courses):
        print("Invalid selection.")
        return None
    return courses[selected - 1]


def pick_folder(db, course_id: int) -> Folder | None:
    folders = (
        db.query(Folder)
        .filter(Folder.course_id == course_id)
        .order_by(Folder.order_index.asc(), Folder.id.asc())
        .all()
    )
    if not folders:
        print("No folders in this course.")
        return None

    print("  Folders:")
    for idx, folder in enumerate(folders, start=1):
        print(f"  [{idx}] {folder.name}")
    print("  [b] Back")

    raw = input("  Enter number: ").strip().lower()
    if raw == "b":
        return None
    if not raw.isdigit():
        print("Invalid selection.")
        return None
    selected = int(raw)
    if selected < 1 or selected > len(folders):
        print("Invalid selection.")
        return None
    return folders[selected - 1]


def pick_file(db, folder_id: int) -> NoteFile | None:
    files = (
        db.query(NoteFile)
        .filter(NoteFile.folder_id == folder_id)
        .order_by(NoteFile.id.asc())
        .all()
    )
    if not files:
        print("No files in this folder.")
        return None

    print("  Files:")
    for idx, file_obj in enumerate(files, start=1):
        print(f"  [{idx}] {file_obj.name}")
    print("  [b] Back")

    raw = input("  Enter number: ").strip().lower()
    if raw == "b":
        return None
    if not raw.isdigit():
        print("Invalid selection.")
        return None
    selected = int(raw)
    if selected < 1 or selected > len(files):
        print("Invalid selection.")
        return None
    return files[selected - 1]


def choose_rag_context(db) -> tuple[int | None, int | None, int | None, str]:
    print("Link context for RAG? (AI will only search these files)")
    print("  [1] Whole course")
    print("  [2] Specific folder")
    print("  [3] Specific file")
    print("  [4] No context (general AI, no file search)")

    choice = input("Choice [1-4]: ").strip()
    if choice == "1":
        course = pick_course(db)
        if not course:
            return None, None, None, f"{CHAT_ICON} No RAG context"
        return course.id, None, None, f"{BOOK_ICON} {course.name} (full course)"

    if choice == "2":
        course = pick_course(db)
        if not course:
            return None, None, None, f"{CHAT_ICON} No RAG context"
        folder = pick_folder(db, course.id)
        if not folder:
            return None, None, None, f"{CHAT_ICON} No RAG context"
        return course.id, folder.id, None, f"{FOLDER_ICON} {folder.name}"

    if choice == "3":
        course = pick_course(db)
        if not course:
            return None, None, None, f"{CHAT_ICON} No RAG context"
        folder = pick_folder(db, course.id)
        if not folder:
            return None, None, None, f"{CHAT_ICON} No RAG context"
        file_obj = pick_file(db, folder.id)
        if not file_obj:
            return None, None, None, f"{CHAT_ICON} No RAG context"
        return course.id, folder.id, file_obj.id, f"{FILE_ICON} {file_obj.name}"

    return None, None, None, f"{CHAT_ICON} No RAG context"


def display_chat_header(service: ChatService, db, conv_id: int, provider: str, model: str | None) -> None:
    conv = service.get_conversation(conv_id)
    context_label = context_description(db, conv)
    clear_screen()
    print("-----------------------------------------------------------------")
    print(f"  {conv.title or 'New Conversation'}  |  {context_label}  |  {provider_title(provider, model)}")
    print("  Type /help for commands")
    print("-----------------------------------------------------------------\n")


def show_history(service: ChatService, conv_id: int, limit: int = 10) -> None:
    messages = service.get_messages(conv_id)[-limit:]
    if not messages:
        print("No messages yet.")
        return

    print()
    for msg in messages:
        speaker = "You" if msg.role == "user" else "AI Tutor"
        print(f"  {speaker}: {msg.content}")
    print()


def latest_sources(service: ChatService, conv_id: int) -> list[str]:
    messages = service.get_messages(conv_id)
    for msg in reversed(messages):
        if msg.role == "assistant":
            return parse_sources(msg.sources)
    return []


async def stream_and_print(
    service: ChatService,
    conv_id: int,
    user_content: str,
    provider: str,
    model: str | None,
) -> None:
    async for token in service.stream_response(
        conv_id=conv_id,
        user_content=user_content,
        provider=provider,
        model=model,
    ):
        print(token, end="", flush=True)


def print_stream_error(provider: str, exc: Exception) -> None:
    if isinstance(exc, FileNotFoundError):
        print(f"\nLocal model file not found: {exc}")
        print("Run: python scripts/download_model.py")
        return
    if isinstance(exc, RuntimeError) and "GROQ_API_KEY" in str(exc):
        print("\nGroq API key is missing.")
        print("Add GROQ_API_KEY to .env and restart the CLI.")
        return
    if isinstance(exc, RuntimeError) and "llama-cpp-python is not installed" in str(exc):
        print(f"\n{exc}")
        return
    if provider == "ollama" and isinstance(exc, httpx.ConnectError):
        print("\nCould not connect to Ollama.")
        print("Start Ollama first with: ollama serve")
        return
    if provider == "groq":
        print(f"\nNetwork/API error while streaming from Groq: {exc}")
        print("You can retry the same message.")
        return
    print(f"\nError during streaming: {exc}")


def chat_loop(service: ChatService, db, conv_id: int, provider: str, model: str | None) -> tuple[str, str | None]:
    last_sources: list[str] = []
    display_chat_header(service, db, conv_id, provider, model)
    show_history(service, conv_id)

    while True:
        try:
            user_input = input("  You: ").strip()
        except KeyboardInterrupt:
            print("\nReturning to main menu.")
            return provider, model

        if not user_input:
            continue

        if user_input.startswith("/"):
            command = user_input.lower()
            if command == "/help":
                print("\n  /help, /clear, /history, /sources, /provider, /context, /title, /quit\n")
            elif command == "/clear":
                display_chat_header(service, db, conv_id, provider, model)
            elif command == "/history":
                show_history(service, conv_id)
            elif command == "/sources":
                if not last_sources:
                    last_sources = latest_sources(service, conv_id)
                if last_sources:
                    print(f"\n  {SOURCE_ICON} Sources: {', '.join(last_sources)}\n")
                else:
                    print("\n  No sources available yet.\n")
            elif command == "/provider":
                provider, model = select_provider(provider, model)
                print(f"\nProvider switched to: {provider_title(provider, model)}\n")
            elif command == "/context":
                course_id, folder_id, file_id, description = choose_rag_context(db)
                service.update_context(
                    conv_id=conv_id,
                    course_id=course_id,
                    folder_id=folder_id,
                    file_id=file_id,
                )
                print(f"\n{CHECK_ICON} Context updated - now searching: {description}\n")
                display_chat_header(service, db, conv_id, provider, model)
            elif command == "/title":
                try:
                    new_title = asyncio.run(service.auto_title(conv_id, provider=provider))
                    print(f'\nConversation titled: "{new_title}"\n')
                    display_chat_header(service, db, conv_id, provider, model)
                except Exception as exc:
                    print(f"\nFailed to auto-title conversation: {exc}\n")
            elif command == "/quit":
                return provider, model
            else:
                print("\nUnknown command. Type /help.\n")
            continue

        print()
        print("  AI Tutor: ", end="", flush=True)
        try:
            asyncio.run(stream_and_print(service, conv_id, user_input, provider, model))
            print()
        except KeyboardInterrupt:
            print("\nStreaming cancelled. Returning to main menu.")
            return provider, model
        except Exception as exc:
            print_stream_error(provider, exc)
            print()
            continue

        last_sources = latest_sources(service, conv_id)
        if last_sources:
            print(f"\n  {SOURCE_ICON} Sources: {', '.join(last_sources)}")
        print()


def create_new_conversation(service: ChatService, db, provider: str, model: str | None) -> tuple[str, str | None]:
    title = input("Title (Enter for auto-title later): ").strip()
    course_id, folder_id, file_id, _ = choose_rag_context(db)

    conversation = service.create_conversation(
        user_id=USER_ID,
        title=title or None,
        course_id=course_id,
        folder_id=folder_id,
        file_id=file_id,
    )
    return chat_loop(service, db, conversation.id, provider, model)


def run() -> None:
    db = SessionLocal()
    service = ChatService(db)

    provider = settings.ai_provider if settings.ai_provider in {"local", "groq", "ollama"} else "groq"
    if provider == "local":
        model: str | None = Path(settings.local_model_path).name
    elif provider == "ollama":
        model = settings.ollama_model
    else:
        model = settings.groq_model

    interrupt_count = 0
    try:
        while True:
            clear_screen()
            conversations = service.get_conversations(USER_ID)
            print(LINE)
            print("  TaskArena - AI Tutor")
            print(LINE)
            print(f"  Provider: {provider_title(provider, model)}")
            print(f"  {len(conversations)} saved conversations\n")
            print("  [1] New conversation")
            print("  [2] Open conversation")
            print("  [3] Delete conversation")
            print("  [4] Switch AI provider")
            print("  [q] Quit")

            try:
                choice = input("\nChoose an option: ").strip().lower()
            except KeyboardInterrupt:
                if interrupt_count == 0:
                    interrupt_count = 1
                    print("\nPress Ctrl+C again to quit.")
                    pause()
                    continue
                print("\nExiting AI Tutor.")
                break

            interrupt_count = 0

            if choice == "1":
                provider, model = create_new_conversation(service, db, provider, model)
            elif choice == "2":
                conv_id = pick_conversation(service, db)
                if conv_id is not None:
                    provider, model = chat_loop(service, db, conv_id, provider, model)
            elif choice == "3":
                conv_id = pick_conversation(service, db)
                if conv_id is not None:
                    conv = service.get_conversation(conv_id)
                    confirm = input(f'Delete "{conv.title or "New Conversation"}"? [y/N]: ').strip().lower()
                    if confirm == "y":
                        service.delete_conversation(conv_id)
                        print("Conversation deleted.")
                    else:
                        print("Delete cancelled.")
                    pause()
            elif choice == "4":
                provider, model = select_provider(provider, model)
                pause()
            elif choice == "q":
                print("Goodbye.")
                break
            else:
                print("Invalid option.")
                pause()
    finally:
        db.close()


if __name__ == "__main__":
    run()
