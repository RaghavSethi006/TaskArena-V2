from typing import Generator

from sqlalchemy.orm import Session

from shared.database import SessionLocal


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency — yields a DB session, always closes it.
    Usage in routers: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Hardcoded for v2 — single user, no auth yet
# When auth is added in v2.1 this becomes a real JWT dependency
CURRENT_USER_ID = 1


def get_current_user_id() -> int:
    return CURRENT_USER_ID
