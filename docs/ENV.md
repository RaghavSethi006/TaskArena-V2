# TaskArena v2 — Environment Variables

## Setup

```bash
cp .env.example .env
# Then fill in your values in .env
```

`.env` is in `.gitignore` — never commit it.  
`.env.example` has all keys with blank/safe defaults — always keep it updated.

---

## Variables Reference

### Required

| Variable | Description | Example |
|---|---|---|
| `GROQ_API_KEY` | Your Groq API key | `gsk_abc123...` |

### AI Configuration

| Variable | Default | Description |
|---|---|---|
| `AI_PROVIDER` | `groq` | Default provider: `local`, `groq`, `ollama` |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq model to use |
| `LOCAL_MODEL_PATH` | `models/qwen2.5-7b-instruct-q4_k_m.gguf` | Path to local GGUF model |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `qwen2.5:7b` | Ollama model name |
| `LOCAL_N_CTX` | `4096` | Context window size for local model |
| `LOCAL_N_GPU_LAYERS` | `-1` | GPU layers (-1 = all, 0 = CPU only) |
| `LOCAL_N_THREADS` | `8` | CPU threads for local model |

### Database

| Variable | Default | Description |
|---|---|---|
| `DB_PATH` | `data/taskarena.db` | SQLite database file path |

### Backend

| Variable | Default | Description |
|---|---|---|
| `API_PORT` | `8765` | FastAPI server port |
| `API_HOST` | `127.0.0.1` | FastAPI server host |
| `DEBUG` | `false` | Enable debug mode |

### Embeddings

| Variable | Default | Description |
|---|---|---|
| `EMBEDDING_MODEL` | `allenai/scibert_scivocab_uncased` | HuggingFace model for RAG embeddings |
| `EMBEDDING_CACHE_DIR` | `models/scibert` | Where to cache the embedding model |
| `RAG_TOP_K` | `5` | Number of chunks to retrieve per query |
| `CHUNK_SIZE` | `512` | Token size of each text chunk |
| `CHUNK_OVERLAP` | `64` | Overlap between adjacent chunks |
