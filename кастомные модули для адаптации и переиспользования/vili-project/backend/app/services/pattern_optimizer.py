"""Pattern Optimizer Service.

This module provides functionality for generating, validating, and applying
pattern improvements based on analysis results.
"""

import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.schemas.intent_log import (
    PatternImprovementCreate,
    PatternImprovementResponse,
    PatternHistoryCreate,
    ImprovementStatus,
    ChangeType,
    IntentPatternResponse,
)
from app.database.schemas.intent import IntentType, IntentPattern

logger = logging.getLogger(__name__)


class PatternOptimizer:
    """Оптимизатор паттернов распознавания."""
    
    def __init__(self, db: Session):
        """Инициализация оптимизатора.
        
        Args:
            db: SQLAlchemy сессия
        """
        self.db = db
    
    async def save_improvement(
        self,
        improvement: PatternImprovementCreate,
    ) -> Optional[UUID]:
        """Сохраняет предложение по улучшению в БД.
        
        Args:
            improvement: Данные улучшения
            
        Returns:
            UUID созданной записи или None
        """
        try:
            # Ищем pattern_id по intent_type
            pattern_query = text("""
                SELECT id FROM intent_patterns 
                WHERE intent_type = :intent_type AND is_active = true
                LIMIT 1
            """)
            result = self.db.execute(pattern_query, {"intent_type": improvement.intent_type})
            row = result.fetchone()
            pattern_id = row[0] if row else None
            
            # Создаем запись
            insert_query = text("""
                INSERT INTO intent_pattern_improvements
                (pattern_id, intent_type, suggested_keywords, suggested_required_keywords,
                 suggested_exclude_keywords, suggested_priority, confidence, analysis_data, status)
                VALUES
                (:pattern_id, :intent_type, :suggested_keywords, :suggested_required_keywords,
                 :suggested_exclude_keywords, :suggested_priority, :confidence, :analysis_data, :status)
                RETURNING id
            """)
            
            result = self.db.execute(insert_query, {
                "pattern_id": pattern_id,
                "intent_type": improvement.intent_type,
                "suggested_keywords": json.dumps(improvement.suggested_keywords) if improvement.suggested_keywords else None,
                "suggested_required_keywords": json.dumps(improvement.suggested_required_keywords) if improvement.suggested_required_keywords else None,
                "suggested_exclude_keywords": json.dumps(improvement.suggested_exclude_keywords) if improvement.suggested_exclude_keywords else None,
                "suggested_priority": improvement.suggested_priority,
                "confidence": improvement.confidence,
                "analysis_data": json.dumps(improvement.analysis_data) if improvement.analysis_data else None,
                "status": ImprovementStatus.PENDING.value,
            })
            
            self.db.commit()
            row = result.fetchone()
            return row[0] if row else None
            
        except Exception as e:
            logger.error(f"Error saving improvement: {e}")
            self.db.rollback()
            return None
    
    async def get_pending_improvements(
        self,
        limit: int = 50,
    ) -> List[PatternImprovementResponse]:
        """Получает список ожидающих улучшений.
        
        Args:
            limit: Максимальное количество записей
            
        Returns:
            Список улучшений
        """
        query = text("""
            SELECT id, pattern_id, intent_type, suggested_keywords, suggested_required_keywords,
                   suggested_exclude_keywords, suggested_priority, confidence, analysis_data,
                   status, applied_at, review_comment, created_at
            FROM intent_pattern_improvements
            WHERE status = :status
            ORDER BY confidence DESC, created_at DESC
            LIMIT :limit
        """)
        
        rows = self.db.execute(query, {
            "status": ImprovementStatus.PENDING.value,
            "limit": limit
        }).fetchall()
        
        return [
            PatternImprovementResponse(
                id=row[0],
                pattern_id=row[1],
                intent_type=row[2],
                suggested_keywords=json.loads(row[3]) if row[3] else None,
                suggested_required_keywords=json.loads(row[4]) if row[4] else None,
                suggested_exclude_keywords=json.loads(row[5]) if row[5] else None,
                suggested_priority=row[6],
                confidence=row[7],
                analysis_data=json.loads(row[8]) if row[8] else None,
                status=ImprovementStatus(row[9]),
                applied_at=row[10],
                review_comment=row[11],
                created_at=row[12],
            )
            for row in rows
        ]
    
    async def validate_improvement(
        self,
        improvement: PatternImprovementCreate,
    ) -> Dict[str, Any]:
        """Валидирует предложенное улучшение.
        
        Args:
            improvement: Данные улучшения
            
        Returns:
            Результат валидации
        """
        from app.services.intent_detector import get_intent_detector
        
        errors = []
        warnings = []
        
        # Проверяем, что intent_type существует
        try:
            IntentType(improvement.intent_type)
        except ValueError:
            errors.append(f"Unknown intent type: {improvement.intent_type}")
        
        # Проверяем конфликты с другими паттернами
        detector = get_intent_detector()
        
        if improvement.suggested_keywords:
            for pattern in detector.patterns:
                if pattern.intent.value == improvement.intent_type:
                    continue
                    
                # Проверяем пересечение keywords
                overlap = set(improvement.suggested_keywords) & set(pattern.keywords)
                if overlap:
                    warnings.append(
                        f"Keywords {overlap} overlap with pattern {pattern.intent.value}"
                    )
        
        # Проверяем приоритет
        if improvement.suggested_priority:
            if improvement.suggested_priority < 1 or improvement.suggested_priority > 10:
                errors.append("Priority must be between 1 and 10")
        
        # Проверяем уверенность
        if improvement.confidence < 0.5:
            warnings.append("Low confidence improvement (< 0.5)")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "improvement": improvement.model_dump()
        }
    
    async def apply_improvement(
        self,
        improvement_id: UUID,
        auto_apply: bool = False,
        applied_by: str = "user",
    ) -> Dict[str, Any]:
        """Применяет улучшение к паттерну.
        
        Args:
            improvement_id: ID улучшения
            auto_apply: Флаг автоматического применения
            applied_by: Кто применил (user/auto_optimizer)
            
        Returns:
            Результат применения
        """
        # Получаем улучшение
        query = text("""
            SELECT id, pattern_id, intent_type, suggested_keywords, suggested_required_keywords,
                   suggested_exclude_keywords, suggested_priority, confidence, status
            FROM intent_pattern_improvements
            WHERE id = :id
        """)
        
        row = self.db.execute(query, {"id": str(improvement_id)}).fetchone()
        
        if not row:
            return {"success": False, "error": "Improvement not found"}
        
        if row[8] not in (ImprovementStatus.PENDING.value, ImprovementStatus.APPROVED.value):
            return {"success": False, "error": f"Cannot apply improvement with status {row[8]}"}
        
        intent_type = row[2]
        pattern_id = row[1]
        
        try:
            # Получаем текущий паттерн из БД (или создаем новый)
            if pattern_id:
                old_pattern = await self._get_pattern_by_id(pattern_id)
            else:
                old_pattern = await self._get_pattern_by_intent(intent_type)
            
            # Формируем новые данные паттерна
            new_keywords = json.loads(row[3]) if row[3] else None
            new_required = json.loads(row[4]) if row[4] else None
            new_exclude = json.loads(row[5]) if row[5] else None
            new_priority = row[6]
            
            if old_pattern:
                # Обновляем существующий паттерн
                await self._update_pattern(
                    pattern_id=old_pattern["id"],
                    keywords=new_keywords,
                    required_keywords=new_required,
                    exclude_keywords=new_exclude,
                    priority=new_priority,
                )
                
                # Записываем историю
                await self._save_history(
                    pattern_id=old_pattern["id"],
                    intent_type=intent_type,
                    old_data=old_pattern,
                    new_data={
                        "keywords": new_keywords or old_pattern.get("keywords"),
                        "required_keywords": new_required or old_pattern.get("required_keywords"),
                        "exclude_keywords": new_exclude or old_pattern.get("exclude_keywords"),
                        "priority": new_priority or old_pattern.get("priority"),
                    },
                    change_type=ChangeType.AUTO_OPTIMIZE if auto_apply else ChangeType.UPDATE,
                    applied_by=applied_by,
                )
            else:
                # Создаем новый паттерн в БД
                pattern_id = await self._create_pattern(
                    intent_type=intent_type,
                    keywords=new_keywords or [],
                    required_keywords=new_required or [],
                    exclude_keywords=new_exclude or [],
                    priority=new_priority or 5,
                )
                
                # Записываем историю
                await self._save_history(
                    pattern_id=pattern_id,
                    intent_type=intent_type,
                    old_data={},
                    new_data={
                        "keywords": new_keywords,
                        "required_keywords": new_required,
                        "exclude_keywords": new_exclude,
                        "priority": new_priority,
                    },
                    change_type=ChangeType.CREATE,
                    applied_by=applied_by,
                )
            
            # Обновляем статус улучшения
            status = ImprovementStatus.AUTO_APPLIED if auto_apply else ImprovementStatus.APPLIED
            update_query = text("""
                UPDATE intent_pattern_improvements
                SET status = :status, applied_at = NOW()
                WHERE id = :id
            """)
            self.db.execute(update_query, {"status": status.value, "id": str(improvement_id)})
            self.db.commit()
            
            # Перезагружаем паттерны в IntentDetector
            await self._reload_patterns()
            
            return {
                "success": True,
                "intent_type": intent_type,
                "applied_changes": {
                    "keywords": new_keywords,
                    "required_keywords": new_required,
                    "exclude_keywords": new_exclude,
                    "priority": new_priority,
                }
            }
            
        except Exception as e:
            logger.error(f"Error applying improvement: {e}")
            self.db.rollback()
            return {"success": False, "error": str(e)}
    
    async def _get_pattern_by_id(self, pattern_id: int) -> Optional[Dict[str, Any]]:
        """Получает паттерн по ID."""
        query = text("""
            SELECT id, intent_type, keywords, required_keywords, exclude_keywords, priority
            FROM intent_patterns
            WHERE id = :id AND is_active = true
        """)
        
        row = self.db.execute(query, {"id": pattern_id}).fetchone()
        if not row:
            return None
        
        return {
            "id": row[0],
            "intent_type": row[1],
            "keywords": json.loads(row[2]) if row[2] else [],
            "required_keywords": json.loads(row[3]) if row[3] else [],
            "exclude_keywords": json.loads(row[4]) if row[4] else [],
            "priority": row[5],
        }
    
    async def _get_pattern_by_intent(self, intent_type: str) -> Optional[Dict[str, Any]]:
        """Получает паттерн по типу намерения."""
        query = text("""
            SELECT id, intent_type, keywords, required_keywords, exclude_keywords, priority
            FROM intent_patterns
            WHERE intent_type = :intent_type AND is_active = true
            LIMIT 1
        """)
        
        row = self.db.execute(query, {"intent_type": intent_type}).fetchone()
        if not row:
            return None
        
        return {
            "id": row[0],
            "intent_type": row[1],
            "keywords": json.loads(row[2]) if row[2] else [],
            "required_keywords": json.loads(row[3]) if row[3] else [],
            "exclude_keywords": json.loads(row[4]) if row[4] else [],
            "priority": row[5],
        }
    
    async def _update_pattern(
        self,
        pattern_id: int,
        keywords: Optional[List[str]] = None,
        required_keywords: Optional[List[str]] = None,
        exclude_keywords: Optional[List[str]] = None,
        priority: Optional[int] = None,
    ) -> None:
        """Обновляет паттерн в БД."""
        updates = []
        params = {"id": pattern_id}
        
        if keywords is not None:
            updates.append("keywords = :keywords")
            params["keywords"] = json.dumps(keywords)
        
        if required_keywords is not None:
            updates.append("required_keywords = :required_keywords")
            params["required_keywords"] = json.dumps(required_keywords)
        
        if exclude_keywords is not None:
            updates.append("exclude_keywords = :exclude_keywords")
            params["exclude_keywords"] = json.dumps(exclude_keywords)
        
        if priority is not None:
            updates.append("priority = :priority")
            params["priority"] = priority
        
        if updates:
            updates.append("version = version + 1")
            query = text(f"""
                UPDATE intent_patterns
                SET {', '.join(updates)}
                WHERE id = :id
            """)
            self.db.execute(query, params)
            self.db.commit()
    
    async def _create_pattern(
        self,
        intent_type: str,
        keywords: List[str],
        required_keywords: List[str],
        exclude_keywords: List[str],
        priority: int,
    ) -> int:
        """Создает новый паттерн в БД."""
        query = text("""
            INSERT INTO intent_patterns
            (intent_type, keywords, required_keywords, exclude_keywords, priority, is_active, is_system)
            VALUES
            (:intent_type, :keywords, :required_keywords, :exclude_keywords, :priority, true, false)
            RETURNING id
        """)
        
        result = self.db.execute(query, {
            "intent_type": intent_type,
            "keywords": json.dumps(keywords),
            "required_keywords": json.dumps(required_keywords),
            "exclude_keywords": json.dumps(exclude_keywords),
            "priority": priority,
        })
        
        self.db.commit()
        row = result.fetchone()
        return row[0]
    
    async def _save_history(
        self,
        pattern_id: int,
        intent_type: str,
        old_data: Dict[str, Any],
        new_data: Dict[str, Any],
        change_type: ChangeType,
        applied_by: str,
        change_reason: Optional[str] = None,
    ) -> None:
        """Сохраняет историю изменений паттерна."""
        query = text("""
            INSERT INTO intent_pattern_history
            (pattern_id, intent_type, old_data, new_data, change_type, change_reason, applied_by)
            VALUES
            (:pattern_id, :intent_type, :old_data, :new_data, :change_type, :change_reason, :applied_by)
        """)
        
        self.db.execute(query, {
            "pattern_id": pattern_id,
            "intent_type": intent_type,
            "old_data": json.dumps(old_data),
            "new_data": json.dumps(new_data),
            "change_type": change_type.value,
            "change_reason": change_reason,
            "applied_by": applied_by,
        })
        self.db.commit()
    
    async def _reload_patterns(self) -> None:
        """Перезагружает паттерны в IntentDetector."""
        # Для синхронизации с динамическими паттернами из БД
        # Это будет реализовано в make_patterns_dynamic
        pass


def get_pattern_optimizer(db: Session) -> PatternOptimizer:
    """Создает экземпляр оптимизатора паттернов."""
    return PatternOptimizer(db)
