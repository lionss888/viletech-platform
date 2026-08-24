"""Health check API endpoints"""

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.dependencies import get_db
from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Базовый health check
    """
    return {
        "status": "healthy",
        "version": "1.0.0",
        "service": "VILI Payment Assistant"
    }


@router.get("/health/detailed")
async def detailed_health_check(db: Session = Depends(get_db)):
    """
    Детальный health check с проверкой всех компонентов
    """
    health_status = {
        "status": "healthy",
        "version": "1.0.0",
        "services": {}
    }
    
    # Проверка БД
    try:
        db.execute(text("SELECT 1"))
        health_status["services"]["database"] = {
            "status": "healthy",
            "message": "Database connection successful"
        }
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["services"]["database"] = {
            "status": "unhealthy",
            "message": f"Database connection failed: {str(e)}"
        }
    
    # Проверка pgvector расширения
    try:
        result = db.execute(text("SELECT extname FROM pg_extension WHERE extname = 'vector'"))
        if result.fetchone():
            health_status["services"]["pgvector"] = {
                "status": "healthy",
                "message": "pgvector extension installed"
            }
        else:
            health_status["services"]["pgvector"] = {
                "status": "warning",
                "message": "pgvector extension not found"
            }
    except Exception as e:
        health_status["services"]["pgvector"] = {
            "status": "warning",
            "message": f"Could not check pgvector: {str(e)}"
        }
    
    # Проверка LiteLLM
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.LITELLM_URL}/health")
            if response.status_code == 200:
                health_status["services"]["litellm"] = {
                    "status": "healthy",
                    "message": "LiteLLM is accessible",
                    "url": settings.LITELLM_URL
                }
            else:
                health_status["services"]["litellm"] = {
                    "status": "warning",
                    "message": f"LiteLLM returned status {response.status_code}",
                    "url": settings.LITELLM_URL
                }
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["services"]["litellm"] = {
            "status": "unhealthy",
            "message": f"LiteLLM not accessible: {str(e)}",
            "url": settings.LITELLM_URL
        }
    
    # Проверка Ollama (через Nginx LB)
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.OLLAMA_URL}/api/tags")
            if response.status_code == 200:
                models = response.json().get("models", [])
                health_status["services"]["ollama"] = {
                    "status": "healthy",
                    "message": f"Ollama is accessible, {len(models)} models available",
                    "url": settings.OLLAMA_URL,
                    "models_count": len(models)
                }
            else:
                health_status["services"]["ollama"] = {
                    "status": "warning",
                    "message": f"Ollama returned status {response.status_code}",
                    "url": settings.OLLAMA_URL
                }
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["services"]["ollama"] = {
            "status": "unhealthy",
            "message": f"Ollama not accessible: {str(e)}",
            "url": settings.OLLAMA_URL
        }
    
    # Проверка TGI (FinGPT)
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.TGI_URL}/health")
            if response.status_code == 200:
                health_status["services"]["tgi_fingpt"] = {
                    "status": "healthy",
                    "message": "TGI (FinGPT) is accessible",
                    "url": settings.TGI_URL
                }
            else:
                health_status["services"]["tgi_fingpt"] = {
                    "status": "warning",
                    "message": f"TGI returned status {response.status_code}",
                    "url": settings.TGI_URL
                }
    except Exception as e:
        # TGI может быть недоступен если не используется GPU
        health_status["services"]["tgi_fingpt"] = {
            "status": "warning",
            "message": f"TGI not accessible (may be disabled): {str(e)}",
            "url": settings.TGI_URL
        }
    
    return health_status


@router.get("/health/readiness")
async def readiness_check(db: Session = Depends(get_db)):
    """
    Readiness probe для Kubernetes
    Проверяет готовность приложения к приему трафика
    """
    try:
        # Проверяем только критичные компоненты
        db.execute(text("SELECT 1"))
        
        return {
            "status": "ready",
            "message": "Application is ready to accept traffic"
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Application not ready: {str(e)}"
        )


@router.get("/health/liveness")
async def liveness_check():
    """
    Liveness probe для Kubernetes
    Проверяет, что приложение живое и не зависло
    """
    return {
        "status": "alive",
        "message": "Application is running"
    }


@router.get("/health/stats")
async def health_stats(db: Session = Depends(get_db)):
    """
    Статистика системы
    """
    try:
        # Получаем статистику из БД
        stats = {}
        
        # Количество источников знаний
        result = db.execute(text("SELECT COUNT(*) FROM knowledge_sources WHERE is_active = true"))
        stats["active_knowledge_sources"] = result.scalar()
        
        # Количество chunks
        result = db.execute(text("SELECT COUNT(*) FROM knowledge_chunks"))
        stats["knowledge_chunks"] = result.scalar()
        
        # Количество документов
        result = db.execute(text("SELECT COUNT(*) FROM payment_documents"))
        stats["total_documents"] = result.scalar()
        
        # Количество compliance проверок
        result = db.execute(text("SELECT COUNT(*) FROM compliance_checks"))
        stats["total_compliance_checks"] = result.scalar()
        
        return {
            "status": "success",
            "stats": stats
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to get stats: {str(e)}"
        }
