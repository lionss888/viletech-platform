"""Pydantic schemas for documents"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID


# ============================================
# Payment Document Schemas
# ============================================

class PaymentDocumentBase(BaseModel):
    """Базовая схема документа"""
    type: str = Field(..., description="Document type: 'traditional' or 'crypto'")
    format: str = Field(..., description="Document format: 'SWIFT', 'PDF', 'JSON', 'blockchain'")


class PaymentDocumentCreate(PaymentDocumentBase):
    """Схема создания документа"""
    customer_id: UUID
    operator_id: Optional[UUID] = None
    parsed_data: Optional[Dict[str, Any]] = None


class PaymentDocumentUpdate(BaseModel):
    """Схема обновления документа"""
    status: Optional[str] = None
    parsed_data: Optional[Dict[str, Any]] = None
    operator_id: Optional[UUID] = None


class PaymentDocumentResponse(PaymentDocumentBase):
    """Схема ответа с данными документа"""
    id: UUID
    status: str
    parsed_data: Optional[Dict[str, Any]] = None
    operator_id: Optional[UUID] = None
    customer_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaymentDocumentList(BaseModel):
    """Схема списка документов"""
    total: int
    documents: List[PaymentDocumentResponse]
    skip: int
    limit: int


# ============================================
# Document Upload Schemas
# ============================================

class DocumentUploadResponse(BaseModel):
    """Ответ при загрузке документа"""
    document_id: UUID
    status: str
    format: str
    type: str
    message: str


# ============================================
# Analysis Schemas
# ============================================

class AnalysisResultBase(BaseModel):
    """Базовая схема результата анализа"""
    analysis_type: str = Field(..., description="Type: 'document', 'compliance', 'risk', 'sentiment'")
    result_data: Dict[str, Any]
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    model_version: Optional[str] = None


class AnalysisResultCreate(AnalysisResultBase):
    """Схема создания результата анализа"""
    document_id: UUID
    duration_ms: int
    success: bool = True
    error_message: Optional[str] = None


class AnalysisResultResponse(AnalysisResultBase):
    """Схема ответа с результатом анализа"""
    id: UUID
    document_id: UUID
    duration_ms: int
    success: bool
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentAnalysisRequest(BaseModel):
    """Запрос на анализ документа"""
    document_type: str = Field("traditional", description="Document type: 'traditional' or 'crypto'")
    include_compliance: bool = Field(False, description="Include compliance checks")
    include_risk: bool = Field(False, description="Include risk assessment")
    use_rag: bool = Field(True, description="Use RAG for analysis")


class DocumentAnalysisResponse(BaseModel):
    """Ответ с результатами анализа документа"""
    document_id: UUID
    status: str
    analysis: Dict[str, Any]
    confidence: float
    entities: List[Dict[str, Any]]
    sentiment: str
    compliance_checks: Optional[List[Dict[str, Any]]] = None
    risk_assessment: Optional[Dict[str, Any]] = None
    processing_time_ms: int


# ============================================
# Document List Filters
# ============================================

class DocumentListFilters(BaseModel):
    """Фильтры для списка документов"""
    skip: int = Field(0, ge=0)
    limit: int = Field(100, ge=1, le=1000)
    status: Optional[str] = Field(None, description="Filter by status")
    type: Optional[str] = Field(None, description="Filter by type")
    customer_id: Optional[UUID] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
