from typing import Optional

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user_id, get_db
from features.tasks.schemas import TaskCreate, TaskOut, TaskUpdate, XPLogOut
from features.tasks.service import TaskService

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskOut])
def get_tasks(
    type: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return TaskService(db).get_tasks(user_id=user_id, type=type, status=status_filter)


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    body: TaskCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return TaskService(db).create_task(user_id=user_id, data=body)


@router.get("/xp-log", response_model=list[XPLogOut])
def get_xp_log(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return TaskService(db).get_xp_log(user_id=user_id)


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db)):
    return TaskService(db).get_task(task_id)


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, body: TaskUpdate, db: Session = Depends(get_db)):
    return TaskService(db).update_task(task_id=task_id, data=body)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db)) -> Response:
    TaskService(db).delete_task(task_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{task_id}/complete")
def complete_task(
    task_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    svc = TaskService(db)
    task, xp = svc.complete_task(task_id)
    user = svc.get_user(user_id)
    return {
        "task": task,
        "xp_earned": xp,
        "new_total_xp": user.xp,
        "leveled_up": False,
    }
