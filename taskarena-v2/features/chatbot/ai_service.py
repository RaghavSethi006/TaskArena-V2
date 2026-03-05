from __future__ import annotations

import json
from abc import ABC, abstractmethod
from pathlib import Path
from typing import AsyncGenerator

import httpx

from shared.config import settings


DEFAULT_SYSTEM_PROMPT = "You are a helpful AI tutor for students."


class BaseAI(ABC):
    @abstractmethod
    async def stream(
        self,
        messages: list[dict],
        context: str = "",
        system: str = "",
    ) -> AsyncGenerator[str, None]: ...

    @abstractmethod
    async def complete(
        self,
        messages: list[dict],
        context: str = "",
        system: str = "",
        max_tokens: int = 1024,
    ) -> str: ...


class LocalAI(BaseAI):
    def __init__(self):
        try:
            from llama_cpp import Llama
        except ImportError as exc:
            raise RuntimeError(
                "llama-cpp-python is not installed. Run: pip install llama-cpp-python"
            ) from exc

        model_path = Path(settings.local_model_path)
        if not model_path.exists():
            raise FileNotFoundError(str(model_path))

        self.model = model_path.name
        self.llm = Llama(
            model_path=str(model_path),
            n_ctx=settings.local_n_ctx,
            n_threads=settings.local_n_threads,
            n_gpu_layers=settings.local_n_gpu_layers,
            verbose=False,
        )

    def _build_prompt(
        self, messages: list[dict], context: str = "", system: str = ""
    ) -> str:
        parts = ["<|im_start|>system\n"]
        sys_msg = system or DEFAULT_SYSTEM_PROMPT
        if context:
            sys_msg += f"\n\nRelevant context from the student's notes:\n{context}"
        parts.append(sys_msg + "\n<|im_end|>\n")
        for msg in messages:
            parts.append(f"<|im_start|>{msg['role']}\n{msg['content']}\n<|im_end|>\n")
        parts.append("<|im_start|>assistant\n")
        return "".join(parts)

    async def stream(
        self,
        messages: list[dict],
        context: str = "",
        system: str = "",
    ) -> AsyncGenerator[str, None]:
        prompt = self._build_prompt(messages, context, system)
        for chunk in self.llm(
            prompt,
            max_tokens=1024,
            stream=True,
            stop=["<|im_end|>", "<|im_start|>"],
            temperature=0.7,
        ):
            token = chunk["choices"][0]["text"]
            if token:
                yield token

    async def complete(
        self,
        messages: list[dict],
        context: str = "",
        system: str = "",
        max_tokens: int = 1024,
    ) -> str:
        prompt = self._build_prompt(messages, context, system)
        result = self.llm(
            prompt,
            max_tokens=max_tokens,
            stream=False,
            stop=["<|im_end|>", "<|im_start|>"],
            temperature=0.3,
        )
        return result["choices"][0]["text"]


class GroqAI(BaseAI):
    DEFAULT_MODEL = "llama-3.3-70b-versatile"

    def __init__(self, model: str = DEFAULT_MODEL):
        from groq import Groq

        self.client = Groq(api_key=settings.groq_api_key)
        self.model = model

    def _build_messages(self, messages, context="", system=""):
        sys_content = system or "You are a helpful AI tutor for students."
        if context:
            sys_content += f"\n\nRelevant context from the student's notes:\n{context}"
        return [{"role": "system", "content": sys_content}] + messages

    async def stream(self, messages, context="", system=""):
        full_messages = self._build_messages(messages, context, system)

        def _sync_stream():
            """Run sync Groq streaming in a thread — avoids Windows asyncio conflict."""
            tokens = []
            with self.client.chat.completions.create(
                model=self.model,
                messages=full_messages,
                stream=True,
                temperature=0.7,
                max_tokens=1024,
            ) as response:
                for chunk in response:
                    token = chunk.choices[0].delta.content
                    if token:
                        tokens.append(token)
            return tokens

        # Run sync streaming in thread pool, then yield results
        # This avoids the httpx AsyncClient / Windows event loop conflict
        import asyncio

        tokens = await asyncio.to_thread(_sync_stream)
        for token in tokens:
            yield token

    async def complete(self, messages, context="", system="", max_tokens=1024):
        full_messages = self._build_messages(messages, context, system)
        response = self.client.chat.completions.create(
            model=self.model,
            messages=full_messages,
            stream=False,
            temperature=0.3,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content


class OllamaAI(BaseAI):
    def __init__(self, model: str = settings.ollama_model):
        self.model = model
        self.base_url = settings.ollama_base_url.rstrip("/")

    def _build_messages(
        self,
        messages: list[dict],
        context: str = "",
        system: str = "",
    ) -> list[dict]:
        sys_content = system or DEFAULT_SYSTEM_PROMPT
        if context:
            sys_content += f"\n\nRelevant context from the student's notes:\n{context}"
        return [{"role": "system", "content": sys_content}] + messages

    async def stream(
        self,
        messages: list[dict],
        context: str = "",
        system: str = "",
    ) -> AsyncGenerator[str, None]:
        payload = {
            "model": self.model,
            "messages": self._build_messages(messages, context, system),
            "stream": True,
            "options": {"temperature": 0.7},
        }
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream(
                "POST", f"{self.base_url}/api/chat", json=payload
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    data = json.loads(line)
                    token = data.get("message", {}).get("content", "")
                    if token:
                        yield token

    async def complete(
        self,
        messages: list[dict],
        context: str = "",
        system: str = "",
        max_tokens: int = 1024,
    ) -> str:
        payload = {
            "model": self.model,
            "messages": self._build_messages(messages, context, system),
            "stream": False,
            "options": {"temperature": 0.3, "num_predict": max_tokens},
        }
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(f"{self.base_url}/api/chat", json=payload)
            response.raise_for_status()
            return response.json().get("message", {}).get("content", "")


def get_ai(provider: str, **kwargs) -> BaseAI:
    if provider == "local":
        return LocalAI()
    if provider == "groq":
        return GroqAI(model=kwargs.get("model", settings.groq_model))
    if provider == "ollama":
        return OllamaAI(model=kwargs.get("model", settings.ollama_model))
    raise ValueError(
        f"Unknown AI provider: '{provider}'. Use 'local', 'groq', or 'ollama'."
    )
