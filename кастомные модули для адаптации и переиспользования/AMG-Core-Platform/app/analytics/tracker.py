"""Analytics tracker for monitoring user interactions."""

import time
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from app.analytics.models import (
    UserSession, UserInteraction, ConversationMetrics, 
    InteractionType, UserBehavior, ConversationInsights
)
from app.utils.logging import get_logger

logger = get_logger(__name__)


class AnalyticsTracker:
    """Tracks user interactions and behavior analytics."""
    
    def __init__(self, db: Session):
        self.db = db
        self._active_sessions: Dict[str, UserSession] = {}
        self._conversation_metrics: Dict[str, ConversationMetrics] = {}
    
    def start_session(
        self, 
        session_id: str,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> UserSession:
        """Start tracking a new user session."""
        try:
            # Check if session already exists
            existing_session = self.db.query(UserSession).filter(
                UserSession.session_id == session_id
            ).first()
            
            if existing_session:
                if existing_session.is_active:
                    logger.warning(f"Session {session_id} already active")
                    return existing_session
                else:
                    # Reactivate session
                    existing_session.is_active = True
                    existing_session.ended_at = None
                    self.db.commit()
                    return existing_session
            
            # Create new session
            session = UserSession(
                session_id=session_id,
                user_id=user_id,
                ip_address=ip_address,
                user_agent=user_agent,
                metadata=metadata or {}
            )
            
            self.db.add(session)
            self.db.commit()
            self.db.refresh(session)
            
            self._active_sessions[session_id] = session
            
            # Track session start
            self._track_interaction(
                session_id=session_id,
                conversation_id="",
                interaction_type=InteractionType.CONVERSATION_STARTED,
                metadata={"user_id": user_id}
            )
            
            logger.info(f"Started tracking session {session_id}")
            return session
            
        except Exception as e:
            logger.error(f"Failed to start session {session_id}: {str(e)}")
            self.db.rollback()
            raise
    
    def end_session(self, session_id: str) -> bool:
        """End tracking a user session."""
        try:
            session = self._active_sessions.get(session_id)
            if not session:
                session = self.db.query(UserSession).filter(
                    UserSession.session_id == session_id
                ).first()
            
            if session and session.is_active:
                session.is_active = False
                session.ended_at = datetime.utcnow()
                self.db.commit()
                
                # Remove from active sessions
                if session_id in self._active_sessions:
                    del self._active_sessions[session_id]
                
                # Track session end
                self._track_interaction(
                    session_id=session_id,
                    conversation_id="",
                    interaction_type=InteractionType.CONVERSATION_ENDED
                )
                
                logger.info(f"Ended tracking session {session_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to end session {session_id}: {str(e)}")
            self.db.rollback()
            return False
    
    def track_message_sent(
        self,
        session_id: str,
        conversation_id: str,
        message_content: str,
        model_used: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> UserInteraction:
        """Track a message sent by user."""
        return self._track_interaction(
            session_id=session_id,
            conversation_id=conversation_id,
            interaction_type=InteractionType.MESSAGE_SENT,
            message_content=message_content,
            message_length=len(message_content),
            model_used=model_used,
            metadata=metadata
        )
    
    def track_message_received(
        self,
        session_id: str,
        conversation_id: str,
        message_content: str,
        response_time_ms: int,
        model_used: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> UserInteraction:
        """Track a message received from assistant."""
        return self._track_interaction(
            session_id=session_id,
            conversation_id=conversation_id,
            interaction_type=InteractionType.MESSAGE_RECEIVED,
            message_content=message_content,
            message_length=len(message_content),
            response_time_ms=response_time_ms,
            model_used=model_used,
            metadata=metadata
        )
    
    def track_model_switch(
        self,
        session_id: str,
        conversation_id: str,
        old_model: str,
        new_model: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> UserInteraction:
        """Track model switch event."""
        return self._track_interaction(
            session_id=session_id,
            conversation_id=conversation_id,
            interaction_type=InteractionType.MODEL_SWITCHED,
            model_used=new_model,
            metadata={
                **(metadata or {}),
                "old_model": old_model,
                "new_model": new_model
            }
        )
    
    def track_rag_usage(
        self,
        session_id: str,
        conversation_id: str,
        enabled: bool,
        metadata: Optional[Dict[str, Any]] = None
    ) -> UserInteraction:
        """Track RAG usage."""
        interaction_type = InteractionType.RAG_ENABLED if enabled else InteractionType.RAG_DISABLED
        return self._track_interaction(
            session_id=session_id,
            conversation_id=conversation_id,
            interaction_type=interaction_type,
            metadata=metadata
        )
    
    def track_error(
        self,
        session_id: str,
        conversation_id: str,
        error_type: str,
        error_message: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> UserInteraction:
        """Track error occurrence."""
        return self._track_interaction(
            session_id=session_id,
            conversation_id=conversation_id,
            interaction_type=InteractionType.ERROR_OCCURRED,
            error_type=error_type,
            error_message=error_message,
            metadata=metadata
        )
    
    def track_feedback(
        self,
        session_id: str,
        conversation_id: str,
        positive: bool,
        score: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> UserInteraction:
        """Track user feedback."""
        interaction_type = InteractionType.FEEDBACK_POSITIVE if positive else InteractionType.FEEDBACK_NEGATIVE
        return self._track_interaction(
            session_id=session_id,
            conversation_id=conversation_id,
            interaction_type=interaction_type,
            metadata={
                **(metadata or {}),
                "score": score
            }
        )
    
    def _track_interaction(
        self,
        session_id: str,
        conversation_id: str,
        interaction_type: InteractionType,
        message_content: Optional[str] = None,
        message_length: Optional[int] = None,
        response_time_ms: Optional[int] = None,
        response_length: Optional[int] = None,
        model_used: Optional[str] = None,
        error_type: Optional[str] = None,
        error_message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> UserInteraction:
        """Track a generic interaction."""
        try:
            interaction = UserInteraction(
                session_id=session_id,
                conversation_id=conversation_id,
                interaction_type=interaction_type.value,
                message_content=message_content,
                message_length=message_length,
                response_time_ms=response_time_ms,
                response_length=response_length,
                model_used=model_used,
                error_type=error_type,
                error_message=error_message,
                metadata=metadata or {}
            )
            
            self.db.add(interaction)
            self.db.commit()
            self.db.refresh(interaction)
            
            # Update conversation metrics
            self._update_conversation_metrics(
                session_id, conversation_id, interaction
            )
            
            return interaction
            
        except Exception as e:
            logger.error(f"Failed to track interaction: {str(e)}")
            self.db.rollback()
            raise
    
    def _update_conversation_metrics(
        self,
        session_id: str,
        conversation_id: str,
        interaction: UserInteraction
    ):
        """Update conversation-level metrics."""
        try:
            # Get or create conversation metrics
            metrics = self._conversation_metrics.get(conversation_id)
            if not metrics:
                metrics = self.db.query(ConversationMetrics).filter(
                    ConversationMetrics.conversation_id == conversation_id
                ).first()
            
            if not metrics:
                # Create new conversation metrics
                metrics = ConversationMetrics(
                    conversation_id=conversation_id,
                    session_id=session_id,
                    started_at=interaction.timestamp
                )
                self.db.add(metrics)
                self._conversation_metrics[conversation_id] = metrics
            
            # Update metrics based on interaction type
            if interaction.interaction_type == InteractionType.MESSAGE_SENT.value:
                metrics.user_messages += 1
                metrics.total_user_characters += interaction.message_length or 0
            elif interaction.interaction_type == InteractionType.MESSAGE_RECEIVED.value:
                metrics.assistant_messages += 1
                metrics.total_assistant_characters += interaction.message_length or 0
                if interaction.response_time_ms:
                    # Update average response time
                    if metrics.average_response_time_ms is None:
                        metrics.average_response_time_ms = interaction.response_time_ms
                    else:
                        # Weighted average
                        total_responses = metrics.assistant_messages
                        metrics.average_response_time_ms = (
                            (metrics.average_response_time_ms * (total_responses - 1) + interaction.response_time_ms) 
                            / total_responses
                        )
            elif interaction.interaction_type == InteractionType.ERROR_OCCURRED.value:
                metrics.error_count += 1
            elif interaction.interaction_type in [InteractionType.FEEDBACK_POSITIVE.value, InteractionType.FEEDBACK_NEGATIVE.value]:
                if interaction.metadata and "score" in interaction.metadata:
                    score = interaction.metadata["score"]
                    if score is not None:
                        if metrics.feedback_score is None:
                            metrics.feedback_score = score
                        else:
                            # Update average feedback score
                            feedback_count = sum(1 for i in [InteractionType.FEEDBACK_POSITIVE.value, InteractionType.FEEDBACK_NEGATIVE.value] 
                                               if i in [interaction.interaction_type])
                            metrics.feedback_score = (metrics.feedback_score + score) / 2
            
            # Update model usage
            if interaction.model_used:
                if interaction.model_used not in metrics.models_used:
                    metrics.models_used.append(interaction.model_used)
                if not metrics.primary_model:
                    metrics.primary_model = interaction.model_used
            
            # Update RAG usage
            if interaction.interaction_type == InteractionType.RAG_ENABLED.value:
                metrics.rag_used = True
            
            # Update streaming usage
            if interaction.interaction_type == InteractionType.MESSAGE_RECEIVED.value:
                # Check if streaming was used based on metadata
                if interaction.metadata and interaction.metadata.get("streaming", True):
                    metrics.streaming_used = True
            
            # Update total messages
            metrics.total_messages = metrics.user_messages + metrics.assistant_messages
            
            # Update average message lengths
            if metrics.user_messages > 0:
                metrics.average_user_message_length = metrics.total_user_characters / metrics.user_messages
            if metrics.assistant_messages > 0:
                metrics.average_assistant_message_length = metrics.total_assistant_characters / metrics.assistant_messages
            
            # Update duration if conversation ended
            if interaction.interaction_type == InteractionType.CONVERSATION_ENDED.value:
                metrics.ended_at = interaction.timestamp
                if metrics.started_at:
                    duration = (metrics.ended_at - metrics.started_at).total_seconds()
                    metrics.total_duration_seconds = duration
            
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Failed to update conversation metrics: {str(e)}")
            self.db.rollback()
    
    def get_user_behavior(
        self, 
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        days: int = 30
    ) -> Optional[UserBehavior]:
        """Analyze user behavior patterns."""
        try:
            # Build query based on available identifiers
            query = self.db.query(UserSession)
            
            if user_id:
                query = query.filter(UserSession.user_id == user_id)
            elif session_id:
                query = query.filter(UserSession.session_id == session_id)
            else:
                return None
            
            # Filter by date range
            start_date = datetime.utcnow() - timedelta(days=days)
            query = query.filter(UserSession.started_at >= start_date)
            
            sessions = query.all()
            if not sessions:
                return None
            
            # Calculate behavior metrics
            total_sessions = len(sessions)
            total_conversations = 0
            total_messages = 0
            total_characters = 0
            total_duration = 0.0
            models_used = set()
            rag_usage_count = 0
            error_count = 0
            feedback_count = 0
            positive_feedback_count = 0
            
            for session in sessions:
                # Get conversation metrics for this session
                conv_metrics = self.db.query(ConversationMetrics).filter(
                    ConversationMetrics.session_id == session.session_id
                ).all()
                
                total_conversations += len(conv_metrics)
                
                for conv in conv_metrics:
                    total_messages += conv.total_messages
                    total_characters += conv.total_user_characters + conv.total_assistant_characters
                    if conv.total_duration_seconds:
                        total_duration += conv.total_duration_seconds
                    models_used.update(conv.models_used)
                    if conv.rag_used:
                        rag_usage_count += 1
                    error_count += conv.error_count
                    if conv.feedback_score is not None:
                        feedback_count += 1
                        if conv.feedback_score > 0.5:
                            positive_feedback_count += 1
            
            # Calculate averages
            avg_session_duration = total_duration / total_sessions if total_sessions > 0 else 0.0
            avg_conversation_length = total_messages / total_conversations if total_conversations > 0 else 0.0
            rag_usage_rate = rag_usage_count / total_conversations if total_conversations > 0 else 0.0
            error_rate = error_count / total_messages if total_messages > 0 else 0.0
            feedback_rate = feedback_count / total_conversations if total_conversations > 0 else 0.0
            positive_feedback_rate = positive_feedback_count / feedback_count if feedback_count > 0 else 0.0
            
            return UserBehavior(
                session_id=session_id or sessions[0].session_id,
                user_id=user_id,
                total_sessions=total_sessions,
                total_conversations=total_conversations,
                total_messages=total_messages,
                total_characters=total_characters,
                average_session_duration=avg_session_duration,
                average_conversation_length=avg_conversation_length,
                preferred_models=list(models_used),
                rag_usage_rate=rag_usage_rate,
                error_rate=error_rate,
                feedback_rate=feedback_rate,
                positive_feedback_rate=positive_feedback_rate
            )
            
        except Exception as e:
            logger.error(f"Failed to analyze user behavior: {str(e)}")
            return None
    
    def get_conversation_insights(
        self, 
        conversation_id: str
    ) -> Optional[ConversationInsights]:
        """Get insights for a specific conversation."""
        try:
            metrics = self.db.query(ConversationMetrics).filter(
                ConversationMetrics.conversation_id == conversation_id
            ).first()
            
            if not metrics:
                return None
            
            # Get interactions for this conversation
            interactions = self.db.query(UserInteraction).filter(
                UserInteraction.conversation_id == conversation_id
            ).all()
            
            # Analyze conversation patterns
            questions_asked = sum(1 for i in interactions 
                                if i.interaction_type == InteractionType.MESSAGE_SENT.value 
                                and i.message_content and "?" in i.message_content)
            
            # Calculate complexity score based on message length and count
            complexity_score = min(1.0, (metrics.total_messages * 0.1 + 
                                       metrics.average_user_message_length / 100))
            
            # Determine resolution success based on feedback
            resolution_success = metrics.feedback_score is not None and metrics.feedback_score > 0.5
            
            return ConversationInsights(
                conversation_id=conversation_id,
                complexity_score=complexity_score,
                resolution_success=resolution_success,
                user_satisfaction=metrics.feedback_score,
                questions_asked=questions_asked,
                requests_made=metrics.user_messages,
                complaints_raised=0,  # Would need sentiment analysis
                compliments_given=0,  # Would need sentiment analysis
            )
            
        except Exception as e:
            logger.error(f"Failed to get conversation insights: {str(e)}")
            return None
