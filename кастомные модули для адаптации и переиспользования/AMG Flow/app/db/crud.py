"""Database CRUD operations."""

from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.models import Message
from app.utils.errors import DatabaseError


class MessageCRUD:
    """CRUD operations for Message model."""
    
    @staticmethod
    def create(
        db: Session,
        convo_id: str,
        role: str,
        content: str,
        meta: Optional[dict] = None
    ) -> Message:
        """Create a new message."""
        try:
            message = Message(
                convo_id=convo_id,
                role=role,
                content=content,
                meta=meta
            )
            db.add(message)
            db.commit()
            db.refresh(message)
            return message
        except Exception as e:
            db.rollback()
            raise DatabaseError(f"Failed to create message: {str(e)}")
    
    @staticmethod
    def get_by_id(db: Session, message_id: UUID) -> Optional[Message]:
        """Get message by ID."""
        try:
            return db.query(Message).filter(Message.id == message_id).first()
        except Exception as e:
            raise DatabaseError(f"Failed to get message: {str(e)}")
    
    @staticmethod
    def get_by_convo_id(
        db: Session,
        convo_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[Message]:
        """Get messages by conversation ID with pagination."""
        try:
            return (
                db.query(Message)
                .filter(Message.convo_id == convo_id)
                .order_by(desc(Message.created_at))
                .offset(offset)
                .limit(limit)
                .all()
            )
        except Exception as e:
            raise DatabaseError(f"Failed to get messages: {str(e)}")
    
    @staticmethod
    def count_by_convo_id(db: Session, convo_id: str) -> int:
        """Count messages in conversation."""
        try:
            return db.query(Message).filter(Message.convo_id == convo_id).count()
        except Exception as e:
            raise DatabaseError(f"Failed to count messages: {str(e)}")
    
    @staticmethod
    def delete_by_id(db: Session, message_id: UUID) -> bool:
        """Delete message by ID."""
        try:
            message = db.query(Message).filter(Message.id == message_id).first()
            if message:
                db.delete(message)
                db.commit()
                return True
            return False
        except Exception as e:
            db.rollback()
            raise DatabaseError(f"Failed to delete message: {str(e)}")


# Global CRUD instance
message_crud = MessageCRUD()
