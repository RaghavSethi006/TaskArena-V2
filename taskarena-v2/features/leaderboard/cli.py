from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import func

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
load_dotenv()

from features.leaderboard.service import LeaderboardService
from shared.database import SessionLocal
from shared.user_model import User


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
POINTER = symbol("\u25b6", ">")
YOU_SUFFIX = symbol("\u2190 YOU", "<- YOU")
GOLD = symbol("\U0001F947", "1st")
SILVER = symbol("\U0001F948", "2nd")
BRONZE = symbol("\U0001F949", "3rd")
FIRE = symbol("\U0001F525", "")


def clear_screen() -> None:
    os.system("cls" if os.name == "nt" else "clear")


def pause() -> None:
    input("\n(press Enter to return)")


def render_menu() -> None:
    print(HLINE * 37)
    print("  TaskArena - Leaderboard")
    print(HLINE * 37)
    print("  [1] All-time rankings")
    print("  [2] This week's rankings")
    print("  [3] My stats")
    print("  [q] Quit")


def medal_for_rank(rank: int) -> str:
    if rank == 1:
        return GOLD
    if rank == 2:
        return SILVER
    if rank == 3:
        return BRONZE
    return "  "


def render_rankings_table(title: str, rows: list[dict]) -> None:
    print(HLINE * 73)
    print(f"  {title}")
    print(HLINE * 73)
    print("  Rank  Name              Level   XP        Tasks   Streak   Weekly XP")
    print(f"  {HLINE*4}  {HLINE*16}  {HLINE*6}  {HLINE*8}  {HLINE*6}  {HLINE*7}  {HLINE*9}")

    if not rows:
        print("  No ranking data available.")
        print(HLINE * 73)
        return

    for row in rows:
        rank = int(row["rank"])
        medal = medal_for_rank(rank)
        rank_text = str(rank).rjust(2)
        xp_text = f"{int(row['xp']):,}".rjust(8)
        tasks_text = str(int(row["tasks_completed"])).rjust(6)
        streak_text = f"{int(row['streak'])}d".rjust(7)
        weekly_text = f"+{int(row['weekly_xp'])}".rjust(9)
        level_text = f"Lv.{int(row['level'])}".rjust(6)
        name_text = str(row["name"])[:16].ljust(16)

        is_you = int(row["user_id"]) == USER_ID
        row_prefix = POINTER if is_you else " "
        suffix = f" {YOU_SUFFIX}" if is_you else ""

        print(
            f"{row_prefix} {medal} {rank_text}  {name_text}  {level_text}  "
            f"{xp_text}  {tasks_text}  {streak_text}  {weekly_text}{suffix}"
        )

    print(HLINE * 73)


def show_all_time(service: LeaderboardService) -> None:
    rows = service.get_rankings(limit=50)
    render_rankings_table("ALL-TIME LEADERBOARD", rows)


def show_weekly(service: LeaderboardService) -> None:
    rows = service.get_weekly_rankings(limit=50)
    render_rankings_table("THIS WEEK'S LEADERBOARD", rows)


def show_my_stats(service: LeaderboardService) -> None:
    stats = service.get_user_stats(USER_ID)
    total_users = service.db.query(func.count(User.id)).scalar() or 0

    print(HLINE * 37)
    print("  Your Stats")
    print(HLINE * 37)
    print(f"  Name:         {stats['name']}")
    print(f"  Rank:         #{stats['rank']} of {int(total_users)} users")
    print(f"  Level:        {stats['level']}")
    print(f"  Total XP:     {stats['xp']:,}")
    print(f"  This Week:    +{stats['weekly_xp']} XP")
    print()
    print(f"  Tasks Done:   {stats['tasks_completed']}")
    fire_suffix = f" {FIRE}" if FIRE else ""
    print(f"  Streak:       {stats['streak']} days{fire_suffix}")
    print()
    print(f"  Quizzes:      {stats['quizzes_taken']} taken")
    if stats["avg_quiz_score"] is None:
        print("  Avg Score:    -")
    else:
        print(f"  Avg Score:    {stats['avg_quiz_score']:.1f}%")
    print(HLINE * 37)


def main() -> None:
    db = SessionLocal()
    service = LeaderboardService(db)

    try:
        while True:
            clear_screen()
            render_menu()
            choice = input("\nChoose an option: ").strip().lower()
            clear_screen()

            if choice == "1":
                show_all_time(service)
                pause()
            elif choice == "2":
                show_weekly(service)
                pause()
            elif choice == "3":
                show_my_stats(service)
                pause()
            elif choice == "q":
                print("Goodbye.")
                break
            else:
                print("Invalid option. Choose 1-3 or q.")
                pause()
    except KeyboardInterrupt:
        print("\nExiting Leaderboard CLI.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
