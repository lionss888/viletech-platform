"""API routes - только AI и аналитика (без бизнес-логики)."""

import time
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.db.session import get_db
from app.ollama_client import ollama_client
from app.utils.errors import OllamaError
from app.api.v1.schemas import (
    HealthResponse,
    OllamaHealthResponse,
    DatabaseHealthResponse,
)

# Импортируем новые AI и Analytics routes
from app.api.v1.ai_routes import router as ai_router
from app.api.v1.analytics_routes_new import router as analytics_router

router = APIRouter()

# Подключаем AI и Analytics маршруты
router.include_router(ai_router, tags=["AI"])
router.include_router(analytics_router, tags=["Analytics"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse()


@router.get("/health/ollama", response_model=OllamaHealthResponse)
async def ollama_health_check():
    """Ollama health check endpoint."""
    try:
        result = await ollama_client.ping()
        return OllamaHealthResponse(**result)
    except OllamaError as e:
        return OllamaHealthResponse(
            ok=False,
            host=settings.ollama_host,
            error=e.message
        )


@router.get("/health/db", response_model=DatabaseHealthResponse)
async def database_health_check():
    """Database health check endpoint."""
    import time
    from sqlalchemy import text
    from app.db.session import engine
    
    start_time = time.time()
    
    try:
        # Test connection with a simple query
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            conn.commit()
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        return DatabaseHealthResponse(
            ok=True,
            latency_ms=latency_ms
        )
        
    except Exception as e:
        return DatabaseHealthResponse(
            ok=False,
            error=str(e)
        )


@router.get("/status")
async def get_status():
    """Получает статус системы."""
    try:
        # Проверяем Ollama
        ollama_ok = True
        try:
            await ollama_client.ping()
        except:
            ollama_ok = False
        
        # Проверяем БД
        db_ok = True
        try:
            from sqlalchemy import text
            from app.db.session import engine
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
        except:
            db_ok = False
        
        return {
            "status": "ok" if (ollama_ok and db_ok) else "degraded",
            "services": {
                "ollama": "ok" if ollama_ok else "error",
                "database": "ok" if db_ok else "error",
                "api": "ok"
            },
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0"
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


@router.get("/info")
async def get_info():
    """Получает информацию о системе."""
    return {
        "name": "AMG Flow AI & Analytics API",
        "description": "AI обработка и аналитика для AMG Flow",
        "version": "1.0.0",
        "capabilities": [
            "AI Chat Processing",
            "RAG System",
            "Smart Prompts",
            "Analytics Tracking",
            "Performance Monitoring"
        ],
        "endpoints": {
            "ai": {
                "chat": "/ai/chat",
                "enhance_prompt": "/ai/enhance-prompt",
                "models": "/ai/models",
                "rag_search": "/ai/rag/search",
                "rag_add": "/ai/rag/add",
                "rag_stats": "/ai/rag/stats"
            },
            "analytics": {
                "track": "/analytics/track",
                "daily": "/analytics/daily",
                "user": "/analytics/user/{user_id}",
                "conversation": "/analytics/conversation/{conversation_id}",
                "models": "/analytics/models",
                "performance": "/analytics/performance",
                "export": "/analytics/export",
                "summary": "/analytics/summary"
            },
            "health": {
                "api": "/health",
                "ollama": "/health/ollama",
                "database": "/health/db"
            }
        }
    }
