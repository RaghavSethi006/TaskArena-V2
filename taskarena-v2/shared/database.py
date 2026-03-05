from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from shared.config import settings


engine = create_engine(
    settings.db_url,
    connect_args={"check_same_thread": False},
    echo=settings.debug,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db():
    """Dependency for both CLI apps and FastAPI routes."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
