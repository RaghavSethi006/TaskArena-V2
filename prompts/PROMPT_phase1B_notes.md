# TaskArena v2 — Phase 1B: Notes CLI
# Depends on: Phase 0 complete, Phase 1A complete
# Goal: Course/folder/file organization + SciBERT indexing pipeline working
# KEY BEHAVIOUR: Files are COPIED into managed storage on add.
#                The app NEVER reads from the original path again.
#                If the original is moved/deleted/renamed — app keeps working.

---

## PROMPT

---

You are continuing to build TaskArena v2. Phase 0 and Phase 1A are complete.

Before writing any code read these docs:
1. `docs/ARCHITECTURE.md` — specifically the file indexing data flow section
2. `docs/DATABASE.md` — the courses, folders, files, and file_chunks table schemas
3. `docs/AI_GUIDE.md` — the RAG pipeline section
4. `docs/CONVENTIONS.md` — service pattern rules

Your job is **Phase 1B only** — the Notes CLI feature. Build exactly these files:

```
features/notes/schemas.py
features/notes/service.py
features/notes/indexer.py
features/notes/cli.py
features/notes/README.md
```

---

## File Storage — Critical Design Decision

**When a user adds a file, the app copies it into its own managed storage folder immediately. The `files.path` column stores the internal copy path — not the original. After the copy, the app never touches the original location again.**

This means:
- User moves, renames, or deletes the original → app keeps working
- External drive unplugged → app keeps working
- App uninstalled and reinstalled → files survive as long as `data/` survives

### Internal storage layout

```
data/
└── files/                              ← managed root, never touch manually
    ├── {course_id}/
    │   └── {folder_id}/
    │       ├── {file_id}_{safe_name}   ← internal copy
    │       └── {file_id}_{safe_name}
    └── ...
```

Example:
```
data/files/1/2/7_lecture_notes_week3.pdf
data/files/1/2/8_lab_manual.pdf
data/files/1/3/9_problem_set_1.docx
```

### DB model change — add `original_path` column to `File`

**Do this first before writing any service code.**

In `features/notes/models.py`, add this column to the `File` model:

```python
original_path = Column(String, nullable=True)
# Stores where the user originally uploaded from.
# Used for display only — NEVER read from this path for indexing or serving.
```

Then immediately run:
```bash
alembic revision --autogenerate -m "add original_path to files"
alembic upgrade head
sqlite3 data/taskarena.db "PRAGMA table_info(files);"
# Confirm original_path column appears in output
```

### `FileOut` schema must include `original_path`

```python
class FileOut(BaseModel):
    id: int
    name: str
    path: str           # internal storage path — where the copy lives
    original_path: Optional[str]  # where it was originally uploaded from
    size: Optional[int]
    indexed: bool
    indexed_at: Optional[datetime]
    chunk_count: int    # computed: COUNT of file_chunks rows
    model_config = ConfigDict(from_attributes=True)
```

---

## `features/notes/schemas.py`

```python
# CourseCreate, CourseUpdate, CourseOut
# FolderCreate, FolderOut
# FileOut  (includes indexed: bool, indexed_at: Optional[datetime], chunk_count: int)
# SearchResult (chunk_content: str, file_name: str, file_id: int, score: float)
```

All Out schemas use `model_config = ConfigDict(from_attributes=True)`.

---

## `features/notes/indexer.py`

The embedding and search pipeline. This is the most technically complex file in Phase 1B.

```python
class Indexer:
    """
    Handles text extraction, chunking, embedding, and semantic search.
    Uses SciBERT (allenai/scibert_scivocab_uncased) for embeddings.
    Model is loaded once as a class-level singleton.
    """

    _model = None  # SentenceTransformer singleton

    @classmethod
    def get_model(cls) -> SentenceTransformer:
        """Load model once, reuse on subsequent calls. Cache dir from settings."""

    def extract_text(self, file_path: str) -> str:
        """
        Extract plain text from a file.
        - .pdf  → use pdfplumber, join all page text
        - .docx → use python-docx, join all paragraph text
        - .txt / .md → read directly with UTF-8
        - other → raise ValueError(f"Unsupported file type: {suffix}")
        Strip excessive whitespace. Return empty string if extraction fails
        (log warning, don't crash).
        """

    def chunk_text(self, text: str, chunk_size: int = None, overlap: int = None) -> list[str]:
        """
        Split text into overlapping chunks by word count.
        chunk_size and overlap default to settings.chunk_size and settings.chunk_overlap.
        Filter out chunks shorter than 20 words.
        Return list of chunk strings.
        """

    def embed(self, texts: list[str]) -> np.ndarray:
        """
        Embed a list of texts using SciBERT.
        Returns numpy array of shape (n, embedding_dim), normalized (L2).
        """

    def embed_single(self, text: str) -> np.ndarray:
        """Embed a single text string. Returns 1D numpy array."""

    def index_file(self, file_id: int, db: Session) -> int:
        """
        Full indexing pipeline for one file.
        ALWAYS reads from file.path (the internal copy) — never from file.original_path.

        1. Load File record from DB
        2. Check file.path exists on disk — if not, raise FileNotFoundError with clear message
        3. extract_text(file.path)
        4. If text is empty, mark file.indexed=True with 0 chunks, return 0
        5. chunk_text(text)
        6. embed(chunks)
        7. Delete existing FileChunk records for this file_id
        8. Create new FileChunk for each chunk:
           - content = chunk text
           - chunk_index = position
           - embedding = embedding.astype(np.float32).tobytes()
        9. Set file.indexed = True, file.indexed_at = utcnow
        10. Commit
        Returns number of chunks created.
        """

    def search(self, query: str, course_id: int, db: Session, top_k: int = None) -> list[dict]:
        """
        Semantic search over all indexed chunks for a course.
        1. embed_single(query)
        2. Load all FileChunks for the course (join File→Folder→Course)
        3. For each chunk: load embedding from bytes, compute cosine similarity
        4. Sort by score descending, return top_k results
        Returns list of dicts: {chunk, file_name, score}
        top_k defaults to settings.rag_top_k
        Return [] if no chunks found (don't crash).
        """

    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Both vectors must already be L2-normalized. Return float(np.dot(a, b))."""
```

---

## `features/notes/service.py`

```python
class NotesService:
    def __init__(self, db: Session):
        self.db = db
        self.indexer = Indexer()

    # ── Courses ──
    def get_courses(self, user_id: int) -> list[Course]:
    def get_course(self, course_id: int) -> Course:  # raise ValueError if not found
    def create_course(self, user_id: int, data: CourseCreate) -> Course:
    def update_course(self, course_id: int, data: CourseUpdate) -> Course:
    def delete_course(self, course_id: int) -> None:

    # ── Folders ──
    def get_folders(self, course_id: int) -> list[Folder]:
    def create_folder(self, course_id: int, name: str) -> Folder:
    def delete_folder(self, folder_id: int) -> None:

    # ── Files ──
    def get_files(self, folder_id: int) -> list[File]:

    def add_file(self, folder_id: int, name: str, original_path: str) -> File:
        """
        Add a file to the library and copy it into managed storage.

        Steps:
        1. Validate original_path exists on disk (raise ValueError if not)
        2. Get file size in bytes from the original
        3. Create a File record with indexed=False to get an auto-assigned file_id
        4. Commit to get the id
        5. Build internal storage path: data/files/{course_id}/{folder_id}/{file_id}_{safe_name}
           - safe_name: lowercase, spaces→underscores, keep only [a-z0-9._-]
        6. Create the storage directory: Path(storage_path).parent.mkdir(parents=True, exist_ok=True)
        7. shutil.copy2(original_path, storage_path)  ← preserves file metadata
        8. Update file.path = str(storage_path)  ← internal path, used for everything
        9. Update file.original_path = original_path  ← original, stored for display only
        10. Commit
        11. Return the File record

        If the copy fails (PermissionError, OSError):
            - Delete the DB record
            - Re-raise as RuntimeError with a clear message
        """

    def remove_file(self, file_id: int) -> None:
        """
        Remove a file completely:
        1. Load File record (raise ValueError if not found)
        2. Delete the internal copy from disk: Path(file.path).unlink(missing_ok=True)
        3. Delete the DB record (FileChunks cascade automatically)
        4. Commit

        missing_ok=True means no crash if the file was already gone from disk.
        """

    def index_file(self, file_id: int) -> int:
        """
        Trigger indexing of a file's internal copy.
        Delegates to self.indexer.index_file(file_id, self.db).
        The indexer reads from file.path (the internal copy) — never from original_path.
        Returns chunk count.
        """

    def get_chunk_count(self, file_id: int) -> int:
        """Count FileChunk rows for this file."""

    def _safe_filename(self, name: str) -> str:
        """
        Sanitize a filename for safe storage:
        - Lowercase
        - Replace spaces with underscores
        - Keep only: a-z 0-9 . _ -
        - Strip leading/trailing dots and underscores
        - If result is empty after sanitizing, return "file"
        """

    def _get_storage_path(self, file_id: int, folder_id: int, course_id: int, original_name: str) -> Path:
        """
        Build: ROOT / data / files / {course_id} / {folder_id} / {file_id}_{safe_name}
        ROOT = settings.root (the project root Path)
        safe_name = self._safe_filename(original_name)
        """

    # ── Search ──
    def search(self, query: str, course_id: int, top_k: int = None) -> list[dict]:
        """Delegate to self.indexer.search(). Returns list of result dicts."""
```

---

## `features/notes/cli.py`

Two-level navigation: courses → folders → files.

**Main menu:**
```
─────────────────────────────────────
  TaskArena — Study Library
─────────────────────────────────────
  3 courses  |  10 folders  |  31 files

  [1] Browse courses
  [2] Add course
  [3] Search across a course (semantic)
  [q] Quit
```

**Browse courses → shows course list → pick one:**
```
─────────────────────────────────────
  Physics 201  (PHYS201)
─────────────────────────────────────
  Folders:
  [1] Chapter 1 — Foundations        (4 files, 2 indexed)
  [2] Chapter 2 — Core Theory        (3 files, 3 indexed)
  [3] Assignments                    (2 files, 0 indexed)

  [a] Add folder
  [b] Back
```

**Browse folder → shows files:**
```
  Files in "Chapter 1 — Foundations":
  ────────────────────────────────────────────────────────────────
  ID   Name                            Size      Status
  1    Lecture Notes Week 1.pdf        245 KB    ✓ indexed (24 chunks)
  2    Lab Manual.pdf                  890 KB    ✓ indexed (67 chunks)
  3    Problem Set 1.docx              12 KB     ○ not indexed

  [a] Add file    [i] Index a file    [d] Delete file    [b] Back
```

**Add file flow:**
1. Enter the original file path (wherever it currently lives on your machine)
2. Enter display name (Enter to use filename)
3. Show: `Copying to TaskArena library...`
4. Copy completes → show: `✓ Saved to library (original: /path/to/original)`
5. Immediately ask: `Index this file now? [Y/n]`
6. If yes: run indexing with progress indicator
7. On complete: `✓ Indexed 24 chunks from Lecture Notes Week 1.pdf`

The file list must show `original_path` as a dim secondary line under the filename:
```
  ID   Name                            Size      Status
  1    Lecture Notes Week 1.pdf        245 KB    ✓ indexed (24 chunks)
       Originally from: /Users/raghav/Downloads/lecture_notes.pdf
  2    Lab Manual.pdf                  890 KB    ✓ indexed (67 chunks)
       Originally from: /Volumes/USB/Physics/lab_manual.pdf
  3    Problem Set 1.docx              12 KB     ○ not indexed
       Originally from: /Users/raghav/Desktop/ps1.docx
```
(show original path in dim/grey if terminal supports, otherwise plain)

**Search flow:**
1. Pick course
2. Enter query string
3. Show top 5 results:
```
  Search results for "Newton's third law" in Physics 201:
  ─────────────────────────────────────────────────────────
  1. [0.87] Lecture Notes Week 2.pdf (chunk 4)
     "...every action has an equal and opposite reaction.
      This is demonstrated by..."

  2. [0.81] Chapter 3 Textbook.pdf (chunk 12)
     "...the third law states that forces always occur in pairs..."
```
Truncate chunk preview to 120 characters.

---

## `features/notes/README.md`

Cover: purpose, how to run, how to test indexing, gate condition, note about model download time on first run.

---

## Verification

```bash
# 1. Run the CLI
python features/notes/cli.py

# 2. Manually test:
#    - Browse the 3 courses from seed data
#    - Add a folder to Physics 201
#    - Add a real PDF from anywhere on your machine
#    - Confirm it was copied: check data/files/ folder exists with a copy
#    - Index it — watch the progress
#    - Search for something from that file
#    - THEN DELETE OR MOVE THE ORIGINAL FILE
#    - Reopen the CLI — the file should still show, still be searchable

# 3. Verify the copy exists on disk:
ls -lh data/files/
# Should show course_id folders with your file inside

# 4. Verify DB state:
sqlite3 data/taskarena.db "SELECT id, name, path, original_path, indexed FROM files;"
# path = internal copy path (data/files/...)
# original_path = where you originally added it from

sqlite3 data/taskarena.db "SELECT COUNT(*) FROM file_chunks WHERE file_id=1;"
# Should show chunk count > 0

# 5. Robustness test:
#    Delete or rename the file at original_path
#    Re-run the CLI and search — must still work (reads from internal copy)

# 6. Verify search works from internal copy:
# In CLI search, query something from the file
# Top result should have score >0.7 and relevant content
```

---

## Rules

1. `indexer.py` always reads from `file.path` (internal copy) — never from `file.original_path`
2. `service.py` uses `shutil.copy2` — never `shutil.copy` (copy2 preserves timestamps)
3. If the copy fails (disk full, permissions), the DB record is deleted and error is raised cleanly
4. `remove_file` uses `missing_ok=True` on `Path.unlink()` — never crash if disk file is already gone
5. `cli.py` only calls `NotesService` — never calls `Indexer` directly
6. If SciBERT hasn't been downloaded yet, `get_model()` will download it automatically — tell the user "Loading embedding model (first run may take a moment...)"
7. Embeddings stored as `float32` bytes — always cast before storing and after loading
8. Do not modify any file outside `features/notes/` except `features/notes/models.py` (for the `original_path` column) and running the Alembic migration
9. `data/files/` directory is managed by the app — document in README that users should never manually edit it

---

## Done when

- [ ] `alembic upgrade head` runs clean with the new `original_path` column
- [ ] `data/files/` directory is created automatically on first file add
- [ ] Adding a file copies it to `data/files/{course_id}/{folder_id}/{id}_{name}`
- [ ] `files.path` in DB points to the internal copy, not the original
- [ ] `files.original_path` stores where the user added it from
- [ ] Deleting or moving the original file does not break the CLI
- [ ] Indexing reads from internal copy — confirmed by moving original and re-running search
- [ ] `remove_file` deletes both the DB record and the copy from disk
- [ ] `file_chunks` table has rows after indexing
- [ ] Search returns relevant results with scores
- [ ] Non-existent source path rejected with clear error
- [ ] Unsupported file type shows clear error, does not crash
