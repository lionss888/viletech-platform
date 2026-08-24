"""Pydantic schemas for operator analytics and performance evaluation.

This module provides data models for evaluating VED (foreign economic activity)
operators, including compliance scoring based on 115-FZ requirements.

Created as part of the Operator Analytics Module for VILI.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, date
from pydantic import BaseModel, Field, field_validator
from uuid import UUID
from enum import Enum


# ============================================
# Enums
# ============================================

class OperatorLevel(str, Enum):
    """Уровень квалификации оператора"""
    JUNIOR = "junior"
    MIDDLE = "middle"
    SENIOR = "senior"
    LEAD = "lead"


class RiskLevel(str, Enum):
    """Уровень риска"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RecommendationType(str, Enum):
    """Тип рекомендации"""
    TRAINING = "training"
    MENTORING = "mentoring"
    WORKLOAD_REDUCTION = "workload_reduction"
    WORKLOAD_INCREASE = "workload_increase"
    PROMOTION = "promotion"
    WARNING = "warning"
    CERTIFICATION = "certification"


# ============================================
# Operator Profile Schemas
# ============================================

class Certificate(BaseModel):
    """Сертификат оператора"""
    name: str = Field(..., description="Название сертификата")
    issuer: str = Field(..., description="Кем выдан")
    issue_date: date = Field(..., description="Дата выдачи")
    expiry_date: Optional[date] = Field(None, description="Срок действия")
    is_valid: bool = Field(default=True, description="Действителен ли")


class OperatorProfileBase(BaseModel):
    """Базовая схема профиля оператора"""
    full_name: str = Field(..., min_length=2, max_length=200, description="ФИО оператора")
    employee_id: str = Field(..., description="Табельный номер")
    department: str = Field(default="VED", description="Отдел")
    position: str = Field(..., description="Должность")
    level: OperatorLevel = Field(..., description="Уровень квалификации")
    hire_date: date = Field(..., description="Дата приёма на работу")
    years_of_experience: float = Field(..., ge=0, description="Общий стаж в годах")
    years_in_company: float = Field(..., ge=0, description="Стаж в компании в годах")
    certificates: List[Certificate] = Field(default_factory=list, description="Сертификаты")
    languages: List[str] = Field(default_factory=list, description="Знание языков")
    specializations: List[str] = Field(default_factory=list, description="Специализации")


class OperatorProfileCreate(OperatorProfileBase):
    """Схема создания профиля оператора"""
    pass


class OperatorProfileResponse(OperatorProfileBase):
    """Схема ответа с профилем оператора"""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Operator Metrics Schemas
# ============================================

class OperatorMetrics(BaseModel):
    """Метрики производительности оператора.
    
    Включает показатели эффективности работы с заявками и compliance-метрики
    в соответствии с требованиями 115-ФЗ.
    """
    # Основные метрики производительности
    applications_processed: int = Field(..., ge=0, description="Обработано заявок за период")
    applications_approved: int = Field(..., ge=0, description="Одобренных заявок")
    applications_rejected: int = Field(..., ge=0, description="Отклонённых заявок")
    applications_pending: int = Field(default=0, ge=0, description="В ожидании")
    
    # Временные метрики
    avg_processing_time_min: float = Field(..., ge=0, description="Среднее время обработки (мин)")
    min_processing_time_min: float = Field(default=0, ge=0, description="Минимальное время")
    max_processing_time_min: float = Field(default=0, ge=0, description="Максимальное время")
    
    # Качество работы
    success_rate: float = Field(..., ge=0, le=1, description="Доля успешных заявок (0-1)")
    error_rate: float = Field(default=0, ge=0, le=1, description="Доля ошибок (0-1)")
    
    # Compliance-метрики (115-ФЗ)
    compliance_score: float = Field(..., ge=0, le=1, description="Compliance-оценка (0-1)")
    red_flags_detected: int = Field(default=0, ge=0, description="Выявлено подозрительных операций")
    red_flags_missed: int = Field(default=0, ge=0, description="Пропущено подозрительных операций")
    false_positive_rate: float = Field(default=0, ge=0, le=1, description="Ложноположительные (0-1)")
    false_negative_rate: float = Field(default=0, ge=0, le=1, description="Ложноотрицательные (0-1)")
    avg_alert_response_time_min: float = Field(default=0, ge=0, description="Среднее время реакции на алерт (мин)")
    
    # Период
    period_start: date = Field(..., description="Начало периода")
    period_end: date = Field(..., description="Конец периода")
    
    @field_validator('success_rate')
    @classmethod
    def validate_success_rate(cls, v: float, info) -> float:
        """Проверка корректности success_rate"""
        if v < 0 or v > 1:
            raise ValueError("success_rate должен быть в диапазоне 0-1")
        return v


class OperatorMetricsHistory(BaseModel):
    """История метрик оператора по периодам"""
    operator_id: UUID
    metrics: List[OperatorMetrics]
    trend: str = Field(..., description="Тренд: improving, stable, declining")


# ============================================
# Compliance Score Schemas (115-ФЗ)
# ============================================

class ComplianceViolation(BaseModel):
    """Нарушение compliance"""
    violation_type: str = Field(..., description="Тип нарушения")
    severity: RiskLevel = Field(..., description="Серьёзность")
    date: datetime = Field(..., description="Дата нарушения")
    description: str = Field(..., description="Описание")
    resolved: bool = Field(default=False, description="Устранено")
    resolution_date: Optional[datetime] = Field(None, description="Дата устранения")


class OperatorComplianceScore(BaseModel):
    """Compliance-оценка оператора с учётом 115-ФЗ.
    
    Детальная оценка соответствия оператора требованиям законодательства
    о противодействии легализации доходов.
    """
    operator_id: UUID
    
    # Общая оценка
    overall_score: float = Field(..., ge=0, le=1, description="Общая compliance-оценка (0-1)")
    risk_level: RiskLevel = Field(..., description="Уровень риска")
    
    # Компоненты оценки
    kyc_compliance: float = Field(..., ge=0, le=1, description="Соответствие KYC (0-1)")
    aml_compliance: float = Field(..., ge=0, le=1, description="Соответствие AML (0-1)")
    sanctions_compliance: float = Field(..., ge=0, le=1, description="Проверка санкций (0-1)")
    documentation_quality: float = Field(..., ge=0, le=1, description="Качество документации (0-1)")
    
    # Детектирование подозрительных операций
    detection_rate: float = Field(..., ge=0, le=1, description="Эффективность выявления (0-1)")
    false_negative_rate: float = Field(..., ge=0, le=1, description="Пропущенные сигналы (0-1)")
    alert_response_compliance: float = Field(..., ge=0, le=1, description="Соблюдение времени реакции (0-1)")
    
    # История нарушений
    violations: List[ComplianceViolation] = Field(default_factory=list)
    violations_count_30d: int = Field(default=0, description="Нарушений за 30 дней")
    violations_count_90d: int = Field(default=0, description="Нарушений за 90 дней")
    
    # Мета
    calculated_at: datetime = Field(..., description="Дата расчёта")
    period_days: int = Field(default=30, description="Период оценки в днях")


# ============================================
# Analytics Request/Response Schemas
# ============================================

class OperatorAnalyticsRequest(BaseModel):
    """Запрос на анализ оператора"""
    operator_id: Optional[UUID] = Field(None, description="ID оператора (если конкретный)")
    period_days: int = Field(default=30, ge=1, le=365, description="Период анализа в днях")
    include_forecast: bool = Field(default=True, description="Включить прогноз")
    include_recommendations: bool = Field(default=True, description="Включить рекомендации")
    use_rag: bool = Field(default=True, description="Использовать RAG для рекомендаций")
    compare_with_team: bool = Field(default=False, description="Сравнить с командой")


class PerformanceForecast(BaseModel):
    """Прогноз производительности оператора"""
    forecast_period_days: int = Field(..., description="Период прогноза в днях")
    predicted_applications: int = Field(..., description="Прогнозируемое кол-во заявок")
    predicted_success_rate: float = Field(..., ge=0, le=1, description="Прогнозируемый % успеха")
    predicted_compliance_score: float = Field(..., ge=0, le=1, description="Прогнозируемый compliance")
    confidence: float = Field(..., ge=0, le=1, description="Уверенность прогноза")
    trend: str = Field(..., description="Тренд: improving, stable, declining")
    risk_factors: List[str] = Field(default_factory=list, description="Факторы риска")
    growth_factors: List[str] = Field(default_factory=list, description="Факторы роста")


class Recommendation(BaseModel):
    """Рекомендация по оператору"""
    type: RecommendationType = Field(..., description="Тип рекомендации")
    priority: str = Field(..., description="Приоритет: high, medium, low")
    title: str = Field(..., description="Заголовок")
    description: str = Field(..., description="Описание")
    expected_impact: str = Field(..., description="Ожидаемый эффект")
    implementation_time: str = Field(..., description="Время реализации")
    based_on: List[str] = Field(default_factory=list, description="На чём основано")


class OperatorAnalyticsResponse(BaseModel):
    """Полный результат анализа оператора"""
    operator_id: UUID
    profile: OperatorProfileResponse
    metrics: OperatorMetrics
    compliance_score: OperatorComplianceScore
    forecast: Optional[PerformanceForecast] = None
    recommendations: List[Recommendation] = Field(default_factory=list)
    team_comparison: Optional[Dict[str, Any]] = None
    analysis_summary: str = Field(..., description="Текстовое резюме анализа")
    processing_time_ms: int = Field(..., description="Время обработки в мс")
    generated_at: datetime = Field(..., description="Время генерации")


# ============================================
# Operator Comparison Schemas
# ============================================

class OperatorCompareRequest(BaseModel):
    """Запрос на сравнение операторов"""
    operator_ids: List[UUID] = Field(..., min_length=2, max_length=10, description="ID операторов")
    metrics_to_compare: List[str] = Field(
        default=["success_rate", "compliance_score", "avg_processing_time_min"],
        description="Метрики для сравнения"
    )
    period_days: int = Field(default=30, ge=1, le=365)


class OperatorCompareItem(BaseModel):
    """Элемент сравнения операторов"""
    operator_id: UUID
    operator_name: str
    level: OperatorLevel
    metrics: Dict[str, float]
    rank: int = Field(..., description="Позиция в рейтинге")


class OperatorCompareResponse(BaseModel):
    """Результат сравнения операторов"""
    operators: List[OperatorCompareItem]
    best_performer: Optional[UUID] = Field(None, description="Лучший оператор (None если список пуст)")
    needs_attention: List[UUID] = Field(default_factory=list, description="Требуют внимания")
    team_averages: Dict[str, float] = Field(..., description="Средние по команде")
    comparison_summary: str


# ============================================
# Operator List Schemas
# ============================================

class OperatorListItem(BaseModel):
    """Элемент списка операторов"""
    id: UUID
    full_name: str
    level: OperatorLevel
    department: str
    success_rate: float
    compliance_score: float
    applications_processed_30d: int
    status: str = Field(..., description="active, on_leave, probation")


class OperatorListResponse(BaseModel):
    """Список операторов с метриками"""
    total: int
    operators: List[OperatorListItem]
    team_stats: Dict[str, Any] = Field(..., description="Статистика команды")


# ============================================
# Recommendations Request
# ============================================

class RecommendationsRequest(BaseModel):
    """Запрос рекомендаций для оператора или команды"""
    operator_id: Optional[UUID] = Field(None, description="ID оператора (или None для команды)")
    focus_areas: List[str] = Field(
        default=["compliance", "productivity", "quality"],
        description="Области фокуса"
    )
    use_rag: bool = Field(default=True, description="Использовать RAG")
    max_recommendations: int = Field(default=5, ge=1, le=20)


class RecommendationsResponse(BaseModel):
    """Ответ с рекомендациями"""
    operator_id: Optional[UUID]
    recommendations: List[Recommendation]
    context_used: List[str] = Field(default_factory=list, description="Использованный контекст из RAG")
    generated_at: datetime
