"""Data collector for analytics and reporting."""

import json
import csv
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_

from app.analytics.models import (
    UserSession, UserInteraction, ConversationMetrics,
    UserBehavior, ConversationInsights
)
from app.utils.logging import get_logger

logger = get_logger(__name__)


class DataCollector:
    """Collects and aggregates analytics data for reporting."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_daily_stats(
        self, 
        date: Optional[datetime] = None,
        days: int = 1
    ) -> Dict[str, Any]:
        """Get daily statistics."""
        try:
            if date is None:
                date = datetime.utcnow().date()
            
            start_date = datetime.combine(date, datetime.min.time())
            end_date = start_date + timedelta(days=days)
            
            # Session statistics
            sessions_query = self.db.query(UserSession).filter(
                and_(
                    UserSession.started_at >= start_date,
                    UserSession.started_at < end_date
                )
            )
            
            total_sessions = sessions_query.count()
            active_sessions = sessions_query.filter(UserSession.is_active == True).count()
            
            # Interaction statistics
            interactions_query = self.db.query(UserInteraction).filter(
                and_(
                    UserInteraction.timestamp >= start_date,
                    UserInteraction.timestamp < end_date
                )
            )
            
            total_interactions = interactions_query.count()
            message_interactions = interactions_query.filter(
                UserInteraction.interaction_type.in_([
                    "message_sent", "message_received"
                ])
            ).count()
            
            # Conversation statistics
            conversations_query = self.db.query(ConversationMetrics).filter(
                and_(
                    ConversationMetrics.started_at >= start_date,
                    ConversationMetrics.started_at < end_date
                )
            )
            
            total_conversations = conversations_query.count()
            completed_conversations = conversations_query.filter(
                ConversationMetrics.ended_at.isnot(None)
            ).count()
            
            # Model usage
            model_usage = self.db.query(
                UserInteraction.model_used,
                func.count(UserInteraction.id).label('count')
            ).filter(
                and_(
                    UserInteraction.timestamp >= start_date,
                    UserInteraction.timestamp < end_date,
                    UserInteraction.model_used.isnot(None)
                )
            ).group_by(UserInteraction.model_used).all()
            
            # Error statistics
            error_count = interactions_query.filter(
                UserInteraction.interaction_type == "error_occurred"
            ).count()
            
            # RAG usage
            rag_usage = conversations_query.filter(
                ConversationMetrics.rag_used == True
            ).count()
            
            # Average response time
            avg_response_time = self.db.query(
                func.avg(UserInteraction.response_time_ms)
            ).filter(
                and_(
                    UserInteraction.timestamp >= start_date,
                    UserInteraction.timestamp < end_date,
                    UserInteraction.response_time_ms.isnot(None)
                )
            ).scalar() or 0
            
            return {
                "date": date.isoformat(),
                "period_days": days,
                "sessions": {
                    "total": total_sessions,
                    "active": active_sessions,
                    "completed": total_sessions - active_sessions
                },
                "interactions": {
                    "total": total_interactions,
                    "messages": message_interactions,
                    "errors": error_count
                },
                "conversations": {
                    "total": total_conversations,
                    "completed": completed_conversations,
                    "completion_rate": completed_conversations / total_conversations if total_conversations > 0 else 0
                },
                "models": {
                    "usage": [{"model": model, "count": count} for model, count in model_usage]
                },
                "features": {
                    "rag_usage": rag_usage,
                    "rag_usage_rate": rag_usage / total_conversations if total_conversations > 0 else 0
                },
                "performance": {
                    "avg_response_time_ms": round(avg_response_time, 2)
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get daily stats: {str(e)}")
            return {}
    
    def get_user_analytics(
        self,
        user_id: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get user-specific analytics."""
        try:
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # Base query for user sessions
            sessions_query = self.db.query(UserSession).filter(
                UserSession.started_at >= start_date
            )
            
            if user_id:
                sessions_query = sessions_query.filter(UserSession.user_id == user_id)
            
            sessions = sessions_query.all()
            if not sessions:
                return {"error": "No data found for user"}
            
            # Get all interactions for these sessions
            session_ids = [s.session_id for s in sessions]
            interactions = self.db.query(UserInteraction).filter(
                UserInteraction.session_id.in_(session_ids)
            ).all()
            
            # Get conversation metrics
            conversations = self.db.query(ConversationMetrics).filter(
                ConversationMetrics.session_id.in_(session_ids)
            ).all()
            
            # Calculate metrics
            total_sessions = len(sessions)
            total_conversations = len(conversations)
            total_interactions = len(interactions)
            
            # Message analysis
            user_messages = [i for i in interactions if i.interaction_type == "message_sent"]
            assistant_messages = [i for i in interactions if i.interaction_type == "message_received"]
            
            total_user_characters = sum(i.message_length or 0 for i in user_messages)
            total_assistant_characters = sum(i.message_length or 0 for i in assistant_messages)
            
            # Model preferences
            model_usage = {}
            for interaction in interactions:
                if interaction.model_used:
                    model_usage[interaction.model_used] = model_usage.get(interaction.model_used, 0) + 1
            
            # Error analysis
            errors = [i for i in interactions if i.interaction_type == "error_occurred"]
            error_rate = len(errors) / total_interactions if total_interactions > 0 else 0
            
            # Feedback analysis
            feedback_interactions = [i for i in interactions 
                                   if i.interaction_type in ["feedback_positive", "feedback_negative"]]
            positive_feedback = [i for i in feedback_interactions 
                               if i.interaction_type == "feedback_positive"]
            
            # Time analysis
            session_durations = []
            for session in sessions:
                if session.ended_at and session.started_at:
                    duration = (session.ended_at - session.started_at).total_seconds()
                    session_durations.append(duration)
            
            avg_session_duration = sum(session_durations) / len(session_durations) if session_durations else 0
            
            # Peak usage hours
            hour_usage = {}
            for interaction in interactions:
                hour = interaction.timestamp.hour
                hour_usage[hour] = hour_usage.get(hour, 0) + 1
            
            peak_hours = sorted(hour_usage.items(), key=lambda x: x[1], reverse=True)[:5]
            
            return {
                "user_id": user_id,
                "period_days": days,
                "sessions": {
                    "total": total_sessions,
                    "avg_duration_seconds": round(avg_session_duration, 2)
                },
                "conversations": {
                    "total": total_conversations,
                    "avg_length": round(total_interactions / total_conversations, 2) if total_conversations > 0 else 0
                },
                "messages": {
                    "total": len(user_messages) + len(assistant_messages),
                    "user_messages": len(user_messages),
                    "assistant_messages": len(assistant_messages),
                    "total_user_characters": total_user_characters,
                    "total_assistant_characters": total_assistant_characters,
                    "avg_user_message_length": round(total_user_characters / len(user_messages), 2) if user_messages else 0,
                    "avg_assistant_message_length": round(total_assistant_characters / len(assistant_messages), 2) if assistant_messages else 0
                },
                "models": {
                    "preferred": sorted(model_usage.items(), key=lambda x: x[1], reverse=True),
                    "total_used": len(model_usage)
                },
                "quality": {
                    "error_rate": round(error_rate, 4),
                    "total_errors": len(errors),
                    "feedback_count": len(feedback_interactions),
                    "positive_feedback_rate": round(len(positive_feedback) / len(feedback_interactions), 4) if feedback_interactions else 0
                },
                "usage_patterns": {
                    "peak_hours": [{"hour": hour, "count": count} for hour, count in peak_hours],
                    "total_interactions": total_interactions
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get user analytics: {str(e)}")
            return {"error": str(e)}
    
    def get_conversation_analytics(
        self,
        conversation_id: str
    ) -> Dict[str, Any]:
        """Get detailed analytics for a specific conversation."""
        try:
            # Get conversation metrics
            metrics = self.db.query(ConversationMetrics).filter(
                ConversationMetrics.conversation_id == conversation_id
            ).first()
            
            if not metrics:
                return {"error": "Conversation not found"}
            
            # Get all interactions for this conversation
            interactions = self.db.query(UserInteraction).filter(
                UserInteraction.conversation_id == conversation_id
            ).order_by(UserInteraction.timestamp).all()
            
            # Analyze message patterns
            user_messages = [i for i in interactions if i.interaction_type == "message_sent"]
            assistant_messages = [i for i in interactions if i.interaction_type == "message_received"]
            
            # Response time analysis
            response_times = [i.response_time_ms for i in assistant_messages if i.response_time_ms]
            avg_response_time = sum(response_times) / len(response_times) if response_times else 0
            
            # Model usage analysis
            models_used = list(set(i.model_used for i in interactions if i.model_used))
            
            # Error analysis
            errors = [i for i in interactions if i.interaction_type == "error_occurred"]
            
            # Feature usage
            rag_used = any(i.interaction_type == "rag_enabled" for i in interactions)
            streaming_used = any(i.metadata and i.metadata.get("streaming") for i in interactions)
            
            # Content analysis
            total_user_content = " ".join(i.message_content or "" for i in user_messages)
            total_assistant_content = " ".join(i.message_content or "" for i in assistant_messages)
            
            # Question analysis
            questions_asked = sum(1 for i in user_messages 
                                if i.message_content and "?" in i.message_content)
            
            return {
                "conversation_id": conversation_id,
                "session_id": metrics.session_id,
                "duration": {
                    "started_at": metrics.started_at.isoformat(),
                    "ended_at": metrics.ended_at.isoformat() if metrics.ended_at else None,
                    "total_seconds": metrics.total_duration_seconds
                },
                "messages": {
                    "total": metrics.total_messages,
                    "user_messages": metrics.user_messages,
                    "assistant_messages": metrics.assistant_messages,
                    "avg_user_length": round(metrics.average_user_message_length, 2),
                    "avg_assistant_length": round(metrics.average_assistant_message_length, 2)
                },
                "performance": {
                    "avg_response_time_ms": round(avg_response_time, 2),
                    "total_response_time_ms": sum(response_times)
                },
                "models": {
                    "used": models_used,
                    "primary": metrics.primary_model
                },
                "features": {
                    "rag_used": rag_used,
                    "streaming_used": streaming_used
                },
                "quality": {
                    "error_count": len(errors),
                    "feedback_score": metrics.feedback_score,
                    "questions_asked": questions_asked
                },
                "content": {
                    "total_user_characters": len(total_user_content),
                    "total_assistant_characters": len(total_assistant_content),
                    "user_word_count": len(total_user_content.split()),
                    "assistant_word_count": len(total_assistant_content.split())
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get conversation analytics: {str(e)}")
            return {"error": str(e)}
    
    def get_export_data(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        user_id: Optional[str] = None,
        conversation_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get raw data for export."""
        try:
            if start_date is None:
                start_date = datetime.utcnow() - timedelta(days=30)
            if end_date is None:
                end_date = datetime.utcnow()
            
            # Build query
            query = self.db.query(UserInteraction).filter(
                and_(
                    UserInteraction.timestamp >= start_date,
                    UserInteraction.timestamp <= end_date
                )
            )
            
            if user_id:
                # Get sessions for this user
                user_sessions = self.db.query(UserSession.session_id).filter(
                    UserSession.user_id == user_id
                ).all()
                session_ids = [s[0] for s in user_sessions]
                query = query.filter(UserInteraction.session_id.in_(session_ids))
            
            if conversation_id:
                query = query.filter(UserInteraction.conversation_id == conversation_id)
            
            interactions = query.order_by(UserInteraction.timestamp).all()
            
            # Convert to export format
            export_data = []
            for interaction in interactions:
                export_data.append({
                    "id": str(interaction.id),
                    "session_id": interaction.session_id,
                    "conversation_id": interaction.conversation_id,
                    "interaction_type": interaction.interaction_type,
                    "timestamp": interaction.timestamp.isoformat(),
                    "message_content": interaction.message_content,
                    "message_length": interaction.message_length,
                    "model_used": interaction.model_used,
                    "response_time_ms": interaction.response_time_ms,
                    "response_length": interaction.response_length,
                    "error_type": interaction.error_type,
                    "error_message": interaction.error_message,
                    "metadata": interaction.metadata
                })
            
            return export_data
            
        except Exception as e:
            logger.error(f"Failed to get export data: {str(e)}")
            return []
    
    def get_topics_analysis(
        self,
        days: int = 30
    ) -> Dict[str, Any]:
        """Analyze common topics and patterns in conversations."""
        try:
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # Get all user messages
            user_messages = self.db.query(UserInteraction).filter(
                and_(
                    UserInteraction.timestamp >= start_date,
                    UserInteraction.interaction_type == "message_sent",
                    UserInteraction.message_content.isnot(None)
                )
            ).all()
            
            # Simple keyword analysis (in production, use proper NLP)
            all_content = " ".join(msg.message_content or "" for msg in user_messages)
            words = all_content.lower().split()
            
            # Remove common stop words
            stop_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "is", "are", "was", "were", "be", "been", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "can", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his", "her", "its", "our", "their"}
            
            filtered_words = [word for word in words if len(word) > 3 and word not in stop_words]
            
            # Count word frequency
            word_freq = {}
            for word in filtered_words:
                word_freq[word] = word_freq.get(word, 0) + 1
            
            # Get top keywords
            top_keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:20]
            
            # Analyze question patterns
            questions = [msg for msg in user_messages if msg.message_content and "?" in msg.message_content]
            question_rate = len(questions) / len(user_messages) if user_messages else 0
            
            # Analyze message length patterns
            message_lengths = [msg.message_length or 0 for msg in user_messages]
            avg_message_length = sum(message_lengths) / len(message_lengths) if message_lengths else 0
            
            return {
                "period_days": days,
                "total_messages": len(user_messages),
                "top_keywords": [{"word": word, "count": count} for word, count in top_keywords],
                "question_analysis": {
                    "total_questions": len(questions),
                    "question_rate": round(question_rate, 4)
                },
                "content_analysis": {
                    "avg_message_length": round(avg_message_length, 2),
                    "total_characters": sum(message_lengths),
                    "unique_words": len(set(filtered_words))
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze topics: {str(e)}")
            return {"error": str(e)}
