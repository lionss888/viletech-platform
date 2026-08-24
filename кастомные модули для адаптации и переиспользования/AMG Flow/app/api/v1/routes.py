"""API routes for v1 endpoints."""

import json
import time
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.db.session import get_db
from app.db.crud import message_crud
from app.ollama_client import ollama_client
from app.prompts import get_system_prompt
from app.utils.logging import get_request_id, set_request_id
from app.utils.errors import APIError, OllamaError, ValidationError
from app.api.v1.schemas import (
    HealthResponse,
    OllamaHealthResponse,
    DatabaseHealthResponse,
    ModelsResponse,
    ModelInfo,
    ChatRequest,
    ChatResponse,
    ChatStreamResponse,
    WorkflowRequest,
    WorkflowResponse,
    HistoryResponse,
    MessageResponse,
    AssistParseRequest,
    AssistParseResponse,
    ReleaseInfo,
    ReleaseResponse,
    ReleasesResponse,
    ModelEvalRequest,
    ModelEvalResponse
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
    """Get available models from Ollama."""
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


@router.post("/ask")
async def ask_question(
    request: ChatRequest,
    http_request: Request,
    db: Session = Depends(get_db)
):
    """Ask a question to the model."""
    request_id = get_request_id()
    start_time = time.time()
    
    # Initialize analytics tracker
    tracker = AnalyticsTracker(db)
    
    # Extract session info from request
    session_id = getattr(request, 'session_id', request_id)
    user_id = getattr(request, 'user_id', None)
    ip_address = http_request.client.host if http_request.client else None
    user_agent = http_request.headers.get("user-agent")
    
    # Start or get session
    try:
        session = tracker.start_session(
            session_id=session_id,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        # Continue without analytics if tracking fails
        session = None
    
    # Prepare messages for processing
    messages = [msg.dict() for msg in request.messages]
    
    # Enhance with RAG + Smart Prompts if enabled
    if hasattr(request, 'use_rag') and request.use_rag:
        try:
            # Get the last user message for context search
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
                logger.debug(f"Enhanced with RAG + Smart Prompts: {use_smart_prompts}")
        except Exception as e:
            # If RAG fails, continue with original messages
            logger.warning(f"RAG enhancement failed: {str(e)}")
            pass
    else:
        # Add system prompt if not present (fallback for non-RAG mode)
        if not any(msg["role"] == "system" for msg in messages):
            system_prompt = get_system_prompt(request.system_prompt_type)
            messages.insert(0, {
                "role": "system",
                "content": system_prompt
            })
    
    # Track user message
    if session:
        try:
            user_message = next((msg for msg in request.messages if msg.role == "user"), None)
            if user_message:
                tracker.track_message_sent(
                    session_id=session_id,
                    conversation_id=request.convo_id,
                    message_content=user_message.content,
                    model_used=request.model,
                    metadata={"use_rag": getattr(request, 'use_rag', False)}
                )
        except Exception as e:
            # Continue if tracking fails
            pass
    
    try:
        if request.stream:
            return StreamingResponse(
                _stream_chat_response(request, messages, request_id, db),
                media_type="text/plain",
                headers={"X-Request-ID": request_id}
            )
        else:
            return await _non_stream_chat_response(request, messages, request_id, db)
    except OllamaError as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {e.message}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


async def _stream_chat_response(
    request: ChatRequest,
    messages: list,
    request_id: str,
    db: Session
):
    """Stream chat response."""
    full_content = ""
    start_time = time.time()
    
    # Initialize analytics tracker
    tracker = AnalyticsTracker(db)
    session_id = getattr(request, 'session_id', request_id)
    
    try:
        async for chunk in ollama_client.chat(request.model, messages, stream=True):
            if chunk.get("message", {}).get("content"):
                content = chunk["message"]["content"]
                full_content += content
                
                # Send chunk to client
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
        
        # Calculate response time
        response_time_ms = int((time.time() - start_time) * 1000)
        
        # Save complete response to database
        if full_content:
            message_crud.create(
                db=db,
                convo_id=request.convo_id,
                role="assistant",
                content=full_content,
                meta={"request_id": request_id, "model": request.model}
            )
            
            # Track assistant response
            try:
                tracker.track_message_received(
                    session_id=session_id,
                    conversation_id=request.convo_id,
                    message_content=full_content,
                    response_time_ms=response_time_ms,
                    model_used=request.model,
                    metadata={"streaming": True, "use_rag": getattr(request, 'use_rag', False)}
                )
            except Exception as e:
                # Continue if tracking fails
                pass
            
    except Exception as e:
        # Track error
        try:
            tracker.track_error(
                session_id=session_id,
                conversation_id=request.convo_id,
                error_type="stream_error",
                error_message=str(e)
            )
        except:
            pass
            
        error_data = {
            "error": {
                "type": "stream_error",
                "message": str(e),
                "request_id": request_id
            }
        }
        yield f"data: {json.dumps(error_data)}\n\n"


async def _non_stream_chat_response(
    request: ChatRequest,
    messages: list,
    request_id: str,
    db: Session
) -> ChatResponse:
    """Non-streaming chat response."""
    full_content = ""
    
    async for chunk in ollama_client.chat(request.model, messages, stream=True):
        if chunk.get("message", {}).get("content"):
            full_content += chunk["message"]["content"]
        
        if chunk.get("done"):
            break
    
    # Save response to database
    if full_content:
        message_crud.create(
            db=db,
            convo_id=request.convo_id,
            role="assistant",
            content=full_content,
            meta={"request_id": request_id, "model": request.model}
        )
    
    return ChatResponse(
        model=request.model,
        message={
            "role": "assistant",
            "content": full_content
        },
        conversation_id=request.convo_id,
        request_id=request_id
    )


@router.post("/run_workflow", response_model=WorkflowResponse)
async def run_workflow(
    request: WorkflowRequest,
    http_request: Request
):
    """Run a workflow (stub implementation)."""
    request_id = get_request_id()
    
    # Stub implementation - echo back the request
    result = {
        "echo": f"Workflow '{request.name}' received",
        "params": request.params,
        "status": "TODO - Not implemented yet",
        "timestamp": "2025-01-01T00:00:00Z"
    }
    
    return WorkflowResponse(
        name=request.name,
        status="echo",
        result=result,
        request_id=request_id
    )


@router.get("/history", response_model=HistoryResponse)
async def get_history(
    convo_id: str,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get conversation history."""
    try:
        messages = message_crud.get_by_convo_id(db, convo_id, limit, offset)
        total = message_crud.count_by_convo_id(db, convo_id)
        
        message_responses = [
            MessageResponse(
                id=msg.id,
                created_at=msg.created_at,
                convo_id=msg.convo_id,
                role=msg.role,
                content=msg.content,
                meta=msg.meta
            )
            for msg in messages
        ]
        
        return HistoryResponse(
            messages=message_responses,
            total=total,
            limit=limit,
            offset=offset,
            conversation_id=convo_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/assist/parse", response_model=AssistParseResponse)
async def assist_parse(
    request: AssistParseRequest,
    http_request: Request,
    db: Session = Depends(get_db)
):
    """Parse text using AI assistant with structured output."""
    request_id = get_request_id()
    
    # Use provided model or default
    model = request.model or "llama3.2:3b-instruct-q4_0"
    
    # Prepare prompt for structured parsing
    system_prompt = request.prompt_override or f"""
You are a helpful assistant that extracts structured data from text.
Return ONLY valid JSON with the following structure:
{{
    "fields": {{
        "field1": "value1",
        "field2": "value2"
    }},
    "confidence": 0.95
}}

Extract relevant information from: {request.text}
"""
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": request.text}
    ]
    
    try:
        # Get AI response
        full_content = ""
        async for chunk in ollama_client.chat(model, messages, stream=True):
            if chunk.get("message", {}).get("content"):
                full_content += chunk["message"]["content"]
            if chunk.get("done"):
                break
        
        # Parse JSON response
        import json
        try:
            parsed_json = json.loads(full_content)
            parsed_data = parsed_json.get("fields", {})
            confidence = parsed_json.get("confidence", 0.8)
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            parsed_data = {"raw_text": full_content}
            confidence = 0.5
        
        # Save to database
        message_crud.create(
            db=db,
            convo_id=request.convo_id,
            role="assistant",
            content=full_content,
            meta={
                "request_id": request_id,
                "model": model,
                "type": "assist_parse",
                "parsed_data": parsed_data,
                "confidence": confidence
            }
        )
        
        return AssistParseResponse(
            parsed_data=parsed_data,
            confidence=confidence,
            model_used=model,
            request_id=request_id,
            conversation_id=request.convo_id
        )
        
    except OllamaError as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {e.message}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parsing error: {str(e)}")


@router.get("/releases", response_model=ReleasesResponse)
async def get_releases(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None
):
    """Get list of releases."""
    # Mock implementation - in real app this would query database
    releases = [
        ReleaseInfo(
            id="1",
            name="myco/ops-logistics",
            version="1.0.0",
            status="stable",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            description="Initial release"
        ),
        ReleaseInfo(
            id="2", 
            name="myco/ops-logistics",
            version="1.1.0-rc1",
            status="candidate",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            description="Release candidate"
        )
    ]
    
    # Filter by status if provided
    if status:
        releases = [r for r in releases if r.status == status]
    
    return ReleasesResponse(
        releases=releases[offset:offset+limit],
        total=len(releases),
        limit=limit,
        offset=offset
    )


@router.get("/releases/{release_id}", response_model=ReleaseResponse)
async def get_release(release_id: str):
    """Get specific release by ID."""
    # Mock implementation
    release = ReleaseInfo(
        id=release_id,
        name="myco/ops-logistics",
        version="1.0.0",
        status="stable",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        description="Release details"
    )
    
    return ReleaseResponse(release=release)


@router.post("/eval", response_model=ModelEvalResponse)
async def run_model_evaluation(
    request: ModelEvalRequest,
    http_request: Request
):
    """Run model evaluation."""
    request_id = get_request_id()
    
    # Mock implementation - in real app this would run actual evaluation
    metrics = {
        "accuracy": 0.95,
        "latency": 1.2,
        "throughput": 10.5
    }
    
    return ModelEvalResponse(
        model_tag=request.model_tag,
        metrics=metrics,
        total_samples=100,
        completed_at=datetime.utcnow(),
        request_id=request_id
    )
