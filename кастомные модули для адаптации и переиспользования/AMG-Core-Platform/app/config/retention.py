"""Data retention policy configuration."""

from datetime import timedelta
from typing import Dict, Any
from dataclasses import dataclass


@dataclass
class RetentionPolicy:
    """Configuration for data retention policy."""
    
    # Retention periods (in days)
    messages_retention_days: int = 90
    user_sessions_retention_days: int = 30
    user_interactions_retention_days: int = 60
    conversation_metrics_retention_days: int = 180
    logs_retention_days: int = 30
    
    # Cleanup settings
    batch_size: int = 1000
    dry_run: bool = False
    archive_before_delete: bool = True
    
    # Tables to clean up
    tables_to_clean: Dict[str, Dict[str, Any]] = None
    
    def __post_init__(self):
        """Initialize tables configuration after dataclass creation."""
        if self.tables_to_clean is None:
            self.tables_to_clean = {
                "messages": {
                    "retention_days": self.messages_retention_days,
                    "date_column": "created_at",
                    "archive": True,
                    "description": "Chat messages"
                },
                "user_sessions": {
                    "retention_days": self.user_sessions_retention_days,
                    "date_column": "started_at",
                    "archive": True,
                    "description": "User sessions"
                },
                "user_interactions": {
                    "retention_days": self.user_interactions_retention_days,
                    "date_column": "timestamp",
                    "archive": True,
                    "description": "User interactions"
                },
                "conversation_metrics": {
                    "retention_days": self.conversation_metrics_retention_days,
                    "date_column": "started_at",
                    "archive": True,
                    "description": "Conversation metrics"
                }
            }
    
    def get_retention_days(self, table_name: str) -> int:
        """Get retention days for specific table."""
        return self.tables_to_clean.get(table_name, {}).get("retention_days", 30)
    
    def get_date_column(self, table_name: str) -> str:
        """Get date column for specific table."""
        return self.tables_to_clean.get(table_name, {}).get("date_column", "created_at")
    
    def should_archive(self, table_name: str) -> bool:
        """Check if table should be archived before deletion."""
        return self.tables_to_clean.get(table_name, {}).get("archive", True)


# Default retention policy
DEFAULT_RETENTION_POLICY = RetentionPolicy()

# Production retention policy (more aggressive)
PRODUCTION_RETENTION_POLICY = RetentionPolicy(
    messages_retention_days=30,
    user_sessions_retention_days=7,
    user_interactions_retention_days=14,
    conversation_metrics_retention_days=90,
    logs_retention_days=7,
    batch_size=5000,
    dry_run=False,
    archive_before_delete=True
)

# Development retention policy (keep more data)
DEVELOPMENT_RETENTION_POLICY = RetentionPolicy(
    messages_retention_days=180,
    user_sessions_retention_days=90,
    user_interactions_retention_days=120,
    conversation_metrics_retention_days=365,
    logs_retention_days=60,
    batch_size=1000,
    dry_run=True,
    archive_before_delete=True
)
