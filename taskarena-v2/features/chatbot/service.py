from __future__ import annotations

import json
import logging
import re
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
from features.chatbot.models import ChatConversation, ChatGroup, ChatMessage
from features.chatbot.rag_service import RAGService

LOGGER = logging.getLogger(__name__)
DEFAULT_CONVERSATION_TITLE = "New Conversation"

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

    def get_conversation(
        self, conv_id: int, user_id: int | None = None
    ) -> ChatConversation:
        """Raise ValueError if not found."""
        conversation = self.db.get(ChatConversation, conv_id)
        if not conversation:
            raise ValueError(f"Conversation with id {conv_id} not found")
        if user_id is not None and conversation.user_id != user_id:
            raise ValueError(f"Conversation with id {conv_id} not found")
        return conversation

    def get_groups(self, user_id: int) -> list[ChatGroup]:
        return (
            self.db.query(ChatGroup)
            .filter(ChatGroup.user_id == user_id)
            .order_by(ChatGroup.name.asc(), ChatGroup.id.asc())
            .all()
        )

    def get_group(self, group_id: int, user_id: int | None = None) -> ChatGroup:
        group = self.db.get(ChatGroup, group_id)
        if not group:
            raise ValueError(f"Chat group with id {group_id} not found")
        if user_id is not None and group.user_id != user_id:
            raise ValueError(f"Chat group with id {group_id} not found")
        return group

    def create_group(self, user_id: int, name: str) -> ChatGroup:
        clean_name = self._normalize_group_name(name)
        group = ChatGroup(user_id=user_id, name=clean_name)
        self.db.add(group)
        self.db.commit()
        self.db.refresh(group)
        return group

    def update_group(self, group_id: int, user_id: int, name: str) -> ChatGroup:
        group = self.get_group(group_id, user_id=user_id)
        group.name = self._normalize_group_name(name)
        group.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(group)
        return group

    def delete_group(self, group_id: int, user_id: int) -> None:
        group = self.get_group(group_id, user_id=user_id)
        (
            self.db.query(ChatConversation)
            .filter(ChatConversation.group_id == group.id)
            .update(
                {
                    ChatConversation.group_id: None,
                    ChatConversation.updated_at: datetime.utcnow(),
                },
                synchronize_session=False,
            )
        )
        self.db.delete(group)
        self.db.commit()

    def create_conversation(
        self,
        user_id: int,
        title: str | None = None,
        group_id: int | None = None,
        course_id: int | None = None,
        folder_id: int | None = None,
        file_id: int | None = None,
    ) -> ChatConversation:
        """Create conversation with optional custom title and group."""
        clean_title = self._normalize_title(title)
        clean_group_id = self._validate_group_id(group_id, user_id)
        conversation = ChatConversation(
            user_id=user_id,
            title=clean_title,
            group_id=clean_group_id,
            context_course_id=course_id,
            context_folder_id=folder_id,
            context_file_id=file_id,
        )
        self.db.add(conversation)
        self.db.commit()
        self.db.refresh(conversation)
        return conversation

    def delete_conversation(self, conv_id: int, user_id: int | None = None) -> None:
        conversation = self.get_conversation(conv_id, user_id=user_id)
        self.db.delete(conversation)
        self.db.commit()

    def get_messages(
        self, conv_id: int, user_id: int | None = None
    ) -> list[ChatMessage]:
        """Return messages ordered by created_at asc."""
        self.get_conversation(conv_id, user_id=user_id)
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
        should_auto_title = False
        if role == "user" and self._should_auto_title(conversation.title):
            existing_user_messages = (
                self.db.query(ChatMessage.id)
                .filter(
                    ChatMessage.conversation_id == conv_id,
                    ChatMessage.role == "user",
                )
                .count()
            )
            should_auto_title = existing_user_messages == 0

        message = ChatMessage(
            conversation_id=conv_id,
            role=role,
            content=content,
            sources=json.dumps(sources or []),
            model_used=model_used,
        )
        conversation.updated_at = datetime.utcnow()
        if should_auto_title:
            conversation.title = self._generate_title_from_first_message(content)
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
        course_id: int | None = None,
        folder_id: int | None = None,
        file_id: int | None = None,
        user_id: int | None = None,
    ) -> None:
        """Update conversation context IDs. Pass None to clear."""
        conversation = self.get_conversation(conv_id, user_id=user_id)
        conversation.context_course_id = course_id
        conversation.context_folder_id = folder_id
        conversation.context_file_id = file_id
        conversation.updated_at = datetime.utcnow()
        self.db.commit()

    def update_conversation(
        self,
        conv_id: int,
        user_id: int,
        title: str | None = None,
        group_id: int | None = None,
    ) -> ChatConversation:
        conversation = self.get_conversation(conv_id, user_id=user_id)
        conversation.title = self._normalize_title(title)
        conversation.group_id = self._validate_group_id(group_id, user_id)
        conversation.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(conversation)
        return conversation

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

    async def auto_title(
        self, conv_id: int, provider: str = "groq", user_id: int | None = None
    ) -> str:
        """
        Generate a short title from the first user message.
        Use the prompt from docs/PROMPTS.md (auto-title section).
        Use ai.complete() (not stream).
        Update conversation.title in DB.
        Return the new title.
        """
        conversation = self.get_conversation(conv_id, user_id=user_id)
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

        clean_title = self._generate_title_from_first_message(first_user.content)
        if clean_title == DEFAULT_CONVERSATION_TITLE:
            prompt = (
                f'Given this first message in a study chat: "{first_user.content}"\n\n'
                "Generate a short, descriptive title (3-6 words) that captures the topic.\n"
                "Examples: \"Newton's Laws of Motion\", \"Organic Chemistry Reactions\", "
                "\"French Verb Conjugation\"\n\n"
                "Output only the title - no quotes, no punctuation at the end."
            )
            try:
                model = "llama-3.1-8b-instant" if provider == "groq" else None
                ai = get_ai(provider, model=model)
                raw_title = await ai.complete(
                    messages=[{"role": "user", "content": prompt}],
                    system="You generate concise study conversation titles.",
                    max_tokens=32,
                )
                clean_title = self._normalize_title(raw_title) or DEFAULT_CONVERSATION_TITLE
            except Exception:
                LOGGER.exception("Falling back to heuristic conversation title generation")

        conversation.title = clean_title[:255]
        conversation.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(conversation)
        return conversation.title

    def _normalize_title(self, title: str | None) -> str | None:
        if title is None:
            return None
        clean_title = " ".join(title.split()).strip()
        if not clean_title:
            return None
        return clean_title[:255]

    def _normalize_group_name(self, name: str) -> str:
        clean_name = " ".join((name or "").split()).strip()
        if not clean_name:
            raise ValueError("Group name cannot be empty")
        return clean_name[:120]

    def _validate_group_id(self, group_id: int | None, user_id: int) -> int | None:
        if group_id is None:
            return None
        return self.get_group(group_id, user_id=user_id).id

    def _should_auto_title(self, title: str | None) -> bool:
        if title is None:
            return True
        normalized = title.strip().casefold()
        return normalized in {"", DEFAULT_CONVERSATION_TITLE.casefold()}

    def _generate_title_from_first_message(self, content: str) -> str:
        text = " ".join((content or "").split()).strip()
        if not text:
            return DEFAULT_CONVERSATION_TITLE

        text = re.split(r"[\n\r]+", text, maxsplit=1)[0].strip()
        text = text.strip("\"'` ")
        text = re.sub(r"^(hi|hello|hey)\b[\s,!.-]*", "", text, flags=re.IGNORECASE)
        text = re.sub(
            r"^(can you|could you|would you|will you|please|help me|i need help with)\b[\s,:-]*",
            "",
            text,
            flags=re.IGNORECASE,
        )
        text = re.sub(
            r"^(what is|what are|what does|how do i|how do you|how can i|how can you|why is|why are|why does|explain|summarize|tell me about)\b[\s,:-]*",
            "",
            text,
            flags=re.IGNORECASE,
        )
        text = text.strip(" -:,.!?")
        if not text:
            return DEFAULT_CONVERSATION_TITLE

        max_length = 60
        if len(text) > max_length:
            trimmed = text[: max_length - 3].rstrip()
            if " " in trimmed:
                trimmed = trimmed.rsplit(" ", 1)[0]
            text = f"{trimmed}..."

        return text[:1].upper() + text[1:]
