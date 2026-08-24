"""Analytics data models for tracking user interactions."""

from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import UUID, uuid4
from dataclasses import dataclass, field
from enum import Enum

from sqlalchemy import String, Text, DateTime, Integer, Float, Boolean, JSON, Index
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase

# Create base class for analytics models
class Base(DeclarativeBase):
    pass


class InteractionType(str, Enum):
    """Types of user interactions."""
    MESSAGE_SENT = "message_sent"
    MESSAGE_RECEIVED = "message_received"
    MODEL_SWITCHED = "model_switched"
    CONVERSATION_STARTED = "conversation_started"
    CONVERSATION_ENDED = "conversation_ended"
    RAG_ENABLED = "rag_enabled"
    RAG_DISABLED = "rag_disabled"
    ERROR_OCCURRED = "error_occurred"
    FEEDBACK_POSITIVE = "feedback_positive"
    FEEDBACK_NEGATIVE = "feedback_negative"


class UserSession(Base):
    """User session tracking."""
    
    __tablename__ = "user_sessions"
    
    id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True),
        primary_key=True,
        default=uuid4
    )
    
    session_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True
    )
    
    user_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True
    )
    
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(45),  # IPv6 compatible
        nullable=True
    )
    
    user_agent: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )
    
    ended_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    session_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True
    )
    
    __table_args__ = (
        Index('idx_user_sessions_session_id', 'session_id'),
        Index('idx_user_sessions_user_id', 'user_id'),
        Index('idx_user_sessions_started_at', 'started_at'),
    )


class UserInteraction(Base):
    """Individual user interaction tracking."""
    
    __tablename__ = "user_interactions"
    
    id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True),
        primary_key=True,
        default=uuid4
    )
    
    session_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True
    )
    
    conversation_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True
    )
    
    interaction_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True
    )
    
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
        index=True
    )
    
    # Message content (for message interactions)
    message_content: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    
    message_length: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )
    
    # Model information
    model_used: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    
    # Response information
    response_time_ms: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )
    
    response_length: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )
    
    # Error information
    error_type: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    
    # Additional session metadata
    session_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True
    )
    
    __table_args__ = (
        Index('idx_user_interactions_session_id', 'session_id'),
        Index('idx_user_interactions_conversation_id', 'conversation_id'),
        Index('idx_user_interactions_type', 'interaction_type'),
        Index('idx_user_interactions_timestamp', 'timestamp'),
        Index('idx_user_interactions_model', 'model_used'),
    )


class ConversationMetrics(Base):
    """Conversation-level metrics and analytics."""
    
    __tablename__ = "conversation_metrics"
    
    id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True),
        primary_key=True,
        default=uuid4
    )
    
    conversation_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        index=True
    )
    
    session_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True
    )
    
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )
    
    ended_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    # Message counts
    total_messages: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    user_messages: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    assistant_messages: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    # Content metrics
    total_user_characters: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    total_assistant_characters: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    average_user_message_length: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False
    )
    
    average_assistant_message_length: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False
    )
    
    # Timing metrics
    total_duration_seconds: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True
    )
    
    average_response_time_ms: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True
    )
    
    # Model usage
    models_used: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False
    )
    
    primary_model: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    
    # Features used
    rag_used: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    streaming_used: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    # Quality metrics
    error_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    feedback_score: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True
    )
    
    # Additional session metadata
    session_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True
    )
    
    __table_args__ = (
        Index('idx_conversation_metrics_conversation_id', 'conversation_id'),
        Index('idx_conversation_metrics_session_id', 'session_id'),
        Index('idx_conversation_metrics_started_at', 'started_at'),
    )


@dataclass
class UserBehavior:
    """User behavior analysis data."""
    
    session_id: str
    user_id: Optional[str] = None
    total_sessions: int = 0
    total_conversations: int = 0
    total_messages: int = 0
    total_characters: int = 0
    average_session_duration: float = 0.0
    average_conversation_length: float = 0.0
    preferred_models: List[str] = field(default_factory=list)
    rag_usage_rate: float = 0.0
    error_rate: float = 0.0
    feedback_rate: float = 0.0
    positive_feedback_rate: float = 0.0
    most_common_topics: List[str] = field(default_factory=list)
    peak_usage_hours: List[int] = field(default_factory=list)
    device_info: Optional[Dict[str, Any]] = None
    location_info: Optional[Dict[str, Any]] = None


@dataclass
class ConversationInsights:
    """Conversation insights and patterns."""
    
    conversation_id: str
    topic: Optional[str] = None
    sentiment: Optional[str] = None
    complexity_score: float = 0.0
    resolution_success: bool = False
    user_satisfaction: Optional[float] = None
    key_phrases: List[str] = field(default_factory=list)
    entities_mentioned: List[str] = field(default_factory=list)
    questions_asked: int = 0
    requests_made: int = 0
    complaints_raised: int = 0
    compliments_given: int = 0
    escalation_indicators: List[str] = field(default_factory=list)
    resolution_indicators: List[str] = field(default_factory=list)
