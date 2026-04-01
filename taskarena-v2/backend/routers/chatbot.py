import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user_id, get_db
from features.chatbot.schemas import (
    ChatGroupCreate,
    ChatGroupOut,
    ChatGroupUpdate,
    ConversationCreate,
    ConversationOut,
    ConversationUpdate,
    MessageOut,
)
from features.chatbot.service import ChatService

router = APIRouter(prefix="/chat", tags=["chatbot"])


class MessageRequest(BaseModel):
    content: str
    provider: str = "groq"
    model: Optional[str] = None


class ContextUpdateBody(BaseModel):
    context_course_id: Optional[int] = None
    context_folder_id: Optional[int] = None
    context_file_id: Optional[int] = None


def _bad_request(exc: ValueError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


def _to_conversation_out(conversation, message_count: int) -> ConversationOut:
    payload = {
        "id": conversation.id,
        "title": conversation.title,
        "group_id": conversation.group_id,
        "context_course_id": conversation.context_course_id,
        "context_folder_id": conversation.context_folder_id,
        "context_file_id": conversation.context_file_id,
        "created_at": conversation.created_at,
        "updated_at": conversation.updated_at,
        "message_count": message_count,
    }
    return ConversationOut.model_validate(payload)


def _to_group_out(group, conversation_count: int) -> ChatGroupOut:
    payload = {
        "id": group.id,
        "name": group.name,
        "created_at": group.created_at,
        "updated_at": group.updated_at,
        "conversation_count": conversation_count,
    }
    return ChatGroupOut.model_validate(payload)


@router.get("/groups", response_model=list[ChatGroupOut])
def get_groups(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    svc = ChatService(db)
    conversations = svc.get_conversations(user_id)
    counts: dict[int, int] = {}
    for conversation in conversations:
        if conversation.group_id is None:
            continue
        counts[conversation.group_id] = counts.get(conversation.group_id, 0) + 1

    return [
        _to_group_out(group, counts.get(group.id, 0))
        for group in svc.get_groups(user_id)
    ]


@router.post("/groups", response_model=ChatGroupOut, status_code=status.HTTP_201_CREATED)
def create_group(
    body: ChatGroupCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    svc = ChatService(db)
    try:
        group = svc.create_group(user_id=user_id, name=body.name)
    except ValueError as exc:
        raise _bad_request(exc) from exc
    return _to_group_out(group, 0)


@router.patch("/groups/{group_id}", response_model=ChatGroupOut)
def update_group(
    group_id: int,
    body: ChatGroupUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    svc = ChatService(db)
    try:
        group = svc.update_group(group_id=group_id, user_id=user_id, name=body.name)
    except ValueError as exc:
        raise _bad_request(exc) from exc

    conversation_count = len(
        [conv for conv in svc.get_conversations(user_id) if conv.group_id == group_id]
    )
    return _to_group_out(group, conversation_count)


@router.delete("/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> Response:
    try:
        ChatService(db).delete_group(group_id=group_id, user_id=user_id)
    except ValueError as exc:
        raise _bad_request(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/conversations", response_model=list[ConversationOut])
def get_conversations(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    svc = ChatService(db)
    conversations = svc.get_conversations(user_id)
    output: list[ConversationOut] = []
    for conversation in conversations:
        count = len(svc.get_messages(conversation.id, user_id=user_id))
        output.append(_to_conversation_out(conversation, count))
    return output


@router.post("/conversations", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
def create_conversation(
    body: ConversationCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    svc = ChatService(db)
    try:
        conversation = svc.create_conversation(
            user_id=user_id,
            title=body.title,
            group_id=body.group_id,
            course_id=body.context_course_id,
            folder_id=body.context_folder_id,
            file_id=body.context_file_id,
        )
    except ValueError as exc:
        raise _bad_request(exc) from exc
    return _to_conversation_out(conversation, 0)


@router.get("/conversations/{conv_id}", response_model=ConversationOut)
def get_conversation(
    conv_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    svc = ChatService(db)
    try:
        conversation = svc.get_conversation(conv_id, user_id=user_id)
        count = len(svc.get_messages(conv_id, user_id=user_id))
    except ValueError as exc:
        raise _bad_request(exc) from exc
    return _to_conversation_out(conversation, count)


@router.delete("/conversations/{conv_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conv_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> Response:
    try:
        ChatService(db).delete_conversation(conv_id, user_id=user_id)
    except ValueError as exc:
        raise _bad_request(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/conversations/{conv_id}/messages", response_model=list[MessageOut])
def get_messages(
    conv_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    try:
        return ChatService(db).get_messages(conv_id, user_id=user_id)
    except ValueError as exc:
        raise _bad_request(exc) from exc


@router.patch("/conversations/{conv_id}", response_model=ConversationOut)
def update_conversation(
    conv_id: int,
    body: ConversationUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    svc = ChatService(db)
    try:
        conversation = svc.update_conversation(
            conv_id=conv_id,
            user_id=user_id,
            title=body.title,
            group_id=body.group_id,
        )
        count = len(svc.get_messages(conv_id, user_id=user_id))
    except ValueError as exc:
        raise _bad_request(exc) from exc
    return _to_conversation_out(conversation, count)


@router.post("/conversations/{conv_id}/title")
async def auto_title(
    conv_id: int,
    provider: str = Query("groq"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    try:
        title = await ChatService(db).auto_title(conv_id, provider=provider, user_id=user_id)
    except ValueError as exc:
        raise _bad_request(exc) from exc
    return {"title": title}


@router.patch("/conversations/{conv_id}/context", response_model=ConversationOut)
def update_context(
    conv_id: int,
    body: ContextUpdateBody,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    svc = ChatService(db)
    try:
        svc.update_context(
            conv_id=conv_id,
            course_id=body.context_course_id,
            folder_id=body.context_folder_id,
            file_id=body.context_file_id,
            user_id=user_id,
        )
        conversation = svc.get_conversation(conv_id, user_id=user_id)
        count = len(svc.get_messages(conv_id, user_id=user_id))
    except ValueError as exc:
        raise _bad_request(exc) from exc
    return _to_conversation_out(conversation, count)


@router.post("/conversations/{conv_id}/messages")
async def send_message(
    conv_id: int,
    body: MessageRequest,
    request: Request,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    svc = ChatService(db)
    try:
        svc.get_conversation(conv_id, user_id=user_id)
    except ValueError as exc:
        raise _bad_request(exc) from exc

    async def event_stream():
        full_response = ""
        sources = []
        try:
            async for token in svc.stream_response(
                conv_id=conv_id,
                user_content=body.content,
                provider=body.provider,
                model=body.model,
            ):
                if isinstance(token, dict):
                    sources = token.get("sources", [])
                    data = json.dumps(
                        {
                            "done": True,
                            "sources": sources,
                            "message_id": token.get("message_id"),
                        }
                    )
                    yield f"data: {data}\n\n"
                else:
                    full_response += token
                    data = json.dumps({"token": token})
                    yield f"data: {data}\n\n"

        except Exception as e:
            error_data = json.dumps({"error": str(e)})
            yield f"data: {error_data}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
