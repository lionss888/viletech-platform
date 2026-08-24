"""Intent Patterns API endpoints.

This module provides API endpoints for managing intent recognition patterns,
including viewing, analyzing, and applying improvements.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID

from app.core.dependencies import get_db, get_current_user
from app.services.intent_detector import get_intent_detector
from app.services.pattern_analyzer import get_pattern_analyzer
from app.services.pattern_optimizer import get_pattern_optimizer
from app.services.intent_log_service import IntentLogService
from app.database.schemas.intent_log import (
    IntentPatternList,
    IntentPatternResponse,
    IntentPatternCreate,
    IntentPatternUpdate,
    IntentLogList,
    IntentLogStats,
    PatternAnalysisRequest,
    PatternAnalysisResult,
    PatternImprovementList,
    PatternImprovementResponse,
    ApplyImprovementRequest,
    DashboardStats,
)

router = APIRouter()


# ============================================
# Patterns Endpoints
# ============================================

@router.get("/patterns", response_model=IntentPatternList)
async def list_patterns(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Получить список всех паттернов распознавания."""
    detector = get_intent_detector()
    
    patterns = []
    for i, pattern in enumerate(detector.patterns):
        patterns.append(IntentPatternResponse(
            id=i + 1,
            intent_type=pattern.intent.value,
            keywords=pattern.keywords,
            required_keywords=pattern.required_keywords,
            exclude_keywords=pattern.exclude_keywords,
            priority=pattern.priority,
            confidence_boost=0.3,
            version=1,
            is_active=True,
            is_system=True,
            description=None,
            examples=[],
            created_at=None,
            updated_at=None,
        ))
    
    return IntentPatternList(items=patterns, total=len(patterns))


@router.get("/patterns/{intent_type}")
async def get_pattern(
    intent_type: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Получить паттерн по типу намерения."""
    detector = get_intent_detector()
    
    for pattern in detector.patterns:
        if pattern.intent.value == intent_type:
            return {
                "intent_type": pattern.intent.value,
                "keywords": pattern.keywords,
                "required_keywords": pattern.required_keywords,
                "exclude_keywords": pattern.exclude_keywords,
                "priority": pattern.priority,
            }
    
    raise HTTPException(status_code=404, detail=f"Pattern not found: {intent_type}")


@router.get("/patterns-info")
async def get_patterns_info(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Получить информацию о текущих паттернах (источник, количество, время загрузки)."""
    detector = get_intent_detector()
    return detector.get_patterns_info()


@router.post("/patterns/reload")
async def reload_patterns(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Перезагрузить паттерны из базы данных."""
    detector = get_intent_detector()
    success = detector.reload_patterns_from_db(db)
    
    return {
        "success": success,
        "source": "database" if success else "static",
        "patterns_count": len(detector.patterns),
    }


# ============================================
# Logs Endpoints
# ============================================

@router.get("/logs", response_model=IntentLogList)
async def list_logs(
    page: int = 1,
    page_size: int = 50,
    intent_type: Optional[str] = None,
    min_confidence: Optional[float] = None,
    max_confidence: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Получить список логов распознавания с фильтрацией."""
    log_service = IntentLogService(db)
    
    return await log_service.get_logs(
        page=page,
        page_size=page_size,
        intent_type=intent_type,
        min_confidence=min_confidence,
        max_confidence=max_confidence,
    )


@router.get("/logs/stats", response_model=IntentLogStats)
async def get_logs_stats(
    period_hours: int = 24,
    min_confidence_threshold: float = 0.7,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Получить статистику логов распознавания за период."""
    log_service = IntentLogService(db)
    
    return await log_service.get_stats(
        period_hours=period_hours,
        min_confidence_threshold=min_confidence_threshold,
    )


# ============================================
# Analysis Endpoints
# ============================================

@router.post("/analyze", response_model=PatternAnalysisResult)
async def analyze_patterns(
    request: PatternAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Запустить анализ паттернов с использованием LLM."""
    analyzer = get_pattern_analyzer(db)
    
    return await analyzer.run_llm_analysis(
        period_hours=request.period_hours,
        min_confidence_threshold=request.min_confidence_threshold,
    )


@router.get("/analyze/quick")
async def quick_analysis(
    period_hours: int = 24,
    threshold: float = 0.7,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Быстрый анализ без LLM (только статистика)."""
    analyzer = get_pattern_analyzer(db)
    
    low_conf = await analyzer.analyze_low_confidence_requests(
        threshold=threshold,
        period_hours=period_hours,
    )
    
    failed = await analyzer.analyze_failed_patterns(
        period_hours=period_hours,
    )
    
    stats = await analyzer.get_pattern_stats(period_hours=period_hours)
    
    return {
        "period_hours": period_hours,
        "threshold": threshold,
        "low_confidence_issues": low_conf,
        "failed_patterns": failed,
        "pattern_stats": stats,
    }


# ============================================
# Improvements Endpoints
# ============================================

@router.get("/improvements", response_model=PatternImprovementList)
async def list_improvements(
    status: Optional[str] = "pending",
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Получить список предложений по улучшению."""
    optimizer = get_pattern_optimizer(db)
    
    improvements = await optimizer.get_pending_improvements(limit=limit)
    
    return PatternImprovementList(items=improvements, total=len(improvements))


@router.post("/improvements/apply")
async def apply_improvement(
    request: ApplyImprovementRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Применить улучшение к паттерну."""
    optimizer = get_pattern_optimizer(db)
    
    result = await optimizer.apply_improvement(
        improvement_id=request.improvement_id,
        auto_apply=request.auto_apply,
        applied_by="user",
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to apply improvement"))
    
    return result


@router.post("/improvements/validate")
async def validate_improvement(
    improvement: PatternImprovementResponse,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Валидировать предложенное улучшение."""
    from app.database.schemas.intent_log import PatternImprovementCreate
    
    optimizer = get_pattern_optimizer(db)
    
    improvement_create = PatternImprovementCreate(
        intent_type=improvement.intent_type,
        suggested_keywords=improvement.suggested_keywords,
        suggested_required_keywords=improvement.suggested_required_keywords,
        suggested_exclude_keywords=improvement.suggested_exclude_keywords,
        suggested_priority=improvement.suggested_priority,
        confidence=improvement.confidence,
    )
    
    return await optimizer.validate_improvement(improvement_create)


# ============================================
# Dashboard Endpoint
# ============================================

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Получить статистику для дашборда паттернов."""
    from datetime import datetime, timedelta
    from sqlalchemy import text
    
    detector = get_intent_detector()
    log_service = IntentLogService(db)
    optimizer = get_pattern_optimizer(db)
    
    # Статистика паттернов
    total_patterns = len(detector.patterns)
    active_patterns = sum(1 for _ in detector.patterns)  # Все активны
    
    # Статистика логов за 24ч
    stats = await log_service.get_stats(period_hours=24, min_confidence_threshold=0.7)
    
    # Ожидающие улучшения
    pending = await optimizer.get_pending_improvements(limit=100)
    
    # Авто-примененные за 24ч
    period_start = datetime.now() - timedelta(hours=24)
    auto_query = text("""
        SELECT COUNT(*) FROM intent_pattern_improvements
        WHERE status = 'auto_applied' AND applied_at >= :period_start
    """)
    auto_applied = db.execute(auto_query, {"period_start": period_start}).scalar() or 0
    
    # Процент низкой уверенности
    low_conf_pct = 0.0
    if stats.total_logs > 0:
        low_conf_pct = (stats.low_confidence_count / stats.total_logs) * 100
    
    return DashboardStats(
        total_patterns=total_patterns,
        active_patterns=active_patterns,
        total_logs_24h=stats.total_logs,
        avg_confidence_24h=stats.avg_confidence,
        low_confidence_percentage=low_conf_pct,
        pending_improvements=len(pending),
        auto_applied_24h=auto_applied,
        intent_stats=[],  # Упрощенная версия
    )


# ============================================
# Test Endpoint
# ============================================

@router.post("/test")
async def test_intent_detection(
    message: str = Query(..., description="Message to test intent detection"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Тестировать распознавание намерения для сообщения."""
    detector = get_intent_detector()
    
    result = detector.detect_intent(message)
    all_matches = detector.get_last_matches()
    
    return {
        "message": message,
        "detected_intent": result.intent.value,
        "confidence": result.confidence,
        "entities": [
            {"type": e.type.value, "value": e.value, "raw_text": e.raw_text}
            for e in result.entities
        ],
        "all_matches": [
            {"intent": p.intent.value, "confidence": c, "priority": p.priority}
            for p, c in all_matches
        ]
    }


# ============================================
# Auto-Optimizer Endpoints
# ============================================

@router.get("/auto-optimizer/status")
async def get_auto_optimizer_status(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Получить статус автоматического оптимизатора."""
    from app.services.pattern_auto_optimizer import get_background_status
    return get_background_status()


@router.post("/auto-optimizer/run")
async def run_optimization_cycle(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Запустить цикл оптимизации вручную."""
    from app.services.pattern_auto_optimizer import get_auto_optimizer
    
    optimizer = get_auto_optimizer(db)
    
    # Запускаем в фоне
    async def run_cycle():
        return await optimizer.run_optimization_cycle()
    
    background_tasks.add_task(run_cycle)
    
    return {
        "status": "started",
        "message": "Optimization cycle started in background"
    }


@router.post("/auto-optimizer/start")
async def start_auto_optimizer(
    interval_hours: int = 24,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Запустить периодическую автоматическую оптимизацию."""
    from app.services.pattern_auto_optimizer import start_background_optimization
    
    success = await start_background_optimization(db)
    
    return {
        "success": success,
        "interval_hours": interval_hours,
        "message": "Background optimization started" if success else "Failed to start or already running"
    }


@router.post("/auto-optimizer/stop")
async def stop_auto_optimizer(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Остановить периодическую автоматическую оптимизацию."""
    from app.services.pattern_auto_optimizer import stop_background_optimization
    
    stop_background_optimization()
    
    return {
        "success": True,
        "message": "Background optimization stopped"
    }
