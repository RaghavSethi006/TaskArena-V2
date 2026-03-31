from pathlib import Path
from typing import Optional

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user_id, get_db
from features.tasks.service import TaskService
from shared.config import settings
from shared.config import persist_runtime_settings

router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileUpdateBody(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None


class AIConfigUpdateBody(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None
    groq_api_key: Optional[str] = None
    ollama_url: Optional[str] = None


def _build_ai_config() -> dict:
    ollama_available = False
    try:
        r = httpx.get(f"{settings.ollama_base_url}/api/tags", timeout=1.0)
        ollama_available = r.status_code == 200
    except Exception:
        pass

    return {
        "provider": settings.ai_provider,
        "model": settings.groq_model,
        "groq_key_set": bool(settings.groq_api_key),
        "local_model_exists": Path(settings.local_model_path).exists(),
        "ollama_available": ollama_available,
        "ollama_url": settings.ollama_base_url,
    }


@router.get("")
def get_profile(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    user = TaskService(db).get_user(user_id)
    return user


@router.patch("")
def update_profile(
    body: ProfileUpdateBody,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    user = TaskService(db).get_user(user_id)

    updates = body.model_dump(exclude_none=True)
    for field_name, value in updates.items():
        setattr(user, field_name, value)

    db.commit()
    db.refresh(user)
    return user


@router.get("/ai-config")
def get_ai_config():
    return _build_ai_config()


@router.patch("/ai-config")
def update_ai_config(body: AIConfigUpdateBody):
    updates = body.model_dump(exclude_none=True)

    env_updates: dict[str, str | None] = {}

    if "provider" in updates:
        settings.ai_provider = updates["provider"]
        env_updates["AI_PROVIDER"] = updates["provider"]
    if "model" in updates:
        settings.groq_model = updates["model"]
        env_updates["GROQ_MODEL"] = updates["model"]
    if "groq_api_key" in updates:
        settings.groq_api_key = updates["groq_api_key"]
        env_updates["GROQ_API_KEY"] = updates["groq_api_key"]
    if "ollama_url" in updates:
        settings.ollama_base_url = updates["ollama_url"]
        env_updates["OLLAMA_BASE_URL"] = updates["ollama_url"]

    if env_updates:
        persist_runtime_settings(env_updates)

    return _build_ai_config()
