"""Pydantic schemas for API requests and responses."""

from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field


# Health check schemas
class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ok"
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class OllamaHealthResponse(BaseModel):
    """Ollama health check response."""
    ok: bool
    host: str
    latency_ms: Optional[int] = None
    error: Optional[str] = None


class DatabaseHealthResponse(BaseModel):
    """Database health check response."""
    ok: bool
    latency_ms: Optional[int] = None
    error: Optional[str] = None


# Model schemas
class ModelInfo(BaseModel):
    """Model information."""
    name: str
    size: int
    modified_at: str = Field(alias="modified_at")


class ModelsResponse(BaseModel):
    """Models list response."""
    models: List[ModelInfo]


# Chat schemas
class ChatMessage(BaseModel):
    """Chat message."""
    role: str = Field(..., description="Message role: user, assistant, system")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Chat request."""
    model: str = Field(..., description="Model name")
    messages: List[ChatMessage] = Field(..., description="Chat messages")
    convo_id: str = Field(..., description="Conversation ID")
    stream: bool = Field(default=True, description="Enable streaming")
    system_prompt_type: str = Field(default="default", description="System prompt type")
    use_rag: bool = Field(default=False, description="Use RAG for context enhancement")
    use_smart_prompts: bool = Field(default=True, description="Use smart context-aware prompts")


class ChatResponse(BaseModel):
    """Chat response (non-streaming)."""
    model: str
    message: ChatMessage
    conversation_id: str
    request_id: str


class ChatStreamResponse(BaseModel):
    """Chat streaming response."""
    model: str
    message: Optional[ChatMessage] = None
    done: bool = False
    request_id: str


# Workflow schemas
class WorkflowRequest(BaseModel):
    """Workflow execution request."""
    name: str = Field(..., description="Workflow name")
    params: Dict[str, Any] = Field(default_factory=dict, description="Workflow parameters")


class WorkflowResponse(BaseModel):
    """Workflow execution response."""
    name: str
    status: str
    result: Dict[str, Any]
    request_id: str


# History schemas
class MessageResponse(BaseModel):
    """Message response."""
    id: UUID
    created_at: datetime
    convo_id: str
    role: str
    content: str
    meta: Optional[Dict[str, Any]] = None


class HistoryResponse(BaseModel):
    """History response."""
    messages: List[MessageResponse]
    total: int
    limit: int
    offset: int
    conversation_id: str


# Assist schemas
class AssistParseRequest(BaseModel):
    """Assist parse request."""
    text: str = Field(..., description="Text to parse")
    model: Optional[str] = Field(None, description="Model to use")
    prompt_override: Optional[str] = Field(None, description="Custom prompt override")
    gen_opts: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Generation options")
    convo_id: str = Field(..., description="Conversation ID")


class AssistParseResponse(BaseModel):
    """Assist parse response."""
    parsed_data: Dict[str, Any]
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score")
    model_used: str
    request_id: str
    conversation_id: str


# Release schemas
class ReleaseInfo(BaseModel):
    """Release information."""
    id: str
    name: str
    version: str
    status: str
    created_at: datetime
    updated_at: datetime
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ReleaseResponse(BaseModel):
    """Release response."""
    release: ReleaseInfo


class ReleasesResponse(BaseModel):
    """Releases list response."""
    releases: List[ReleaseInfo]
    total: int
    limit: int
    offset: int


# Model evaluation schemas
class ModelEvalRequest(BaseModel):
    """Model evaluation request."""
    model_tag: str = Field(..., description="Model tag to evaluate")
    data_file: str = Field(..., description="Path to evaluation data")
    metrics: List[str] = Field(default_factory=lambda: ["accuracy", "latency"], description="Metrics to compute")


class ModelEvalResponse(BaseModel):
    """Model evaluation response."""
    model_tag: str
    metrics: Dict[str, float]
    total_samples: int
    completed_at: datetime
    request_id: str


# Error schemas
class ErrorDetail(BaseModel):
    """Error detail."""
    type: str
    message: str
    details: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Error response."""
    error: ErrorDetail
    request_id: Optional[str] = None
