"""Operator Analytics API endpoints.

This module provides REST API endpoints for analyzing VED operators' performance,
calculating compliance scores based on 115-FZ requirements, and generating
forecasts and recommendations.

Created as part of the Operator Analytics Module for VILI.

Endpoints:
    GET  /operators                      - List all operators with basic metrics
    GET  /operators/{id}/analytics       - Detailed analytics for an operator
    POST /operators/{id}/forecast        - Performance forecast
    GET  /operators/{id}/compliance      - Compliance score with 115-FZ context
    POST /operators/compare              - Compare multiple operators
    POST /operators/recommendations      - Get recommendations via RAG+LLM
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.services.operator_service import OperatorService, OperatorServiceException
from app.database.schemas.operator import (
    OperatorListResponse,
    OperatorAnalyticsRequest,
    OperatorAnalyticsResponse,
    OperatorComplianceScore,
    OperatorCompareRequest,
    OperatorCompareResponse,
    PerformanceForecast,
    RecommendationsRequest,
    RecommendationsResponse,
)

router = APIRouter()


@router.get("", response_model=OperatorListResponse)
async def list_operators(
    db: Session = Depends(get_db)
) -> OperatorListResponse:
    """
    Получить список всех операторов с базовыми метриками.
    
    Возвращает список операторов отдела ВЭД с ключевыми показателями:
    - Уровень квалификации
    - Success rate
    - Compliance score
    - Количество обработанных заявок за 30 дней
    
    Returns:
        OperatorListResponse: Список операторов с командной статистикой
    """
    try:
        service = OperatorService(db)
        return await service.get_operators_list()
    except OperatorServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get operators list: {str(e)}")


@router.get("/statistics")
async def get_operators_statistics(
    db: Session = Depends(get_db)
) -> dict:
    """
    Получить общую статистику по операторам.
    
    Возвращает агрегированную статистику команды:
    - Общее количество операторов
    - Средние показатели
    - Распределение по уровням
    - Compliance-статистика
    
    Returns:
        dict: Статистика команды
    """
    try:
        service = OperatorService(db)
        operators_list = await service.get_operators_list()
        
        if not operators_list.operators:
            return {
                "total_operators": 0,
                "by_level": {},
                "team_stats": {}
            }
        
        # Подсчёт по уровням
        by_level = {}
        for op in operators_list.operators:
            level = op.level.value
            by_level[level] = by_level.get(level, 0) + 1
        
        return {
            "total_operators": operators_list.total,
            "by_level": by_level,
            "team_stats": operators_list.team_stats,
            "operators_needing_attention": [
                str(op.id) for op in operators_list.operators
                if op.compliance_score < 0.85
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")


@router.get("/{operator_id}/analytics", response_model=OperatorAnalyticsResponse)
async def get_operator_analytics(
    operator_id: UUID,
    period_days: int = Query(default=30, ge=1, le=365, description="Период анализа в днях"),
    include_forecast: bool = Query(default=True, description="Включить прогноз"),
    include_recommendations: bool = Query(default=True, description="Включить рекомендации"),
    use_rag: bool = Query(default=True, description="Использовать RAG"),
    compare_with_team: bool = Query(default=False, description="Сравнить с командой"),
    db: Session = Depends(get_db)
) -> OperatorAnalyticsResponse:
    """
    Получить детальную аналитику по оператору.
    
    Возвращает полный анализ работы оператора:
    - Профиль (опыт, сертификаты, специализации)
    - Метрики производительности
    - Compliance-оценка с учётом 115-ФЗ
    - Прогноз производительности (опционально)
    - Рекомендации (опционально, с использованием RAG)
    - Сравнение с командой (опционально)
    
    Args:
        operator_id: UUID оператора
        period_days: Период анализа в днях (1-365)
        include_forecast: Включить прогноз производительности
        include_recommendations: Включить рекомендации
        use_rag: Использовать RAG для рекомендаций
        compare_with_team: Сравнить показатели с командой
        
    Returns:
        OperatorAnalyticsResponse: Полный результат анализа
        
    Raises:
        HTTPException: 404 если оператор не найден
    """
    try:
        service = OperatorService(db)
        
        request = OperatorAnalyticsRequest(
            operator_id=operator_id,
            period_days=period_days,
            include_forecast=include_forecast,
            include_recommendations=include_recommendations,
            use_rag=use_rag,
            compare_with_team=compare_with_team
        )
        
        return await service.get_operator_analytics(request)
    except OperatorServiceException as e:
        if "not found" in e.message.lower():
            raise HTTPException(status_code=404, detail=e.message)
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get operator analytics: {str(e)}")


@router.post("/{operator_id}/forecast", response_model=PerformanceForecast)
async def get_operator_forecast(
    operator_id: UUID,
    forecast_days: int = Query(default=30, ge=7, le=90, description="Период прогноза в днях"),
    db: Session = Depends(get_db)
) -> PerformanceForecast:
    """
    Получить прогноз производительности оператора.
    
    Генерирует прогноз на основе:
    - Исторических данных обработки заявок
    - Тренда производительности
    - Compliance-истории
    
    Args:
        operator_id: UUID оператора
        forecast_days: Период прогноза в днях (7-90)
        
    Returns:
        PerformanceForecast: Прогноз с уверенностью и факторами
        
    Raises:
        HTTPException: 404 если оператор не найден
    """
    try:
        service = OperatorService(db)
        
        request = OperatorAnalyticsRequest(
            operator_id=operator_id,
            include_forecast=True,
            include_recommendations=False
        )
        
        result = await service.get_operator_analytics(request)
        
        if not result.forecast:
            raise HTTPException(status_code=500, detail="Failed to generate forecast")
        
        return result.forecast
    except OperatorServiceException as e:
        if "not found" in e.message.lower():
            raise HTTPException(status_code=404, detail=e.message)
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get forecast: {str(e)}")


@router.get("/{operator_id}/compliance", response_model=OperatorComplianceScore)
async def get_operator_compliance(
    operator_id: UUID,
    db: Session = Depends(get_db)
) -> OperatorComplianceScore:
    """
    Получить compliance-оценку оператора с учётом 115-ФЗ.
    
    Возвращает детальную оценку соответствия требованиям:
    - Общая compliance-оценка
    - KYC/AML/Sanctions compliance
    - Detection rate (эффективность выявления)
    - False negative rate (пропущенные сигналы)
    - История нарушений
    
    Важно для соответствия требованиям:
    - 115-ФЗ (ПОД/ФТ)
    - 173-ФЗ (валютный контроль)
    
    Args:
        operator_id: UUID оператора
        
    Returns:
        OperatorComplianceScore: Детальная compliance-оценка
        
    Raises:
        HTTPException: 404 если оператор не найден
    """
    try:
        service = OperatorService(db)
        return await service.get_operator_compliance(operator_id)
    except OperatorServiceException as e:
        if "not found" in e.message.lower():
            raise HTTPException(status_code=404, detail=e.message)
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get compliance score: {str(e)}")


@router.post("/compare", response_model=OperatorCompareResponse)
async def compare_operators(
    request: OperatorCompareRequest,
    db: Session = Depends(get_db)
) -> OperatorCompareResponse:
    """
    Сравнить нескольких операторов по выбранным метрикам.
    
    Позволяет сравнить 2-10 операторов по метрикам:
    - success_rate
    - compliance_score
    - avg_processing_time_min
    - applications_processed
    - и другие
    
    Args:
        request: Запрос на сравнение с ID операторов и метриками
        
    Returns:
        OperatorCompareResponse: Результат сравнения с рангами
    """
    try:
        service = OperatorService(db)
        return await service.compare_operators(request)
    except OperatorServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compare operators: {str(e)}")


@router.post("/recommendations", response_model=RecommendationsResponse)
async def get_recommendations(
    request: RecommendationsRequest,
    db: Session = Depends(get_db)
) -> RecommendationsResponse:
    """
    Получить рекомендации для оператора или команды.
    
    Генерирует рекомендации на основе:
    - Текущих метрик производительности
    - Compliance-оценки
    - Базы знаний (RAG)
    - Требований 115-ФЗ
    
    Типы рекомендаций:
    - TRAINING: обучение
    - MENTORING: наставничество
    - CERTIFICATION: сертификация
    - PROMOTION: повышение
    - WARNING: предупреждение
    - WORKLOAD_*: изменение нагрузки
    
    Args:
        request: Запрос на рекомендации
        
    Returns:
        RecommendationsResponse: Список рекомендаций с контекстом
    """
    try:
        service = OperatorService(db)
        return await service.get_recommendations(request)
    except OperatorServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get recommendations: {str(e)}")
