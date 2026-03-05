import json
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, Response, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user_id, get_db
from features.chatbot.schemas import ConversationCreate, ConversationOut, MessageOut
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


def _to_conversation_out(conversation, message_count: int) -> ConversationOut:
    payload = {
        "id": conversation.id,
        "title": conversation.title,
        "context_course_id": conversation.context_course_id,
        "context_folder_id": conversation.context_folder_id,
        "context_file_id": conversation.context_file_id,
        "created_at": conversation.created_at,
        "updated_at": conversation.updated_at,
        "message_count": message_count,
    }
    return ConversationOut.model_validate(payload)


@router.get("/conversations", response_model=list[ConversationOut])
def get_conversations(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    svc = ChatService(db)
    conversations = svc.get_conversations(user_id)
    output: list[ConversationOut] = []
    for conversation in conversations:
        count = len(svc.get_messages(conversation.id))
        output.append(_to_conversation_out(conversation, count))
    return output


@router.post("/conversations", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
def create_conversation(
    body: ConversationCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    svc = ChatService(db)
    conversation = svc.create_conversation(
        user_id=user_id,
        title=body.title,
        course_id=body.context_course_id,
        folder_id=body.context_folder_id,
        file_id=body.context_file_id,
    )
    return _to_conversation_out(conversation, 0)


@router.get("/conversations/{conv_id}", response_model=ConversationOut)
def get_conversation(conv_id: int, db: Session = Depends(get_db)):
    svc = ChatService(db)
    conversation = svc.get_conversation(conv_id)
    count = len(svc.get_messages(conv_id))
    return _to_conversation_out(conversation, count)


@router.delete("/conversations/{conv_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(conv_id: int, db: Session = Depends(get_db)) -> Response:
    ChatService(db).delete_conversation(conv_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/conversations/{conv_id}/messages", response_model=list[MessageOut])
def get_messages(conv_id: int, db: Session = Depends(get_db)):
    return ChatService(db).get_messages(conv_id)


@router.post("/conversations/{conv_id}/title")
async def auto_title(
    conv_id: int,
    provider: str = Query("groq"),
    db: Session = Depends(get_db),
):
    title = await ChatService(db).auto_title(conv_id, provider=provider)
    return {"title": title}


@router.patch("/conversations/{conv_id}/context", response_model=ConversationOut)
def update_context(
    conv_id: int,
    body: ContextUpdateBody,
    db: Session = Depends(get_db),
):
    svc = ChatService(db)
    svc.update_context(
        conv_id=conv_id,
        course_id=body.context_course_id,
        folder_id=body.context_folder_id,
        file_id=body.context_file_id,
    )
    conversation = svc.get_conversation(conv_id)
    count = len(svc.get_messages(conv_id))
    return _to_conversation_out(conversation, count)


@router.post("/conversations/{conv_id}/messages")
async def send_message(
    conv_id: int,
    body: MessageRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    svc = ChatService(db)

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
                if await request.is_disconnected():
                    break

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
