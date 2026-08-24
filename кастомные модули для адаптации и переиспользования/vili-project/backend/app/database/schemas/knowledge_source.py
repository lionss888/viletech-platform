"""Pydantic schemas for Knowledge Sources"""

from datetime import datetime, timedelta
from typing import Optional, Any, Dict
from uuid import UUID
from pydantic import BaseModel, Field, validator


class KnowledgeSourceBase(BaseModel):
    """Base schema for Knowledge Source"""
    name: str = Field(..., min_length=1, max_length=255)
    source_type: str = Field(..., pattern="^(url|file|api|manual)$")
    source_url: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True
    auto_refresh: bool = False
    refresh_interval: Optional[str] = None  # ISO 8601 duration format
    source_metadata: Optional[Dict[str, Any]] = None
    category: Optional[str] = Field(None, max_length=100, description="Категория знаний: project_management, compliance, etc.")
    owner_only: bool = Field(False, description="Доступ только для владельца (created_by)")


class KnowledgeSourceCreate(KnowledgeSourceBase):
    """Schema for creating a Knowledge Source"""
    file_format: Optional[str] = None
    
    @validator('source_url')
    def validate_url(cls, v, values):
        """Validate URL is provided for url type"""
        if values.get('source_type') == 'url' and not v:
            raise ValueError('source_url is required for url type sources')
        return v


class KnowledgeSourceUpdate(BaseModel):
    """Schema for updating a Knowledge Source"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    auto_refresh: Optional[bool] = None
    refresh_interval: Optional[str] = None
    source_metadata: Optional[Dict[str, Any]] = None
    category: Optional[str] = Field(None, max_length=100)
    owner_only: Optional[bool] = None


class KnowledgeSourceResponse(KnowledgeSourceBase):
    """Schema for Knowledge Source response"""
    id: UUID
    file_path: Optional[str] = None
    file_format: Optional[str] = None
    last_refreshed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None
    chunks_count: Optional[int] = 0
    
    class Config:
        from_attributes = True


class KnowledgeChunkResponse(BaseModel):
    """Schema for Knowledge Chunk response"""
    id: UUID
    source_id: UUID
    content: str
    content_type: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class KnowledgeSearchRequest(BaseModel):
    """Schema for knowledge search request"""
    query: str = Field(..., min_length=1)
    source_ids: Optional[list[UUID]] = None
    top_k: int = Field(5, ge=1, le=20)
    min_similarity: float = Field(0.7, ge=0.0, le=1.0)


class KnowledgeSearchResult(BaseModel):
    """Schema for knowledge search result"""
    id: UUID
    source_id: UUID
    source_name: str
    content: str
    content_type: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    similarity: float
    category: Optional[str] = None
    
    class Config:
        from_attributes = True


class KnowledgeSourceList(BaseModel):
    """Schema for paginated list of Knowledge Sources"""
    items: list[KnowledgeSourceResponse]
    total: int
    page: int = 1
    size: int = 10
    pages: int = 1


class KnowledgeSourceUpload(BaseModel):
    """Schema for Knowledge Source file upload response"""
    id: UUID
    name: str
    source_type: str
    file_path: str
    file_format: str
    status: str = "processing"
    message: str = "File uploaded successfully, processing started"
