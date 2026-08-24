"""Pydantic schemas for compliance checks"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID


# ============================================
# Compliance Check Schemas
# ============================================

class ComplianceCheckBase(BaseModel):
    """Базовая схема compliance проверки"""
    check_type: str = Field(..., description="Check type: 'sanctions', 'kyc', 'aml', 'travel_rule', 'fatf'")
    status: str = Field(..., description="Status: 'passed', 'failed', 'warning', 'pending'")
    details: Optional[Dict[str, Any]] = None
    risk_level: Optional[str] = Field(None, description="Risk level: 'low', 'medium', 'high', 'critical'")


class ComplianceCheckCreate(ComplianceCheckBase):
    """Схема создания compliance проверки"""
    document_id: UUID


class ComplianceCheckResponse(ComplianceCheckBase):
    """Схема ответа с результатом compliance проверки"""
    id: UUID
    document_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Compliance Request Schemas
# ============================================

class ComplianceCheckRequest(BaseModel):
    """Запрос на compliance проверку"""
    document_id: UUID
    check_types: List[str] = Field(
        default=["sanctions", "kyc", "aml"],
        description="Types of checks to perform"
    )
    use_rag: bool = Field(
        default=True,
        description="Use RAG knowledge base for compliance rules"
    )


class ComplianceCheckItem(BaseModel):
    """Элемент результата compliance проверки"""
    type: str
    status: str
    risk_level: str
    details: Dict[str, Any]
    confidence: Optional[float] = None
    findings: Optional[List[str]] = None
    recommendations: Optional[List[str]] = None


class ComplianceCheckResult(BaseModel):
    """Полный результат compliance проверки"""
    document_id: UUID
    status: str
    overall_risk_level: str
    checks: List[ComplianceCheckItem]
    processing_time_ms: int
    timestamp: datetime


class ComplianceCheckListResponse(BaseModel):
    """Список результатов compliance проверок"""
    document_id: UUID
    checks: List[ComplianceCheckResponse]
    overall_status: str
    summary: Dict[str, Any]


# ============================================
# Compliance Knowledge Base Schemas
# ============================================

class ComplianceKnowledgeBase(BaseModel):
    """Схема базы знаний compliance"""
    id: UUID
    category: str
    content_type: str
    content: str
    keywords: Optional[List[str]] = None
    source: Optional[str] = None
    quality_score: float
    usage_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ComplianceKnowledgeCreate(BaseModel):
    """Схема создания записи в базе знаний compliance"""
    category: str
    content_type: str
    content: str
    keywords: Optional[List[str]] = None
    source: Optional[str] = None


# ============================================
# Compliance Statistics
# ============================================

class ComplianceStatistics(BaseModel):
    """Статистика compliance проверок"""
    total_checks: int
    passed: int
    failed: int
    warnings: int
    pending: int
    by_type: Dict[str, int]
    by_risk_level: Dict[str, int]
    average_processing_time_ms: float
