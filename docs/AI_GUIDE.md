# TaskArena v2 — AI Guide

## Overview

The AI system has three layers:
1. **Provider abstraction** — swap between local, Groq, and Ollama with one setting
2. **RAG pipeline** — injects relevant content from your own notes into every prompt
3. **Feature AI** — chatbot, quiz generator, and schedule suggestions each use the same providers

---

## Provider Abstraction

```python
# features/chatbot/ai_service.py

from abc import ABC, abstractmethod
from typing import AsyncGenerator

class BaseAI(ABC):
    @abstractmethod
    async def stream(
        self,
        messages: list[dict],   # [{"role": "user"|"assistant", "content": "..."}]
        context: str = "",       # RAG context injected as system message
        system: str = "",        # Additional system prompt
    ) -> AsyncGenerator[str, None]:
        """Yield tokens one at a time as they are generated."""
        ...

    @abstractmethod
    async def complete(
        self,
        messages: list[dict],
        context: str = "",
        system: str = "",
        max_tokens: int = 1024,
    ) -> str:
        """Return full response as string (for quiz generation, schedule suggestions)."""
        ...
```

---

## Local AI — Qwen2.5-7B

```python
class LocalAI(BaseAI):
    def __init__(self):
        from llama_cpp import Llama
        from shared.config import LOCAL_MODEL_PATH
        self.llm = Llama(
            model_path=str(LOCAL_MODEL_PATH),
            n_ctx=4096,
            n_threads=8,      # adjust to your CPU core count
            n_gpu_layers=-1,  # -1 = use GPU if available, 0 = CPU only
            verbose=False,
        )

    def _build_prompt(self, messages, context="", system=""):
        # Qwen2.5 uses ChatML format
        parts = ["<|im_start|>system\n"]
        sys_msg = system or "You are a helpful AI tutor for students."
        if context:
            sys_msg += f"\n\nRelevant context from the student's notes:\n{context}"
        parts.append(sys_msg + "\n<|im_end|>\n")
        for msg in messages:
            parts.append(f"<|im_start|>{msg['role']}\n{msg['content']}\n<|im_end|>\n")
        parts.append("<|im_start|>assistant\n")
        return "".join(parts)

    async def stream(self, messages, context="", system=""):
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

    async def complete(self, messages, context="", system="", max_tokens=1024):
        prompt = self._build_prompt(messages, context, system)
        result = self.llm(prompt, max_tokens=max_tokens, stream=False,
                          stop=["<|im_end|>", "<|im_start|>"], temperature=0.3)
        return result["choices"][0]["text"]
```

---

## Groq AI

```python
class GroqAI(BaseAI):
    DEFAULT_MODEL = "llama-3.3-70b-versatile"

    def __init__(self, model: str = DEFAULT_MODEL):
        from groq import AsyncGroq
        import os
        self.client = AsyncGroq(api_key=os.environ["GROQ_API_KEY"])
        self.model = model

    def _build_messages(self, messages, context="", system=""):
        sys_content = system or "You are a helpful AI tutor for students."
        if context:
            sys_content += f"\n\nRelevant context from the student's notes:\n{context}"
        return [{"role": "system", "content": sys_content}] + messages

    async def stream(self, messages, context="", system=""):
        full_messages = self._build_messages(messages, context, system)
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=full_messages,
            stream=True,
            temperature=0.7,
            max_tokens=1024,
        )
        async for chunk in response:
            token = chunk.choices[0].delta.content
            if token:
                yield token

    async def complete(self, messages, context="", system="", max_tokens=1024):
        full_messages = self._build_messages(messages, context, system)
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=full_messages,
            stream=False,
            temperature=0.3,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content
```

---

## Ollama AI

```python
class OllamaAI(BaseAI):
    DEFAULT_MODEL = "qwen2.5:7b"

    def __init__(self, model: str = DEFAULT_MODEL):
        self.model = model
        self.base_url = "http://localhost:11434"

    def _build_messages(self, messages, context="", system=""):
        sys_content = system or "You are a helpful AI tutor for students."
        if context:
            sys_content += f"\n\nRelevant context:\n{context}"
        return [{"role": "system", "content": sys_content}] + messages

    async def stream(self, messages, context="", system=""):
        import httpx, json
        full_messages = self._build_messages(messages, context, system)
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", f"{self.base_url}/api/chat",
                json={"model": self.model, "messages": full_messages, "stream": True}
            ) as response:
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    data = json.loads(line)
                    token = data.get("message", {}).get("content", "")
                    if token:
                        yield token

    async def complete(self, messages, context="", system="", max_tokens=1024):
        import httpx, json
        full_messages = self._build_messages(messages, context, system)
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(f"{self.base_url}/api/chat",
                json={"model": self.model, "messages": full_messages, "stream": False})
            return response.json()["message"]["content"]
```

---

## Factory Function

```python
def get_ai(provider: str, **kwargs) -> BaseAI:
    """
    Usage:
        ai = get_ai("local")
        ai = get_ai("groq", model="llama-3.1-8b-instant")
        ai = get_ai("ollama", model="llama3.2")
    """
    if provider == "local":
        return LocalAI()
    elif provider == "groq":
        model = kwargs.get("model", GroqAI.DEFAULT_MODEL)
        return GroqAI(model=model)
    elif provider == "ollama":
        model = kwargs.get("model", OllamaAI.DEFAULT_MODEL)
        return OllamaAI(model=model)
    else:
        raise ValueError(f"Unknown AI provider: '{provider}'. Use 'local', 'groq', or 'ollama'.")
```

---

## RAG Pipeline

### How it works

```
User message: "explain Newton's third law"
     ↓
1. Embed query with SciBERT
2. Load all embeddings for course_id from file_chunks table
3. Compute cosine similarity between query embedding and all chunk embeddings
4. Take top 5 most relevant chunks
5. Format as context string
6. Inject into AI system prompt
7. AI responds with knowledge grounded in the student's own notes
```

### Implementation

```python
# features/notes/indexer.py

import numpy as np
from sentence_transformers import SentenceTransformer

MODEL_NAME = "allenai/scibert_scivocab_uncased"

class Indexer:
    _model = None  # singleton, loaded once

    @classmethod
    def get_model(cls):
        if cls._model is None:
            cls._model = SentenceTransformer(MODEL_NAME)
        return cls._model

    def embed(self, texts: list[str]) -> np.ndarray:
        return self.get_model().encode(texts, normalize_embeddings=True)

    def cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        return float(np.dot(a, b))  # already normalized

    def search(self, query: str, course_id: int, db, top_k: int = 5) -> list[dict]:
        query_embedding = self.embed([query])[0]

        # Load all chunks for this course
        chunks = (
            db.query(FileChunk)
            .join(File).join(Folder).join(Course)
            .filter(Course.id == course_id)
            .all()
        )
        if not chunks:
            return []

        # Score each chunk
        scored = []
        for chunk in chunks:
            chunk_embedding = np.frombuffer(chunk.embedding, dtype=np.float32)
            score = self.cosine_similarity(query_embedding, chunk_embedding)
            scored.append({"chunk": chunk, "score": score})

        # Return top-k
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]
```

```python
# features/chatbot/rag_service.py

class RAGService:
    def __init__(self, db):
        self.db = db
        self.indexer = Indexer()

    def get_context(self, query: str, course_id: int, top_k: int = 5) -> str:
        """Returns formatted context string ready for injection into AI prompt."""
        results = self.indexer.search(query, course_id, self.db, top_k)
        if not results:
            return ""

        parts = []
        for i, r in enumerate(results, 1):
            file_name = r["chunk"].file.name
            content = r["chunk"].content
            parts.append(f"[Source {i}: {file_name}]\n{content}")

        return "\n\n---\n\n".join(parts)

    def get_sources(self, query: str, course_id: int, top_k: int = 5) -> list[str]:
        """Returns list of unique source filenames for citation display."""
        results = self.indexer.search(query, course_id, self.db, top_k)
        seen = []
        for r in results:
            name = r["chunk"].file.name
            if name not in seen:
                seen.append(name)
        return seen
```

---

## Quiz Generation Prompts

```python
# features/quiz/generator.py

SYSTEM_PROMPT = """You are an expert quiz generator for students.
Generate multiple choice questions based ONLY on the provided study material.
Always respond with valid JSON only — no markdown, no explanation, no preamble."""

def build_prompt(context: str, n_questions: int, difficulty: str) -> str:
    difficulty_instructions = {
        "easy": "Focus on basic definitions, key terms, and simple recall.",
        "medium": "Include conceptual understanding and application of ideas.",
        "hard": "Focus on analysis, synthesis, edge cases, and deep reasoning.",
    }
    return f"""Study material:
{context}

Generate exactly {n_questions} multiple choice questions at {difficulty} difficulty.
{difficulty_instructions[difficulty]}

Rules:
- Questions must be answerable from the provided material only
- Each question must have exactly 4 options (a, b, c, d)
- Only one option should be correct
- Include a brief explanation for why the correct answer is right
- Do not reference "the passage" or "the text" — write standalone questions

Respond ONLY with this JSON structure:
{{
  "questions": [
    {{
      "question": "...",
      "options": {{
        "a": "...",
        "b": "...",
        "c": "...",
        "d": "..."
      }},
      "correct": "a",
      "explanation": "..."
    }}
  ]
}}"""
```

---

## Schedule AI Prompts

```python
# features/schedule/ai_suggestions.py

SYSTEM_PROMPT = """You are an academic schedule planner.
Your job is to analyze a student's upcoming deadlines and existing schedule,
then suggest focused study blocks that make their workload manageable.
Always respond with valid JSON only."""

def build_suggestions_prompt(tasks: list, events: list, today: str) -> str:
    tasks_str = "\n".join([
        f"- {t.title} ({t.subject}) due {t.deadline} [{t.type}]"
        for t in tasks
    ])
    events_str = "\n".join([
        f"- {e.date} {e.start_time}: {e.title} ({e.duration}min)"
        for e in events
    ]) or "No existing events"

    return f"""Today is {today}.

Upcoming tasks and deadlines:
{tasks_str}

Already scheduled events:
{events_str}

Suggest 3–5 study blocks for the next 7 days that:
1. Prioritize tasks due soonest
2. Don't overlap with existing events
3. Are realistic in length (30–120 minutes each)
4. Include a brief reason for each suggestion

Respond ONLY with this JSON:
{{
  "suggestions": [
    {{
      "title": "Study: Physics Ch.7 Thermodynamics",
      "type": "study",
      "date": "2026-03-04",
      "start_time": "19:00",
      "duration": 90,
      "course": "Physics 201",
      "reason": "Midterm in 2 days — needs 2 more review sessions",
      "priority": "high"
    }}
  ]
}}"""
```

---

## Groq Models — When to Use Which

| Situation | Recommended Model |
|---|---|
| Main chat conversations | `llama-3.3-70b-versatile` |
| Quick simple questions | `llama-3.1-8b-instant` |
| Quiz generation (needs structured JSON output) | `llama-3.3-70b-versatile` |
| Schedule suggestions | `llama-3.3-70b-versatile` |
| Long document summarization | `mixtral-8x7b-32768` (32k context) |

---

## Model Setup Checklist

### Local (Qwen2.5-7B)
- [ ] Download `qwen2.5-7b-instruct-q4_k_m.gguf` to `models/`
- [ ] Set `LOCAL_MODEL_PATH` in `shared/config.py`
- [ ] Install llama-cpp-python with GPU support if available
- [ ] Test: `python -c "from features.chatbot.ai_service import LocalAI; ai = LocalAI()"`

### Groq
- [ ] Create account at https://console.groq.com
- [ ] Generate API key
- [ ] Add `GROQ_API_KEY=gsk_...` to `.env`
- [ ] Test: `python -c "import os; from groq import Groq; c = Groq(); print('OK')"`

### Ollama (optional)
- [ ] Install Ollama from https://ollama.com
- [ ] `ollama pull qwen2.5:7b`
- [ ] Confirm running: `ollama list`
- [ ] Test: `curl http://localhost:11434/api/tags`
