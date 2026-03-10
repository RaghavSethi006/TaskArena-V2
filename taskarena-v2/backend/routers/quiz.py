import asyncio
import json
from typing import Optional

from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user_id, get_db
from features.quiz.schemas import AttemptCreate, AttemptOut, QuestionOut, QuizOut
from features.quiz.service import QuizService

router = APIRouter(prefix="/quizzes", tags=["quiz"])


class GenerateRequest(BaseModel):
    course_id: int
    folder_id: Optional[int] = None
    n_questions: int = 10
    difficulty: str = "medium"
    provider: str = "groq"


@router.get("", response_model=list[QuizOut])
def get_quizzes(
    course_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return QuizService(db).get_quizzes(course_id=course_id, user_id=user_id)


@router.post("/generate")
async def generate_quiz(body: GenerateRequest, db: Session = Depends(get_db)):
    async def progress_stream():
        quiz_result = {"quiz_id": None}
        queue: asyncio.Queue[str | None] = asyncio.Queue()

        def on_progress(step: str, current: int, total: int):
            data = json.dumps({"step": step, "progress": current, "total": total})
            queue.put_nowait(data)

        async def run_generation():
            try:
                quiz = await QuizService(db).generate_quiz(
                    course_id=body.course_id,
                    n_questions=body.n_questions,
                    difficulty=body.difficulty,
                    folder_id=body.folder_id,
                    provider=body.provider,
                    progress_callback=on_progress,
                )
                quiz_result["quiz_id"] = quiz.id
                await queue.put(None)
            except Exception as e:
                await queue.put(json.dumps({"error": str(e)}))
                await queue.put(None)

        asyncio.create_task(run_generation())

        while True:
            item = await queue.get()
            if item is None:
                break
            yield f"data: {item}\n\n"

        if quiz_result["quiz_id"]:
            data = json.dumps({"done": True, "quiz_id": quiz_result["quiz_id"]})
            yield f"data: {data}\n\n"

    return StreamingResponse(
        progress_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/{quiz_id}")
def get_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    svc = QuizService(db)
    quiz, questions = svc.get_quiz(quiz_id)
    attempts = svc.get_attempts(quiz_id=quiz_id, user_id=user_id)
    best_score = svc.get_best_score(quiz_id=quiz_id, user_id=user_id)
    quiz_payload = {
        "id": quiz.id,
        "title": quiz.title,
        "course_id": quiz.course_id,
        "difficulty": quiz.difficulty,
        "created_at": quiz.created_at,
        "question_count": len(questions),
        "best_score": best_score,
        "attempt_count": len(attempts),
    }
    return {
        "quiz": QuizOut.model_validate(quiz_payload),
        "questions": [QuestionOut.model_validate(question) for question in questions],
    }


@router.delete("/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quiz(quiz_id: int, db: Session = Depends(get_db)) -> Response:
    QuizService(db).delete_quiz(quiz_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{quiz_id}/attempts", response_model=list[AttemptOut])
def get_attempts(
    quiz_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return QuizService(db).get_attempts(quiz_id=quiz_id, user_id=user_id)


@router.post("/{quiz_id}/attempts")
def submit_attempt(
    quiz_id: int,
    body: AttemptCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return QuizService(db).submit_attempt(
        quiz_id=quiz_id,
        user_id=user_id,
        answers=body.answers,
        time_taken=body.time_taken,
    )
