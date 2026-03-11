from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user_id, get_db
from features.study_materials.schemas import StudyMaterialOut
from features.study_materials.service import StudyMaterialService

router = APIRouter(prefix="/study-materials", tags=["study-materials"])


@router.get("", response_model=list[StudyMaterialOut])
def get_materials(
    course_id: int = Query(...),
    type: str | None = Query(None),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    _ = user_id
    return StudyMaterialService(db).get_materials(course_id=course_id, material_type=type)


@router.get("/{material_id}", response_model=StudyMaterialOut)
def get_material(
    material_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    _ = user_id
    return StudyMaterialService(db).get_material(material_id)


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> Response:
    _ = user_id
    StudyMaterialService(db).delete_material(material_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/generate")
async def generate_material(
    body: dict,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """
    SSE stream, same pattern as POST /quizzes/generate.
    Expects body: { course_id, type, n_items, difficulty, provider,
                    folder_id?, file_id? }
    """
    _ = user_id
    course_id = int(body.get("course_id", 0))
    material_type = str(body.get("type", "study_notes"))
    n_items = int(body.get("n_items", 10))
    difficulty = str(body.get("difficulty", "medium"))
    provider = str(body.get("provider", "groq"))
    folder_id = body.get("folder_id")
    file_id = body.get("file_id")

    queue: asyncio.Queue[str] = asyncio.Queue()

    async def progress_callback(step: str, progress: int, total: int) -> None:
        await queue.put(
            json.dumps({"step": step, "progress": progress, "total": total})
        )

    async def run_generation() -> None:
        try:
            await StudyMaterialService(db).generate_material(
                course_id=course_id,
                material_type=material_type,
                n_items=n_items,
                difficulty=difficulty,
                folder_id=folder_id,
                file_id=file_id,
                provider=provider,
                progress_callback=progress_callback,
            )
            await queue.put(json.dumps({"done": True, "progress": 4, "total": 4}))
        except Exception as exc:
            await queue.put(json.dumps({"error": str(exc)}))
        finally:
            await queue.put("__DONE__")

    async def event_stream():
        task = asyncio.create_task(run_generation())
        while True:
            msg = await queue.get()
            if msg == "__DONE__":
                break
            yield f"data: {msg}\n\n"
        await task

    return StreamingResponse(event_stream(), media_type="text/event-stream")
