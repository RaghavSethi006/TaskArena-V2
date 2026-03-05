# Notes CLI (Phase 1B)

The Notes feature provides:
- course and folder organization
- file management with **managed copy storage**
- SciBERT-based indexing into `file_chunks`
- semantic search across indexed course material

## Run

From project root (`taskarena-v2`) with venv active:

```bash
python features/notes/cli.py
```

## Managed Storage Behavior

When a file is added, TaskArena copies it into app-managed storage:

```text
data/files/{course_id}/{folder_id}/{file_id}_{safe_name}
```

- `files.path` stores this internal copy path.
- `files.original_path` stores where the user added it from (display only).
- Indexing/search always read from `files.path`, never `original_path`.
- Users should not manually edit `data/files/`.

## Manual Test

1. Browse seeded courses and folders.
2. Add a file from any location on your machine.
3. Confirm CLI reports copy to library.
4. Index the file.
5. Search course content and check relevant scored results.
6. Move/delete the original file and rerun search to confirm internal-copy robustness.

## Verification Queries

```bash
sqlite3 data/taskarena.db "SELECT id, name, path, original_path, indexed FROM files;"
sqlite3 data/taskarena.db "SELECT COUNT(*) FROM file_chunks WHERE file_id=<id>;"
```

## First-Run Model Note

SciBERT (`allenai/scibert_scivocab_uncased`) may download/load on first indexing/search call.  
CLI shows: `Loading embedding model (first run may take a moment...)`.

## Gate Condition

Phase 1B is complete when:
- adding files creates managed copies under `data/files/`
- `original_path` is stored for display only
- indexing/search works from internal copies even if originals are moved/deleted
- invalid paths and unsupported file types are handled cleanly without crashing
