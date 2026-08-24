"""
Pytest configuration and fixtures for VILI backend tests.
"""

import asyncio
import os
from typing import AsyncGenerator, Generator
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session, scoped_session
from sqlalchemy.pool import StaticPool, NullPool

# Set test environment
os.environ["TESTING"] = "true"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["REDIS_URL"] = "redis://localhost:6379/1"
os.environ["LITELLM_URL"] = "http://localhost:4000"


# Import after setting environment variables
from app.main import app
from app.database.base import Base
from app.core.dependencies import get_db, get_current_user
from app.services.llm_service import LLMService
from app.services.embedding_service import EmbeddingService


# ============================================
# Event Loop Configuration
# ============================================
# Note: When using asyncio_mode = auto in pytest.ini,
# pytest-asyncio automatically manages event loops.
# Do NOT define a manual event_loop fixture here as it
# causes conflicts with the automatic mode.


# ============================================
# Shared Test Engine (module-level for thread safety)
# ============================================

# Create a single engine for all tests with proper SQLite threading settings
# Use file-based SQLite for thread safety across TestClient threads
import tempfile
import atexit

_test_db_file = os.path.join(tempfile.gettempdir(), "vili_test.db")

# Remove old test database if exists
if os.path.exists(_test_db_file):
    try:
        os.remove(_test_db_file)
    except:
        pass

# Use SQLite with shared cache for thread safety
_test_engine = create_engine(
    f"sqlite:///{_test_db_file}?check_same_thread=False",
    connect_args={"check_same_thread": False},
    echo=False,
    poolclass=StaticPool,  # Use StaticPool for shared connection
)

# Cleanup on exit
def _cleanup_test_db():
    try:
        if os.path.exists(_test_db_file):
            os.remove(_test_db_file)
    except:
        pass

atexit.register(_cleanup_test_db)

# Create tables on module load
def _init_test_database():
    """Initialize test database with all required tables."""
    Base.metadata.create_all(bind=_test_engine)
    
    with _test_engine.connect() as conn:
        # Payment documents table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS payment_documents (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                format TEXT,
                raw_data BLOB,
                parsed_data TEXT,
                status TEXT DEFAULT 'pending',
                operator_id TEXT,
                customer_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # Analysis results table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS analysis_results (
                id TEXT PRIMARY KEY,
                document_id TEXT,
                analysis_type TEXT,
                result_data TEXT,
                confidence_score REAL,
                model_version TEXT,
                duration_ms INTEGER,
                success INTEGER DEFAULT 1,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (document_id) REFERENCES payment_documents(id)
            )
        """))
        
        # Compliance checks table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS compliance_checks (
                id TEXT PRIMARY KEY,
                document_id TEXT,
                check_type TEXT,
                status TEXT,
                details TEXT,
                risk_level TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (document_id) REFERENCES payment_documents(id)
            )
        """))
        
        # Risk assessments table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS risk_assessments (
                id TEXT PRIMARY KEY,
                document_id TEXT,
                risk_score REAL,
                risk_level TEXT,
                factors TEXT,
                economic_indices TEXT,
                recommendation TEXT,
                model_version TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (document_id) REFERENCES payment_documents(id)
            )
        """))
        
        # Economic indices table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS economic_indices (
                id TEXT PRIMARY KEY,
                country_code TEXT,
                index_type TEXT,
                value REAL,
                year INTEGER,
                source TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # Operator feedback table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS operator_feedback (
                id TEXT PRIMARY KEY,
                document_id TEXT,
                operator_id TEXT,
                rating INTEGER,
                feedback_type TEXT,
                comment TEXT,
                corrected_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (document_id) REFERENCES payment_documents(id)
            )
        """))
        
        # Operators table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS operators (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                role TEXT DEFAULT 'operator',
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        conn.commit()

# Initialize database
_init_test_database()

# Create session factory with scoped session for thread safety
_session_factory = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)
TestingSessionLocal = scoped_session(_session_factory)


# ============================================
# Database Fixtures
# ============================================

@pytest.fixture(scope="function")
def test_engine():
    """Return the shared test engine."""
    return _test_engine


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """Create a new database session for a test."""
    # Use scoped session which is thread-safe
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        try:
            # Rollback any uncommitted changes
            session.rollback()
            # Clean up test data
            session.execute(text("DELETE FROM compliance_checks"))
            session.execute(text("DELETE FROM risk_assessments"))
            session.execute(text("DELETE FROM analysis_results"))
            session.execute(text("DELETE FROM operator_feedback"))
            session.execute(text("DELETE FROM payment_documents"))
            session.commit()
        except Exception:
            pass  # Ignore cleanup errors in tests
        finally:
            TestingSessionLocal.remove()  # Remove scoped session


# ============================================
# FastAPI Test Client Fixtures
# ============================================

@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """Create a test client with dependency overrides."""
    
    def override_get_db():
        """Override get_db to use scoped test session (thread-safe)."""
        # Get session from scoped_session (creates per-thread)
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            pass  # Session cleanup handled by scoped_session
    
    def override_get_current_user():
        return {"user_id": "test-user-123", "email": "test@example.com"}
    
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()
    TestingSessionLocal.remove()  # Clean up scoped session


@pytest.fixture(scope="function")
async def async_client(db_session: Session) -> AsyncGenerator[AsyncClient, None]:
    """Create an async test client.
    
    Note: scope="function" must match db_session scope to avoid
    fixture scope incompatibility issues.
    """
    
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    def override_get_current_user():
        return {"user_id": "test-user-123", "email": "test@example.com"}
    
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


# ============================================
# Mock Service Fixtures
# ============================================

@pytest.fixture
def mock_llm_service() -> MagicMock:
    """Create a mock LLM service."""
    mock = MagicMock(spec=LLMService)
    mock.generate_completion = AsyncMock(return_value={
        "choices": [{
            "message": {
                "content": "Test response from LLM"
            }
        }]
    })
    mock.generate_embedding = AsyncMock(return_value=[0.1] * 768)
    mock.analyze_sentiment = AsyncMock(return_value={
        "sentiment": "neutral",
        "confidence": 0.85,
        "reasoning": "Test sentiment analysis"
    })
    return mock


@pytest.fixture
def mock_embedding_service() -> MagicMock:
    """Create a mock embedding service."""
    mock = MagicMock(spec=EmbeddingService)
    mock.generate_embedding = AsyncMock(return_value=[0.1] * 768)
    mock.generate_embeddings = AsyncMock(return_value=[[0.1] * 768, [0.2] * 768])
    return mock


@pytest.fixture
def mock_httpx_client():
    """Create a mock httpx client for external API calls."""
    mock = MagicMock()
    mock.post = AsyncMock()
    mock.get = AsyncMock()
    return mock


# ============================================
# Test Data Fixtures
# ============================================

@pytest.fixture
def sample_document_data() -> dict:
    """Sample document data for testing."""
    return {
        "type": "traditional",
        "format": "SWIFT",
        "customer_id": "550e8400-e29b-41d4-a716-446655440000",
        "raw_data": b"Sample SWIFT message content",
        "parsed_data": {
            "sender": "BANKUS33XXX",
            "receiver": "BANKEU22XXX",
            "amount": 10000.00,
            "currency": "USD",
            "reference": "REF123456"
        }
    }


@pytest.fixture
def sample_compliance_check_data() -> dict:
    """Sample compliance check data for testing."""
    return {
        "document_id": "550e8400-e29b-41d4-a716-446655440001",
        "check_type": "sanctions",
        "entities": ["ACME Corp", "John Doe"],
        "countries": ["US", "DE"]
    }


@pytest.fixture
def sample_risk_assessment_data() -> dict:
    """Sample risk assessment data for testing."""
    return {
        "document_id": "550e8400-e29b-41d4-a716-446655440002",
        "transaction_amount": 50000.00,
        "currency": "EUR",
        "sender_country": "US",
        "receiver_country": "CH"
    }


@pytest.fixture
def sample_knowledge_source_data() -> dict:
    """Sample knowledge source data for testing."""
    return {
        "name": "Test Compliance Rules",
        "source_type": "manual",
        "description": "Test knowledge source for unit tests",
        "is_active": True,
        "metadata": {"category": "test"}
    }


@pytest.fixture
def sample_feedback_data() -> dict:
    """Sample operator feedback data for testing."""
    return {
        "document_id": "550e8400-e29b-41d4-a716-446655440003",
        "rating": 4,
        "feedback_type": "accuracy",
        "comment": "Good analysis, minor improvements needed",
        "corrected_data": None
    }


# ============================================
# Utility Fixtures
# ============================================

@pytest.fixture
def mock_uuid():
    """Return a consistent UUID for testing."""
    return "550e8400-e29b-41d4-a716-446655440000"


@pytest.fixture
def auth_headers() -> dict:
    """Return authentication headers for API tests."""
    return {
        "Authorization": "Bearer test-token-12345",
        "Content-Type": "application/json"
    }
