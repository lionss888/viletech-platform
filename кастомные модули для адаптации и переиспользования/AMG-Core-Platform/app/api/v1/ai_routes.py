"""AI API routes - только AI обработка."""

import json
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.ai.chat_processor import ai_chat_processor, ChatRequest
from app.utils.errors import OllamaError, ValidationError
from app.utils.logging import set_request_id

router = APIRouter()


@router.post("/ai/chat")
async def process_ai_chat(request: ChatRequest, http_request: Request):
    """Обрабатывает AI чат запрос."""
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
        
        # Обрабатываем через AI процессор
        if request.stream:
            # Стриминговый ответ
            return StreamingResponse(
                ai_chat_processor.process_chat_stream(request),
                media_type="text/plain",
                headers={"X-Request-ID": request_id or ""}
            )
        else:
            # Обычный ответ
            response = await ai_chat_processor.process_chat(request)
            return response.dict()
            
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except OllamaError as e:
        raise HTTPException(status_code=502, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/ai/enhance-prompt")
async def enhance_prompt(data: Dict[str, Any]):
    """Улучшает промпт с помощью AI."""
    try:
        prompt = data.get("prompt")
        if not prompt:
            raise ValidationError("Prompt is required")
        
        # Используем AI процессор для улучшения
        enhanced = await ai_chat_processor._enhance_prompt(prompt)
        
        return {
            "original_prompt": prompt,
            "enhanced_prompt": enhanced,
            "improvement": "Added structure and clarity"
        }
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/ai/models")
async def get_ai_models():
    """Получает список доступных AI моделей."""
    try:
        from app.ollama_client import ollama_client
        
        response = await ollama_client.get_models()
        models = []
        
        for model in response.get("models", []):
            models.append({
                "name": model.get("name"),
                "size": model.get("size", 0),
                "modified_at": model.get("modified_at"),
                "details": model.get("details", {}),
                "capabilities": ["chat", "completion"]
            })
        
        return {
            "models": models,
            "total": len(models)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get models: {str(e)}")


@router.post("/ai/rag/search")
async def search_rag(data: Dict[str, Any]):
    """Поиск в RAG системе."""
    try:
        query = data.get("query")
        conversation_id = data.get("conversation_id")
        limit = data.get("limit", 5)
        
        if not query:
            raise ValidationError("Query is required")
        
        from app.learning.rag_system import rag_system
        
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
        
        from app.learning.rag_system import rag_system
        
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
        from app.learning.rag_system import rag_system
        
        stats = await rag_system.get_stats()
        
        return {
            "total_messages": stats.get("total_messages", 0),
            "total_conversations": stats.get("total_conversations", 0),
            "total_embeddings": stats.get("total_embeddings", 0),
            "last_updated": stats.get("last_updated")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get RAG stats: {str(e)}")
