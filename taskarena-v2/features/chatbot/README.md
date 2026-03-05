# Chatbot CLI (Phase 1C)

TaskArena's Chatbot CLI provides:
- persistent conversations stored in `chat_conversations` and `chat_messages`
- streaming AI responses in the terminal (token-by-token)
- provider switching across Groq, local `llama-cpp`, and Ollama
- optional RAG context from indexed course files via `file_chunks`

## Requirements

At least one provider must be ready:
- Groq: set `GROQ_API_KEY` in `.env`
- Local: install `llama-cpp-python` and place model at `LOCAL_MODEL_PATH`
- Ollama: run `ollama serve` and ensure your model is available

## Run

From project root (`taskarena-v2`) with venv active:

```bash
python features/chatbot/cli.py
```

## Manual Tests

1. Start with Groq and ask a question. Confirm tokens stream in real time.
2. Create a conversation linked to a course that has indexed files. Ask about those notes.
3. Confirm `📄 Sources` appears when RAG context is used.
4. Use `/provider` to switch to another backend mid-conversation.
5. Use `/title` to auto-generate a short conversation title.
6. Quit and reopen a conversation. Confirm message history persists.

## Verification Queries

```bash
sqlite3 data/taskarena.db "SELECT id, role, substr(content,1,60) FROM chat_messages ORDER BY id DESC LIMIT 6;"
sqlite3 data/taskarena.db "SELECT id, title, updated_at FROM chat_conversations;"
```

## Expected Streaming Behavior

Responses should print progressively as tokens arrive:
- output appears after `AI Tutor:` immediately
- each token is flushed to terminal (`flush=True`)
- full text should not wait until completion before appearing

## Gate Condition

Phase 1C is complete when:
- CLI starts and runs without crashing
- token streaming works for at least one provider
- conversations/messages persist across sessions
- RAG sources appear for context-linked conversations
- missing key/model/server errors are handled with clear guidance
