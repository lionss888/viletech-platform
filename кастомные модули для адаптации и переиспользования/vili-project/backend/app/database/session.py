"""Database session management"""

from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool

from app.core.config import settings

# Create engine
engine = create_engine(
    settings.DATABASE_URL,
    poolclass=NullPool,  # Для избежания проблем с соединениями в Docker
    echo=settings.DEBUG,  # Логировать SQL запросы в debug режиме
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency для получения сессии БД.
    Используется в FastAPI endpoints.
    
    Yields:
        Session: SQLAlchemy сессия
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables"""
    from app.database.base import Base
    # Import all models here so they are registered with Base.metadata
    from app.database.models import knowledge_source, knowledge_chunk  # noqa
    
    Base.metadata.create_all(bind=engine)
