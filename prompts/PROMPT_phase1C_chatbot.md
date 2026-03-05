# TaskArena v2 — Phase 1C: Chatbot CLI
# Depends on: Phase 0, 1A, 1B complete (indexer must work)
# Goal: Streaming AI chat in terminal with RAG, local + Groq both working

---

## PROMPT

---

You are continuing to build TaskArena v2. Phases 0, 1A, and 1B are complete. The notes indexer works and file_chunks table has data.

Before writing any code read these docs:
1. `docs/AI_GUIDE.md` — full AI provider implementations and RAG pipeline
2. `docs/ARCHITECTURE.md` — the service pattern and data flow for chat
3. `docs/DATABASE.md` — chat_conversations and chat_messages schemas
4. `docs/CONVENTIONS.md` — service rules
5. `docs/PROMPTS.md` — the exact system prompts to use

Your job is **Phase 1C only** — the Chatbot CLI. Build exactly these files:

```
features/chatbot/schemas.py
features/chatbot/ai_service.py
features/chatbot/rag_service.py
features/chatbot/service.py
features/chatbot/cli.py
features/chatbot/README.md
```

---

## `features/chatbot/schemas.py`

```python
# ConversationCreate: title (optional), context_course_id (optional int)
# ConversationOut: id, title, context_course_id, created_at, updated_at, message_count (int)
# MessageCreate: content (str), provider (str default "groq"), model (optional str)
# MessageOut: id, conversation_id, role, content, sources (list[str]), model_used, created_at
```

`sources` is stored as JSON in the DB — deserialize to `list[str]` in the Out schema.
All Out schemas: `model_config = ConfigDict(from_attributes=True)`.

---

## `features/chatbot/ai_service.py`

Implement exactly as specified in `docs/AI_GUIDE.md`. Copy the code from that doc as the starting point, then complete any missing pieces.

**`BaseAI` abstract class:**
```python
class BaseAI(ABC):
    @abstractmethod
    async def stream(self, messages: list[dict], context: str = "", system: str = "") -> AsyncGenerator[str, None]: ...

    @abstractmethod
    async def complete(self, messages: list[dict], context: str = "", system: str = "", max_tokens: int = 1024) -> str: ...
```

**`LocalAI`** — Qwen2.5 via llama-cpp-python:
- Model path from `settings.local_model_path`
- n_ctx, n_gpu_layers, n_threads all from settings
- Use ChatML format for prompt building (as in docs/AI_GUIDE.md)
- Stop tokens: `["<|im_end|>", "<|im_start|>"]`
- Temperature 0.7 for stream, 0.3 for complete

**`GroqAI`** — Groq API:
- API key from `settings.groq_api_key`
- Default model from `settings.groq_model`
- Use `groq.AsyncGroq` for async streaming
- Temperature 0.7 for stream, 0.3 for complete

**`OllamaAI`** — Ollama local server:
- Base URL from `settings.ollama_base_url`
- Model from `settings.ollama_model`
- Use httpx async streaming
- Temperature 0.7 for stream

**`get_ai(provider: str, **kwargs) -> BaseAI`** factory:
- `"local"` → `LocalAI()`
- `"groq"` → `GroqAI(model=kwargs.get("model", settings.groq_model))`
- `"ollama"` → `OllamaAI(model=kwargs.get("model", settings.ollama_model))`
- Unknown provider → raise `ValueError`

**Important:** `LocalAI.__init__` should catch `ImportError` (if llama-cpp-python is not installed) and raise a clear `RuntimeError("llama-cpp-python is not installed. Run: pip install llama-cpp-python")`.

**Important:** `LocalAI.__init__` should check if the model file exists and raise `FileNotFoundError` with the path if not.

---

## `features/chatbot/rag_service.py`

```python
class RAGService:
    """
    Retrieves relevant context from indexed course files.
    Uses the Indexer from features.notes.indexer.
    """

    def __init__(self, db: Session):
        self.db = db
        from features.notes.indexer import Indexer
        self.indexer = Indexer()

    def get_context(self, query: str, course_id: int, top_k: int = None) -> str:
        """
        Search for relevant chunks. Format as context string.
        Format:
            [Source 1: Lecture Notes Week 2.pdf]
            ...chunk content...

            ---

            [Source 2: Chapter 3 Textbook.pdf]
            ...chunk content...

        Return empty string if no results or course_id is None.
        """

    def get_sources(self, query: str, course_id: int, top_k: int = None) -> list[str]:
        """
        Return unique list of source file names for the top results.
        Return [] if course_id is None or no results.
        """
```

---

## `features/chatbot/service.py`

```python
class ChatService:
    def __init__(self, db: Session):
        self.db = db
        self.rag = RAGService(db)

    def get_conversations(self, user_id: int) -> list[ChatConversation]:
        """Return all conversations for user, newest first."""

    def get_conversation(self, conv_id: int) -> ChatConversation:
        """Raise ValueError if not found."""

    def create_conversation(self, user_id: int, title: str = None, course_id: int = None) -> ChatConversation:
        """Create conversation. title defaults to "New Conversation"."""

    def delete_conversation(self, conv_id: int) -> None:

    def get_messages(self, conv_id: int) -> list[ChatMessage]:
        """Return messages ordered by created_at asc."""

    def save_message(self, conv_id: int, role: str, content: str, sources: list[str] = None, model_used: str = None) -> ChatMessage:
        """
        Save message to DB.
        sources stored as JSON string: json.dumps(sources or [])
        Also update conversation.updated_at = utcnow.
        """

    def build_message_history(self, conv_id: int) -> list[dict]:
        """
        Return last 20 messages as list of {"role": ..., "content": ...} dicts.
        Used as the messages param for AI providers.
        """

    async def stream_response(self, conv_id: int, user_content: str, provider: str = "groq", model: str = None) -> AsyncGenerator[str, None]:
        """
        Full pipeline:
        1. Save user message to DB
        2. Get conversation to find context_course_id
        3. Get RAG context (if course_id set)
        4. Get RAG sources
        5. Build message history
        6. Get AI provider via get_ai(provider, model=model)
        7. Stream tokens — yield each token
        8. After stream ends: save assistant message with full content + sources + model name
        """

    def auto_title(self, conv_id: int, provider: str = "groq") -> str:
        """
        Generate a short title from the first user message.
        Use the prompt from docs/PROMPTS.md (auto-title section).
        Use ai.complete() (not stream).
        Update conversation.title in DB.
        Return the new title.
        """
```

---

## `features/chatbot/cli.py`

This is the most important CLI in the project. Get the streaming experience right.

**Main menu:**
```
─────────────────────────────────────────────────
  TaskArena — AI Tutor
─────────────────────────────────────────────────
  Provider: ⚡ Groq · llama-3.3-70b-versatile
  3 saved conversations

  [1] New conversation
  [2] Open conversation
  [3] Delete conversation
  [4] Switch AI provider
  [q] Quit
```

**Conversation list (option 2):**
```
  Conversations:
  [1] Newtonian Mechanics          (12 msgs · Physics 201)
  [2] Organic Chemistry Help       (4 msgs · Organic Chem)
  [3] New Conversation             (0 msgs · no context)
  Enter number:
```

**New conversation flow:**
1. Ask: "Title (Enter for auto-title later): "
2. Ask: "Link to a course for RAG context? [y/N]: "
3. If yes: show courses list, pick one
4. Open chat immediately

**Chat interface:**
```
─────────────────────────────────────────────────────────────────
  Newtonian Mechanics  |  Physics 201  |  ⚡ Groq
  Type /help for commands
─────────────────────────────────────────────────────────────────

  You: explain Newton's third law

  AI Tutor: Newton's third law states that for every action,
  there is an equal and opposite reaction. This means...
  [tokens stream here in real time, no newline until done]

  📄 Sources: Lecture Notes Week 2.pdf, Chapter 3 Textbook.pdf

─────────────────────────────────────────────────────────────────
  You: _
```

**Streaming output — critical implementation:**
- Use `asyncio.run()` to call the async stream_response
- Print each token immediately using `print(token, end="", flush=True)`
- After stream completes, print a newline
- If sources exist, print them on a new line with 📄 prefix
- Show a `▌` cursor blinking indicator before first token arrives:
  ```python
  print("  AI Tutor: ", end="", flush=True)
  # then stream tokens
  ```

**In-chat slash commands:**
```
/help        — show available commands
/clear       — clear screen, redisplay conversation header
/history     — print last 10 messages
/sources     — show sources from last response
/provider    — switch provider (local/groq/ollama)
/title       — auto-generate title for this conversation
/quit        — back to main menu
```

**Provider switch (`/provider`):**
```
  Switch AI provider:
  [1] ⚡ Groq — llama-3.3-70b-versatile (fast, cloud)
  [2] ⚡ Groq — llama-3.1-8b-instant    (fastest, cloud)
  [3] 💻 Local — Qwen2.5-7B             (private, offline)
  [4] 🦙 Ollama — qwen2.5:7b            (local server)
  Current: [1]
  Enter number (Enter to keep current):
```

**Error handling:**
- If Groq API key is not set: print a clear message telling user to add `GROQ_API_KEY` to `.env`
- If local model file not found: print path and tell user to run `python scripts/download_model.py`
- If Ollama not running: print `ollama serve` command
- Network errors during Groq streaming: catch and print error, allow user to retry
- All exceptions during streaming are caught — the CLI never crashes mid-conversation

---

## `features/chatbot/README.md`

Cover: purpose, setup requirements (GROQ_API_KEY or local model), how to run, how to test both providers, expected streaming behaviour, gate conditions.

---

## Verification

```bash
# 1. Test with Groq (requires GROQ_API_KEY in .env)
python features/chatbot/cli.py
# → New conversation → no course context → ask "what is Newton's third law?"
# → Tokens should stream in real time, not appear all at once

# 2. Test RAG context
# → New conversation → link to Physics 201 → ask about content from an indexed file
# → Sources should appear below the response

# 3. Test conversation persistence
# → Have a conversation → quit → reopen that conversation → history should be there

# 4. Verify DB state:
sqlite3 data/taskarena.db "SELECT id, role, substr(content,1,60) FROM chat_messages ORDER BY id DESC LIMIT 6;"
# Should show your actual messages

sqlite3 data/taskarena.db "SELECT id, title, updated_at FROM chat_conversations;"
# updated_at should have changed after each message
```

---

## Rules

1. `ai_service.py` has no DB imports — it only talks to AI providers
2. `rag_service.py` uses `features.notes.indexer.Indexer` — it does NOT duplicate any embedding code
3. `service.py` is async where it needs to be (`stream_response`, `auto_title`) — sync everywhere else
4. `cli.py` uses `asyncio.run()` to call async service methods
5. Tokens MUST stream in real time — `flush=True` on every `print(token, end="")`
6. Do not modify any file outside `features/chatbot/`
7. Do not add new columns to the DB — use only what was defined in Phase 0

---

## Done when

- [ ] `python features/chatbot/cli.py` runs without errors
- [ ] Groq streaming works — tokens appear one by one, not all at once
- [ ] Conversation history persists in DB between sessions
- [ ] RAG context: asking about an indexed file's content uses that content in the response
- [ ] Sources printed below AI response when RAG is active
- [ ] `/provider` switch works mid-conversation
- [ ] Missing API key / model file handled with clear error messages, no crash
- [ ] Ctrl+C in chat returns to main menu, second Ctrl+C quits
