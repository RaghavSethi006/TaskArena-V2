"""
Drops all tables and recreates them. Dev use only.
Run: python scripts/reset_db.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from shared.database import engine
from shared.models_base import Base

import shared.user_model  # noqa: F401
import features.tasks.models  # noqa: F401
import features.notes.models  # noqa: F401
import features.chatbot.models  # noqa: F401
import features.schedule.models  # noqa: F401
import features.quiz.models  # noqa: F401
import features.study_materials.models  # noqa: F401

if __name__ == "__main__":
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("Done. Run scripts/seed.py to populate with test data.")
