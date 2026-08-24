"""Pydantic schemas for risk assessment"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID


# ============================================
# Risk Assessment Schemas
# ============================================

class RiskAssessmentBase(BaseModel):
    """Базовая схема оценки рисков"""
    risk_score: float = Field(..., ge=0.0, le=1.0, description="Risk score from 0 to 1")
    risk_level: str = Field(..., description="Risk level: 'low', 'medium', 'high', 'critical'")
    recommendation: str = Field(..., description="Recommendation: 'approve', 'reject', 'review', 'request_info'")
    factors: Optional[Dict[str, Any]] = None
    economic_indices: Optional[Dict[str, Any]] = None
    model_version: Optional[str] = None


class RiskAssessmentCreate(RiskAssessmentBase):
    """Схема создания оценки рисков"""
    document_id: UUID


class RiskAssessmentResponse(RiskAssessmentBase):
    """Схема ответа с оценкой рисков"""
    id: UUID
    document_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Risk Assessment Request Schemas
# ============================================

class RiskAssessmentRequest(BaseModel):
    """Запрос на оценку рисков"""
    document_id: UUID
    include_economic_indices: bool = Field(
        default=True,
        description="Include economic indices in assessment"
    )
    use_rag: bool = Field(
        default=True,
        description="Use RAG knowledge base for risk factors"
    )
    country_codes: Optional[List[str]] = Field(
        default=None,
        description="Country codes for economic indices (ISO 3166-1 alpha-3)"
    )


class RiskFactor(BaseModel):
    """Фактор риска"""
    name: str
    category: str
    weight: float
    score: float
    description: str
    severity: str


class EconomicIndex(BaseModel):
    """Экономический индекс"""
    country_code: str
    index_type: str
    value: float
    year: int
    impact: str
    description: Optional[str] = None


class RiskAssessmentDetailed(BaseModel):
    """Детальная оценка рисков"""
    document_id: UUID
    status: str
    risk_score: float
    risk_level: str
    recommendation: str
    confidence: float
    factors: List[RiskFactor]
    economic_indices: List[EconomicIndex]
    analysis: Dict[str, Any]
    mitigations: Optional[List[str]] = None
    processing_time_ms: int
    timestamp: datetime


# ============================================
# Risk Statistics
# ============================================

class RiskStatistics(BaseModel):
    """Статистика оценок рисков"""
    total_assessments: int
    by_risk_level: Dict[str, int]
    by_recommendation: Dict[str, int]
    average_risk_score: float
    average_processing_time_ms: float
    trend: Optional[str] = None


# ============================================
# Economic Indices Schemas
# ============================================

class EconomicIndexBase(BaseModel):
    """Базовая схема экономического индекса"""
    country_code: str = Field(..., max_length=3, description="ISO 3166-1 alpha-3 country code")
    index_type: str = Field(..., description="Index type: 'economic_freedom', 'corruption', 'gdp_growth', etc.")
    value: float
    year: int
    source: Optional[str] = None


class EconomicIndexCreate(EconomicIndexBase):
    """Схема создания экономического индекса"""
    pass


class EconomicIndexResponse(EconomicIndexBase):
    """Схема ответа с экономическим индексом"""
    id: UUID
    updated_at: datetime

    class Config:
        from_attributes = True


class EconomicIndexList(BaseModel):
    """Список экономических индексов"""
    total: int
    indices: List[EconomicIndexResponse]
    country_code: Optional[str] = None
    index_type: Optional[str] = None
