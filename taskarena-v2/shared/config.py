from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings


ROOT = Path(__file__).parent.parent


class Settings(BaseSettings):
    # Database
    db_path: str = str(ROOT / "data" / "taskarena.db")

    # API
    api_port: int = 8765
    api_host: str = "127.0.0.1"
    debug: bool = False

    # AI provider
    ai_provider: str = "groq"
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    local_model_path: str = str(ROOT / "models" / "qwen2.5-7b-instruct-q4_k_m.gguf")
    local_n_ctx: int = 4096
    local_n_gpu_layers: int = -1
    local_n_threads: int = 8
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:7b"

    # Embeddings
    embedding_model: str = "allenai/scibert_scivocab_uncased"
    embedding_cache_dir: str = str(ROOT / "models" / "scibert")
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

    @property
    def db_url(self) -> str:
        return f"sqlite:///{self.db_path}"

    @property
    def root(self) -> Path:
        return ROOT

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()