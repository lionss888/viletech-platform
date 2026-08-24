"""AI-only API routes - только AI обработка и аналитика."""

import json
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.db.session import get_db
from app.ollama_client import ollama_client
from app.utils.logging import set_request_id
from app.utils.errors import OllamaError, ValidationError
from app.api.v1.schemas import (
    HealthResponse,
    OllamaHealthResponse,
    DatabaseHealthResponse,
    ModelsResponse,
    ModelInfo,
    ChatRequest,
    ChatResponse,
    ChatStreamResponse
)
from app.learning.rag_system import rag_system
from app.analytics.tracker import AnalyticsTracker

router = APIRouter()


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


@router.get("/models", response_model=ModelsResponse)
async def get_models():
    """Get available AI models from Ollama."""
    try:
        response = await ollama_client.get_models()
        models = [
            ModelInfo(
                name=model["name"],
                size=model["size"],
                modified_at=model["modified_at"]
            )
            for model in response.get("models", [])
        ]
        return ModelsResponse(models=models)
    except OllamaError as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {e.message}")


@router.post("/ai/chat")
async def process_ai_chat(
    request: ChatRequest, 
    http_request: Request,
    db: Session = Depends(get_db)
):
    """Обрабатывает AI чат запрос - только AI обработка."""
    try:
        # Устанавливаем request ID
        request_id = http_request.headers.get("X-Request-ID")
        if request_id:
            set_request_id(request_id)
        
        # Валидируем запрос
        if not request.messages:
            raise ValidationError("Messages are required")
        
        if not request.model:
            raise ValidationError("Model is required")
        
        # Подготавливаем сообщения для AI обработки
        messages = [msg.dict() for msg in request.messages]
        
        # Улучшаем промпт с помощью RAG если включено
        if hasattr(request, 'use_rag') and request.use_rag:
            try:
                user_messages = [msg for msg in messages if msg["role"] == "user"]
                if user_messages:
                    last_user_message = user_messages[-1]["content"]
                    use_smart_prompts = getattr(request, 'use_smart_prompts', True)
                    enhanced_messages = await rag_system.get_enhanced_prompt(
                        messages, 
                        last_user_message, 
                        use_smart_prompts=use_smart_prompts
                    )
                    messages = enhanced_messages
            except Exception as e:
                # Если RAG не работает, продолжаем с оригинальными сообщениями
                pass
        
        # Обрабатываем через AI
        if request.stream:
            # Стриминговый ответ
            return StreamingResponse(
                _stream_ai_response(request, messages, request_id),
                media_type="text/plain",
                headers={"X-Request-ID": request_id or ""}
            )
        else:
            # Обычный ответ
            response = await _process_ai_response(request, messages, request_id)
            return response.dict()
            
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except OllamaError as e:
        raise HTTPException(status_code=502, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing error: {str(e)}")


async def _stream_ai_response(request: ChatRequest, messages: list, request_id: str):
    """Стриминговый AI ответ."""
    try:
        async for chunk in ollama_client.chat(request.model, messages, stream=True):
            if chunk.get("message", {}).get("content"):
                content = chunk["message"]["content"]
                
                # Отправляем чанк клиенту
                chunk_data = {
                    "model": chunk.get("model", request.model),
                    "message": {
                        "role": "assistant",
                        "content": content
                    },
                    "done": chunk.get("done", False),
                    "request_id": request_id
                }
                yield f"data: {json.dumps(chunk_data)}\n\n"
            
            if chunk.get("done"):
                break
                
    except Exception as e:
        error_data = {
            "error": {
                "type": "ai_error",
                "message": str(e),
                "request_id": request_id
            }
        }
        yield f"data: {json.dumps(error_data)}\n\n"


async def _process_ai_response(request: ChatRequest, messages: list, request_id: str) -> ChatResponse:
    """Обычный AI ответ."""
    full_content = ""
    
    async for chunk in ollama_client.chat(request.model, messages, stream=True):
        if chunk.get("message", {}).get("content"):
            full_content += chunk["message"]["content"]
        
        if chunk.get("done"):
            break
    
    return ChatResponse(
        model=request.model,
        message={
            "role": "assistant",
            "content": full_content
        },
        conversation_id=request.convo_id,
        request_id=request_id
    )


@router.post("/ai/enhance-prompt")
async def enhance_prompt(data: Dict[str, Any]):
    """Улучшает промпт с помощью AI."""
    try:
        prompt = data.get("prompt")
        if not prompt:
            raise ValidationError("Prompt is required")
        
        # Используем AI для улучшения промпта
        messages = [
            {"role": "system", "content": "You are a prompt engineering expert. Improve the given prompt to be more clear, specific, and effective."},
            {"role": "user", "content": f"Improve this prompt: {prompt}"}
        ]
        
        enhanced = ""
        async for chunk in ollama_client.chat("llama3.2:3b-instruct-q4_0", messages, stream=True):
            if chunk.get("message", {}).get("content"):
                enhanced += chunk["message"]["content"]
            if chunk.get("done"):
                break
        
        return {
            "original_prompt": prompt,
            "enhanced_prompt": enhanced,
            "improvement": "AI-enhanced for clarity and effectiveness"
        }
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prompt enhancement error: {str(e)}")


@router.post("/ai/rag/search")
async def search_rag(data: Dict[str, Any]):
    """Поиск в RAG системе."""
    try:
        query = data.get("query")
        conversation_id = data.get("conversation_id")
        limit = data.get("limit", 5)
        
        if not query:
            raise ValidationError("Query is required")
        
        results = await rag_system.search(
            query=query,
            conversation_id=conversation_id,
            limit=limit
        )
        
        return {
            "results": results,
            "total": len(results),
            "query": query
        }
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG search failed: {str(e)}")


@router.post("/ai/rag/add")
async def add_to_rag(data: Dict[str, Any]):
    """Добавляет сообщение в RAG систему."""
    try:
        conversation_id = data.get("conversation_id")
        role = data.get("role")
        content = data.get("content")
        metadata = data.get("metadata", {})
        
        if not all([conversation_id, role, content]):
            raise ValidationError("conversation_id, role, and content are required")
        
        await rag_system.add_message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            metadata=metadata
        )
        
        return {
            "success": True,
            "message": "Added to RAG system"
        }
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add to RAG: {str(e)}")


@router.get("/ai/rag/stats")
async def get_rag_stats():
    """Получает статистику RAG системы."""
    try:
        stats = await rag_system.get_stats()
        
        return {
            "total_messages": stats.get("total_messages", 0),
            "total_conversations": stats.get("total_conversations", 0),
            "total_embeddings": stats.get("total_embeddings", 0),
            "last_updated": stats.get("last_updated")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get RAG stats: {str(e)}")


@router.post("/analytics/track")
async def track_analytics_event(data: Dict[str, Any], db: Session = Depends(get_db)):
    """Отслеживает аналитическое событие."""
    try:
        session_id = data.get("session_id")
        conversation_id = data.get("conversation_id")
        event_type = data.get("event_type")
        event_data = data.get("data", {})
        
        if not all([session_id, event_type]):
            raise ValidationError("session_id and event_type are required")
        
        # Создаем трекер
        tracker = AnalyticsTracker(db)
        
        # Отслеживаем событие
        await tracker.track_event(
            session_id=session_id,
            conversation_id=conversation_id,
            event_type=event_type,
            data=event_data
        )
        
        return {
            "success": True,
            "message": "Event tracked successfully"
        }
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to track event: {str(e)}")


@router.get("/analytics/daily")
async def get_daily_analytics(
    date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Получает ежедневную аналитику."""
    try:
        from datetime import datetime
        
        # Парсим дату или используем сегодня
        if date:
            target_date = datetime.fromisoformat(date).date()
        else:
            target_date = datetime.now().date()
        
        tracker = AnalyticsTracker(db)
        
        # Получаем аналитику за день
        analytics = await tracker.get_daily_analytics(target_date)
        
        return {
            "date": target_date.isoformat(),
            "analytics": analytics
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get daily analytics: {str(e)}")


@router.get("/status")
async def get_status():
    """Получает статус AI системы."""
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
                "ai_api": "ok"
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
    """Получает информацию о AI системе."""
    return {
        "name": "AMG Flow AI & Analytics API",
        "description": "AI обработка и аналитика для AMG Flow (без бизнес-логики)",
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
                "models": "/models",
                "rag_search": "/ai/rag/search",
                "rag_add": "/ai/rag/add",
                "rag_stats": "/ai/rag/stats"
            },
            "analytics": {
                "track": "/analytics/track",
                "daily": "/analytics/daily"
            },
            "health": {
                "api": "/health",
                "ollama": "/health/ollama",
                "database": "/health/db"
            }
        }
    }
