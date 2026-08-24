"""Database models using SQLAlchemy 2."""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import String, Text, DateTime, Index, JSON
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all database models."""
    pass


class Message(Base):
    """Message model for storing chat history."""
    
    __tablename__ = "messages"
    
    # Primary key
    id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True),
        primary_key=True,
        default=uuid4
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )
    
    # Message content
    convo_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True
    )
    role: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    
    # Metadata
    meta: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True
    )
    
    # Indexes
    __table_args__ = (
        Index('idx_messages_convo_id_created_at', 'convo_id', 'created_at'),
    )
    
    def __repr__(self) -> str:
        return f"<Message(id={self.id}, convo_id={self.convo_id}, role={self.role})>"
