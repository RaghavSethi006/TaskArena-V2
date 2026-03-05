# TaskArena v2 — Patch: Granular RAG Context
# Target files: features/notes/models.py, features/notes/indexer.py,
#               features/chatbot/models.py, features/chatbot/service.py,
#               features/chatbot/cli.py
# Depends on: Phase 1B and 1C already working correctly
# Goal: Allow RAG context to be scoped to a whole course, a single folder,
#       or a single file — instead of always the full course.

---

## PROMPT

---

TaskArena v2 Phases 1B (Notes) and 1C (Chatbot) are complete and working. Do not rewrite them. This is a targeted patch — make only the changes described below, nothing else.

The problem: the RAG pipeline currently scopes context to an entire course. As more files get added, this becomes noisy. We need the user to be able to pin a conversation's context to a specific folder or a specific file.

---

## Change 1 — `features/chatbot/models.py`

Add two nullable foreign key columns to `ChatConversation`:

```python
context_folder_id = Column(Integer, ForeignKey("folders.id", ondelete="SET NULL"), nullable=True)
context_file_id   = Column(Integer, ForeignKey("files.id",   ondelete="SET NULL"), nullable=True)
```

Place them directly after the existing `context_course_id` column.

`ondelete="SET NULL"` means if a folder or file is deleted, the conversation stays but loses its granular context — it falls back to course-level or no context. This is the correct behaviour.

After editing the model, run:

```bash
alembic revision --autogenerate -m "add context_folder_id and context_file_id to chat_conversations"
alembic upgrade head
sqlite3 data/taskarena.db "PRAGMA table_info(chat_conversations);"
# Confirm both new columns appear
```

---

## Change 2 — `features/notes/indexer.py`

Update the `search()` method signature and filter logic. Everything else in the file stays identical.

**New signature:**
```python
def search(
    self,
    query: str,
    db: Session,
    course_id: int = None,
    folder_id: int = None,
    file_id: int = None,
    top_k: int = None,
) -> list[dict]:
```

**New filter logic** (replaces the existing course filter):
```python
q = db.query(FileChunk).join(File).join(Folder).join(Course)

# Apply the most specific filter available — file > folder > course
if file_id is not None:
    q = q.filter(File.id == file_id)
elif folder_id is not None:
    q = q.filter(Folder.id == folder_id)
elif course_id is not None:
    q = q.filter(Course.id == course_id)
else:
    # No context set — return empty, don't search everything
    return []
```

The rest of the method (embed query, cosine similarity, sort, return top_k) is unchanged.

---

## Change 3 — `features/chatbot/rag_service.py`

Update `get_context()` and `get_sources()` to accept and pass through all three context levels.

**New signatures:**
```python
def get_context(
    self,
    query: str,
    course_id: int = None,
    folder_id: int = None,
    file_id: int = None,
    top_k: int = None,
) -> str:

def get_sources(
    self,
    query: str,
    course_id: int = None,
    folder_id: int = None,
    file_id: int = None,
    top_k: int = None,
) -> list[str]:
```

Both methods now pass all three IDs to `self.indexer.search()`:
```python
results = self.indexer.search(
    query=query,
    db=self.db,
    course_id=course_id,
    folder_id=folder_id,
    file_id=file_id,
    top_k=top_k,
)
```

Everything else in these methods is unchanged.

---

## Change 4 — `features/chatbot/service.py`

### 4a — Update `ConversationCreate` schema

In `features/chatbot/schemas.py`, add two optional fields:

```python
class ConversationCreate(BaseModel):
    title: Optional[str] = None
    context_course_id: Optional[int] = None
    context_folder_id: Optional[int] = None   # ← add
    context_file_id: Optional[int] = None     # ← add
```

Also update `ConversationOut` to include them:
```python
class ConversationOut(BaseModel):
    id: int
    title: Optional[str]
    context_course_id: Optional[int]
    context_folder_id: Optional[int]    # ← add
    context_file_id: Optional[int]      # ← add
    created_at: datetime
    updated_at: datetime
    message_count: int
    model_config = ConfigDict(from_attributes=True)
```

### 4b — Update `create_conversation()`

```python
def create_conversation(
    self,
    user_id: int,
    title: str = None,
    course_id: int = None,
    folder_id: int = None,   # ← add
    file_id: int = None,     # ← add
) -> ChatConversation:
    conv = ChatConversation(
        user_id=user_id,
        title=title or "New Conversation",
        context_course_id=course_id,
        context_folder_id=folder_id,   # ← add
        context_file_id=file_id,       # ← add
    )
    self.db.add(conv)
    self.db.commit()
    self.db.refresh(conv)
    return conv
```

### 4c — Update `stream_response()`

Replace the RAG context call. Currently it calls:
```python
context = self.rag.get_context(query, conv.context_course_id)
sources = self.rag.get_sources(query, conv.context_course_id)
```

Replace with:
```python
context = self.rag.get_context(
    query=user_content,
    course_id=conv.context_course_id,
    folder_id=conv.context_folder_id,
    file_id=conv.context_file_id,
)
sources = self.rag.get_sources(
    query=user_content,
    course_id=conv.context_course_id,
    folder_id=conv.context_folder_id,
    file_id=conv.context_file_id,
)
```

Nothing else in `stream_response()` changes.

---

## Change 5 — `features/chatbot/cli.py`

### 5a — Update "New conversation" flow

Replace the current context-selection prompt. Currently it asks yes/no for a course. Replace with this flow:

```
Link context for RAG? (AI will only search these files)
  [1] Whole course
  [2] Specific folder
  [3] Specific file
  [4] No context (general AI, no file search)
Choice [1-4]:
```

**If [1] — Whole course:**
- Show course list, user picks one
- Set `course_id=<picked>`, `folder_id=None`, `file_id=None`

**If [2] — Specific folder:**
- Show course list, user picks course
- Show folders for that course, user picks folder
- Set `course_id=<course>`, `folder_id=<picked>`, `file_id=None`

**If [3] — Specific file:**
- Show course list → folder list → file list
- User picks file
- Set `course_id=<course>`, `folder_id=<folder>`, `file_id=<picked>`

**If [4] — No context:**
- Set all three to `None`

Pass all three to `svc.create_conversation()`.

### 5b — Update conversation header display

The chat header currently shows the course name. Update it to show whichever context is active:

```
# Course-level context:
  Newtonian Mechanics  |  📚 Physics 201 (full course)  |  ⚡ Groq

# Folder-level context:
  Newtonian Mechanics  |  📁 Chapter 3 — Thermodynamics  |  ⚡ Groq

# File-level context:
  Newtonian Mechanics  |  📄 Lecture Notes Week 3.pdf  |  ⚡ Groq

# No context:
  Newtonian Mechanics  |  💬 No RAG context  |  ⚡ Groq
```

To display this, load the folder/file name from DB if needed (a simple `db.query(Folder).get(id)` or `db.query(File).get(id)` directly in the CLI is fine here — no need for a service method).

### 5c — Add `/context` slash command

Add a new slash command to the in-chat command list:

```
/context     — change the RAG context for this conversation
```

When called:
- Show the same 4-option menu as the new conversation flow
- Update the conversation's `context_course_id`, `context_folder_id`, `context_file_id` in DB
- Print: `✓ Context updated — now searching: [description]`
- The next message will use the new context automatically

Implement by calling a new service method:

```python
# Add to ChatService:
def update_context(
    self,
    conv_id: int,
    course_id: int = None,
    folder_id: int = None,
    file_id: int = None,
) -> None:
    """Update conversation context IDs. Pass None to clear."""
    conv = self.get_conversation(conv_id)
    conv.context_course_id = course_id
    conv.context_folder_id = folder_id
    conv.context_file_id = file_id
    conv.updated_at = datetime.utcnow()
    self.db.commit()
```

---

## Verification

```bash
# 1. Migration ran cleanly
sqlite3 data/taskarena.db "PRAGMA table_info(chat_conversations);"
# Must show: context_course_id, context_folder_id, context_file_id

# 2. Test file-level context
python features/chatbot/cli.py
# → New conversation → [3] Specific file → pick an indexed file
# → Ask something from that file specifically
# → Source shown should be ONLY that file, not other files from the course

# 3. Test folder-level context
# → New conversation → [2] Specific folder → pick a folder with 2+ indexed files
# → Ask something — sources should only come from files in that folder

# 4. Test course-level (existing behaviour, must still work)
# → New conversation → [1] Whole course → ask something
# → Sources can come from any file in the course

# 5. Test /context switch mid-conversation
# → Start with course context → ask a question → use /context to switch to one file
# → Ask the same question — sources should now be restricted to that file

# 6. Test fallback when file is deleted
sqlite3 data/taskarena.db "UPDATE chat_conversations SET context_file_id=99999 WHERE id=1;"
# (simulate a deleted file — foreign key SET NULL handles this automatically on real delete)
# Open that conversation — should not crash, should fall back gracefully

# 7. Verify existing conversations still work
# Open a conversation created before this patch — must still function normally
```

---

## Rules

1. Only modify the files listed in the header — nothing else
2. Do not rewrite any method that isn't explicitly listed above — only change what's specified
3. The `search()` fallback when all three IDs are `None` must return `[]` — never search everything
4. `ondelete="SET NULL"` is required on both new foreign keys — do not use CASCADE
5. Run the Alembic migration before writing any service or CLI code
6. All existing tests from Phase 1B and 1C gate checks must still pass after this patch

---

## Done when

- [ ] Migration applied, both columns exist in `chat_conversations`
- [ ] File-level context: sources are restricted to the single chosen file
- [ ] Folder-level context: sources are restricted to files in that folder only
- [ ] Course-level context: existing behaviour unchanged
- [ ] No context: RAG is skipped entirely, AI responds from general knowledge
- [ ] `/context` command switches context mid-conversation
- [ ] Header shows correct context description (📚 / 📁 / 📄 / 💬)
- [ ] Deleting a file/folder does not crash existing conversations (SET NULL kicks in)
- [ ] All Phase 1C gate checks still pass
