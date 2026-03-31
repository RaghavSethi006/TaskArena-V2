import os
import sys
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings


SOURCE_ROOT = Path(__file__).resolve().parent.parent


def _env_path(name: str) -> Path | None:
    raw_value = os.getenv(name)
    if not raw_value:
        return None
    return Path(raw_value).resolve()


ENV_RUNTIME_ROOT = _env_path("TASKARENA_RUNTIME_DIR")
ENV_RESOURCE_ROOT = _env_path("TASKARENA_RESOURCE_DIR")

if ENV_RUNTIME_ROOT is not None:
    RUNTIME_ROOT = ENV_RUNTIME_ROOT
    RESOURCE_ROOT = ENV_RESOURCE_ROOT or ENV_RUNTIME_ROOT
elif getattr(sys, "frozen", False):
    RUNTIME_ROOT = Path(sys.executable).resolve().parent
    RESOURCE_ROOT = Path(getattr(sys, "_MEIPASS", RUNTIME_ROOT))
else:
    RUNTIME_ROOT = SOURCE_ROOT
    RESOURCE_ROOT = SOURCE_ROOT

ENV_FILES = [str(RUNTIME_ROOT / ".env")]
RESOURCE_ENV_FILE = RESOURCE_ROOT / ".env"
if RESOURCE_ENV_FILE != RUNTIME_ROOT / ".env":
    ENV_FILES.append(str(RESOURCE_ENV_FILE))


class Settings(BaseSettings):
    # Database
    db_path: str = str(RUNTIME_ROOT / "data" / "taskarena.db")

    # API
    api_port: int = 8765
    api_host: str = "127.0.0.1"
    debug: bool = False

    # AI provider
    ai_provider: str = "groq"
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    local_model_path: str = str(RUNTIME_ROOT / "models" / "qwen2.5-7b-instruct-q4_k_m.gguf")
    local_n_ctx: int = 4096
    local_n_gpu_layers: int = -1
    local_n_threads: int = 8
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:7b"

    # Embeddings
    embedding_model: str = "allenai/scibert_scivocab_uncased"
    embedding_cache_dir: str = str(RUNTIME_ROOT / "models" / "scibert")
    rag_top_k: int = 5
    chunk_size: int = 512
    chunk_overlap: int = 64

    @field_validator("debug", mode="before")
    @classmethod
    def _normalize_debug(cls, value):
        if isinstance(value, str):
            lowered = value.strip().lower()
            if lowered in {"release", "prod", "production"}:
                return False
            if lowered in {"debug", "dev", "development"}:
                return True
        return value

    @field_validator("db_path", "local_model_path", "embedding_cache_dir", mode="before")
    @classmethod
    def _resolve_runtime_relative_paths(cls, value):
        if not isinstance(value, str):
            return value

        candidate = Path(value).expanduser()
        if candidate.is_absolute():
            return str(candidate)

        return str((RUNTIME_ROOT / candidate).resolve())

    @property
    def db_url(self) -> str:
        return f"sqlite:///{self.db_path}"

    @property
    def root(self) -> Path:
        return RUNTIME_ROOT

    @property
    def resource_root(self) -> Path:
        return RESOURCE_ROOT

    model_config = {
        "env_file": ENV_FILES,
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
