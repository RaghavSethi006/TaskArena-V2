from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import AsyncGenerator

from sqlalchemy.orm import Session

import features.quiz.models  # noqa: F401
import features.study_materials.models  # noqa: F401
import features.schedule.models  # noqa: F401
import features.tasks.models  # noqa: F401
import features.notes.models  # noqa: F401
import shared.user_model  # noqa: F401
from features.chatbot.ai_service import get_ai
from features.chatbot.models import ChatConversation, ChatMessage
from features.chatbot.rag_service import RAGService

LOGGER = logging.getLogger(__name__)

CHATBOT_SYSTEM_PROMPT = """You are TaskArena's AI tutor, helping a student understand their course material.

Guidelines:
- Answer based on the provided context from the student's own notes when available
- If the context doesn't cover the question, say so and answer from general knowledge
- Be concise but complete - students are busy
- Use clear structure: headers, bullet points, numbered steps where appropriate
- When explaining concepts, give a simple explanation first, then go deeper
- If asked for practice questions, generate them in a clear numbered format
- Never make up citations or invent facts
- Speak like a knowledgeable tutor, not a search engine

When context from notes is provided, prioritize it over your general knowledge.
"""


class ChatService:
    def __init__(self, db: Session):
        self.db = db
        self.rag = RAGService(db)

    def get_conversations(self, user_id: int) -> list[ChatConversation]:
        """Return all conversations for user, newest first."""
        return (
            self.db.query(ChatConversation)
            .filter(ChatConversation.user_id == user_id)
            .order_by(ChatConversation.updated_at.desc(), ChatConversation.id.desc())
            .all()
        )

    def get_conversation(self, conv_id: int) -> ChatConversation:
        """Raise ValueError if not found."""
        conversation = self.db.get(ChatConversation, conv_id)
        if not conversation:
            raise ValueError(f"Conversation with id {conv_id} not found")
        return conversation

    def create_conversation(
        self,
        user_id: int,
        title: str = None,
        course_id: int = None,
        folder_id: int = None,
        file_id: int = None,
    ) -> ChatConversation:
        """Create conversation. title defaults to "New Conversation"."""
        conversation = ChatConversation(
            user_id=user_id,
            title=(title.strip() if title and title.strip() else "New Conversation"),
            context_course_id=course_id,
            context_folder_id=folder_id,
            context_file_id=file_id,
        )
        self.db.add(conversation)
        self.db.commit()
        self.db.refresh(conversation)
        return conversation

    def delete_conversation(self, conv_id: int) -> None:
        conversation = self.get_conversation(conv_id)
        self.db.delete(conversation)
        self.db.commit()

    def get_messages(self, conv_id: int) -> list[ChatMessage]:
        """Return messages ordered by created_at asc."""
        self.get_conversation(conv_id)
        return (
            self.db.query(ChatMessage)
            .filter(ChatMessage.conversation_id == conv_id)
            .order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
            .all()
        )

    def save_message(
        self,
        conv_id: int,
        role: str,
        content: str,
        sources: list[str] = None,
        model_used: str = None,
    ) -> ChatMessage:
        """
        Save message to DB.
        sources stored as JSON string: json.dumps(sources or [])
        Also update conversation.updated_at = utcnow.
        """
        if role not in {"user", "assistant"}:
            raise ValueError("role must be 'user' or 'assistant'")

        conversation = self.get_conversation(conv_id)
        message = ChatMessage(
            conversation_id=conv_id,
            role=role,
            content=content,
            sources=json.dumps(sources or []),
            model_used=model_used,
        )
        conversation.updated_at = datetime.utcnow()
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        return message

    def build_message_history(self, conv_id: int) -> list[dict]:
        """
        Return last 20 messages as list of {"role": ..., "content": ...} dicts.
        Used as the messages param for AI providers.
        """
        self.get_conversation(conv_id)
        recent = (
            self.db.query(ChatMessage)
            .filter(ChatMessage.conversation_id == conv_id)
            .order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
            .limit(20)
            .all()
        )
        recent.reverse()
        return [{"role": msg.role, "content": msg.content} for msg in recent]

    def update_context(
        self,
        conv_id: int,
        course_id: int = None,
        folder_id: int = None,
        file_id: int = None,
    ) -> None:
        """Update conversation context IDs. Pass None to clear."""
        conversation = self.get_conversation(conv_id)
        conversation.context_course_id = course_id
        conversation.context_folder_id = folder_id
        conversation.context_file_id = file_id
        conversation.updated_at = datetime.utcnow()
        self.db.commit()

    async def stream_response(
        self,
        conv_id: int,
        user_content: str,
        provider: str = "groq",
        model: str = None,
    ) -> AsyncGenerator[str | dict, None]:
        """
        Full pipeline:
        1. Save user message to DB
        2. Get conversation to find context_course_id
        3. Get RAG context (if course_id set)
        4. Get RAG sources
        5. Build message history
        6. Get AI provider via get_ai(provider, model=model)
        7. Stream tokens - yield each token
        8. After stream ends: save assistant message with full content + sources + model name
        """
        self.save_message(conv_id=conv_id, role="user", content=user_content)
        conversation = self.get_conversation(conv_id)

        context = ""
        sources: list[str] = []

        context = self.rag.get_context(
            query=user_content,
            course_id=conversation.context_course_id,
            folder_id=conversation.context_folder_id,
            file_id=conversation.context_file_id,
        )
        sources = self.rag.get_sources(
            query=user_content,
            course_id=conversation.context_course_id,
            folder_id=conversation.context_folder_id,
            file_id=conversation.context_file_id,
        )

        history = self.build_message_history(conv_id)
        ai = get_ai(provider, model=model)
        model_name = getattr(ai, "model", None) or model or provider

        tokens: list[str] = []
        async for token in ai.stream(
            messages=history,
            context=context,
            system=CHATBOT_SYSTEM_PROMPT,
        ):
            tokens.append(token)
            yield token

        assistant_content = "".join(tokens).strip()
        saved_message = self.save_message(
            conv_id=conv_id,
            role="assistant",
            content=assistant_content,
            sources=sources,
            model_used=model_name,
        )
        yield {"done": True, "sources": sources, "message_id": saved_message.id}

    async def auto_title(self, conv_id: int, provider: str = "groq") -> str:
        """
        Generate a short title from the first user message.
        Use the prompt from docs/PROMPTS.md (auto-title section).
        Use ai.complete() (not stream).
        Update conversation.title in DB.
        Return the new title.
        """
        conversation = self.get_conversation(conv_id)
        first_user = (
            self.db.query(ChatMessage)
            .filter(
                ChatMessage.conversation_id == conv_id,
                ChatMessage.role == "user",
            )
            .order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
            .first()
        )
        if not first_user:
            raise ValueError("Cannot auto-title before sending a user message.")

        prompt = (
            f'Given this first message in a study chat: "{first_user.content}"\n\n'
            "Generate a short, descriptive title (3-6 words) that captures the topic.\n"
            "Examples: \"Newton's Laws of Motion\", \"Organic Chemistry Reactions\", "
            "\"French Verb Conjugation\"\n\n"
            "Output only the title - no quotes, no punctuation at the end."
        )

        model = "llama-3.1-8b-instant" if provider == "groq" else None
        ai = get_ai(provider, model=model)
        raw_title = await ai.complete(
            messages=[{"role": "user", "content": prompt}],
            system="You generate concise study conversation titles.",
            max_tokens=32,
        )

        clean_title = raw_title.strip().strip('"').strip("'").strip()
        clean_title = clean_title.rstrip(".!?")
        if not clean_title:
            clean_title = "New Conversation"

        conversation.title = clean_title[:255]
        conversation.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(conversation)
        return conversation.title
