"""Pattern Auto Optimizer Service.

This module provides automated periodic analysis and optimization
of intent recognition patterns without manual intervention.
"""

import asyncio
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.pattern_analyzer import PatternAnalyzer
from app.services.pattern_optimizer import PatternOptimizer
from app.database.schemas.intent_log import PatternAnalysisResult, ImprovementStatus

logger = logging.getLogger(__name__)


class PatternAutoOptimizer:
    """Автоматический оптимизатор паттернов.
    
    Запускается периодически для:
    1. Анализа логов распознавания
    2. Выявления проблемных паттернов
    3. Генерации и применения улучшений
    """
    
    def __init__(
        self,
        db: Session,
        analysis_period_hours: int = 24,
        min_confidence_threshold: float = 0.7,
        auto_apply_threshold: float = 0.85,
        min_logs_for_analysis: int = 50,
    ):
        """Инициализация автоматического оптимизатора.
        
        Args:
            db: SQLAlchemy сессия
            analysis_period_hours: Период анализа в часах
            min_confidence_threshold: Порог уверенности для анализа
            auto_apply_threshold: Порог уверенности для авто-применения улучшений
            min_logs_for_analysis: Минимальное количество логов для анализа
        """
        self.db = db
        self.analyzer = PatternAnalyzer(db)
        self.optimizer = PatternOptimizer(db)
        
        self.analysis_period_hours = analysis_period_hours
        self.min_confidence_threshold = min_confidence_threshold
        self.auto_apply_threshold = auto_apply_threshold
        self.min_logs_for_analysis = min_logs_for_analysis
        
        self._running = False
        self._last_run: Optional[datetime] = None
        self._last_result: Optional[Dict[str, Any]] = None
    
    async def run_optimization_cycle(self) -> Dict[str, Any]:
        """Выполняет полный цикл оптимизации.
        
        Returns:
            Результат цикла оптимизации
        """
        logger.info("Starting pattern optimization cycle...")
        start_time = datetime.now()
        
        result = {
            "started_at": start_time.isoformat(),
            "analysis": None,
            "improvements_generated": 0,
            "improvements_applied": 0,
            "errors": [],
        }
        
        try:
            # 1. Запускаем анализ
            analysis_result = await self.analyzer.run_llm_analysis(
                period_hours=self.analysis_period_hours,
                min_confidence_threshold=self.min_confidence_threshold,
            )
            
            result["analysis"] = {
                "logs_analyzed": analysis_result.analyzed_logs_count,
                "low_confidence_count": analysis_result.low_confidence_count,
                "issues_found": len(analysis_result.potential_issues),
                "improvements_suggested": len(analysis_result.suggested_improvements),
            }
            
            # 2. Проверяем, достаточно ли данных для анализа
            if analysis_result.analyzed_logs_count < self.min_logs_for_analysis:
                logger.info(
                    f"Not enough logs for analysis: {analysis_result.analyzed_logs_count} < {self.min_logs_for_analysis}"
                )
                result["skipped"] = "not_enough_data"
                self._last_run = datetime.now()
                self._last_result = result
                return result
            
            # 3. Сохраняем предложенные улучшения
            for improvement in analysis_result.suggested_improvements:
                try:
                    improvement_id = await self.optimizer.save_improvement(improvement)
                    if improvement_id:
                        result["improvements_generated"] += 1
                        
                        # 4. Авто-применяем улучшения с высокой уверенностью
                        if improvement.confidence >= self.auto_apply_threshold:
                            apply_result = await self.optimizer.apply_improvement(
                                improvement_id=improvement_id,
                                auto_apply=True,
                                applied_by="auto_optimizer",
                            )
                            
                            if apply_result.get("success"):
                                result["improvements_applied"] += 1
                                logger.info(
                                    f"Auto-applied improvement for {improvement.intent_type} "
                                    f"with confidence {improvement.confidence:.2f}"
                                )
                            else:
                                result["errors"].append({
                                    "intent_type": improvement.intent_type,
                                    "error": apply_result.get("error"),
                                })
                                
                except Exception as e:
                    logger.error(f"Error processing improvement: {e}")
                    result["errors"].append({"error": str(e)})
            
            # 5. Перезагружаем паттерны если были применены улучшения
            if result["improvements_applied"] > 0:
                from app.services.intent_detector import get_intent_detector
                detector = get_intent_detector()
                detector.reload_patterns_from_db(self.db)
            
        except Exception as e:
            logger.error(f"Error in optimization cycle: {e}")
            result["errors"].append({"fatal_error": str(e)})
        
        end_time = datetime.now()
        result["completed_at"] = end_time.isoformat()
        result["duration_seconds"] = (end_time - start_time).total_seconds()
        
        self._last_run = datetime.now()
        self._last_result = result
        
        logger.info(
            f"Optimization cycle completed: {result['improvements_generated']} generated, "
            f"{result['improvements_applied']} applied, {len(result['errors'])} errors"
        )
        
        return result
    
    async def start_periodic_optimization(
        self,
        interval_hours: int = 24,
    ) -> None:
        """Запускает периодическую оптимизацию.
        
        Args:
            interval_hours: Интервал между циклами в часах
        """
        if self._running:
            logger.warning("Periodic optimization already running")
            return
        
        self._running = True
        interval_seconds = interval_hours * 3600
        
        logger.info(f"Starting periodic optimization with interval {interval_hours}h")
        
        while self._running:
            try:
                await self.run_optimization_cycle()
            except Exception as e:
                logger.error(f"Error in periodic optimization: {e}")
            
            # Ждем следующего цикла
            await asyncio.sleep(interval_seconds)
    
    def stop_periodic_optimization(self) -> None:
        """Останавливает периодическую оптимизацию."""
        self._running = False
        logger.info("Stopping periodic optimization")
    
    def get_status(self) -> Dict[str, Any]:
        """Возвращает статус автоматического оптимизатора.
        
        Returns:
            Статус оптимизатора
        """
        return {
            "running": self._running,
            "last_run": self._last_run.isoformat() if self._last_run else None,
            "last_result": self._last_result,
            "config": {
                "analysis_period_hours": self.analysis_period_hours,
                "min_confidence_threshold": self.min_confidence_threshold,
                "auto_apply_threshold": self.auto_apply_threshold,
                "min_logs_for_analysis": self.min_logs_for_analysis,
            }
        }


# Глобальный экземпляр для фоновой задачи
_auto_optimizer: Optional[PatternAutoOptimizer] = None
_background_task: Optional[asyncio.Task] = None


def get_auto_optimizer(db: Session) -> PatternAutoOptimizer:
    """Создает экземпляр автоматического оптимизатора."""
    return PatternAutoOptimizer(
        db=db,
        analysis_period_hours=getattr(settings, 'INTENT_ANALYSIS_PERIOD_HOURS', 24),
        min_confidence_threshold=getattr(settings, 'INTENT_MIN_CONFIDENCE_THRESHOLD', 0.7),
        auto_apply_threshold=0.85,
        min_logs_for_analysis=50,
    )


async def start_background_optimization(db: Session) -> bool:
    """Запускает фоновую оптимизацию.
    
    Args:
        db: SQLAlchemy сессия
        
    Returns:
        True если запущено успешно
    """
    global _auto_optimizer, _background_task
    
    if _background_task and not _background_task.done():
        logger.warning("Background optimization already running")
        return False
    
    # Проверяем, включена ли автооптимизация
    if not getattr(settings, 'INTENT_AUTO_OPTIMIZATION_ENABLED', False):
        logger.info("Auto-optimization is disabled in settings")
        return False
    
    _auto_optimizer = get_auto_optimizer(db)
    _background_task = asyncio.create_task(
        _auto_optimizer.start_periodic_optimization(
            interval_hours=getattr(settings, 'INTENT_ANALYSIS_PERIOD_HOURS', 24)
        )
    )
    
    logger.info("Background pattern optimization started")
    return True


def stop_background_optimization() -> None:
    """Останавливает фоновую оптимизацию."""
    global _auto_optimizer, _background_task
    
    if _auto_optimizer:
        _auto_optimizer.stop_periodic_optimization()
    
    if _background_task:
        _background_task.cancel()
        _background_task = None
    
    _auto_optimizer = None
    logger.info("Background pattern optimization stopped")


def get_background_status() -> Dict[str, Any]:
    """Возвращает статус фоновой оптимизации."""
    if _auto_optimizer:
        return _auto_optimizer.get_status()
    
    return {
        "running": False,
        "last_run": None,
        "last_result": None,
        "config": None,
    }
