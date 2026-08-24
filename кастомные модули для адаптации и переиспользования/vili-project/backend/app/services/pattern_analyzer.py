"""Pattern Analyzer Service with LLM-based analysis.

This module provides functionality for analyzing intent recognition patterns
and suggesting improvements using LLM analysis of recognition logs.
"""

import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.services.llm_service import LLMService
from app.services.intent_log_service import IntentLogService
from app.database.schemas.intent_log import (
    IntentLogResponse,
    PatternImprovementCreate,
    PatternAnalysisResult,
)
from app.database.schemas.intent import IntentType

logger = logging.getLogger(__name__)


# Системный промпт для анализа паттернов
PATTERN_ANALYSIS_SYSTEM_PROMPT = """Ты — эксперт по анализу паттернов распознавания намерений в чат-ботах.

Твоя задача — анализировать логи распознавания и предлагать улучшения паттернов.

Текущая система использует keyword-based matching:
- keywords: список ключевых слов (подстроки)
- required_keywords: обязательные слова (ИЛИ логика - достаточно одного)
- exclude_keywords: исключающие слова (любое совпадение отбрасывает паттерн)
- priority: приоритет паттерна (1-10, выше = важнее)

Уверенность (confidence) вычисляется как:
- (количество совпадений keywords / всего keywords) + 0.3 (бонус за required)
- Максимум 1.0

Анализируй:
1. Запросы с низкой уверенностью (< 0.7) - возможно, нужны новые ключевые слова
2. Запросы, попавшие в CHAT вместо специфичного intent - нужно расширить паттерн
3. Конфликты между паттернами - один запрос матчится несколькими

Отвечай в формате JSON:
{
  "issues": [
    {
      "pattern_intent": "intent_type",
      "issue_type": "missing_keywords|low_confidence|wrong_match|conflict",
      "description": "описание проблемы",
      "example_messages": ["пример1", "пример2"],
      "severity": "low|medium|high"
    }
  ],
  "improvements": [
    {
      "intent_type": "intent_type",
      "suggested_keywords": ["слово1", "слово2"],
      "suggested_required_keywords": ["слово"],
      "suggested_exclude_keywords": [],
      "suggested_priority": 8,
      "confidence": 0.85,
      "reason": "причина улучшения"
    }
  ]
}
"""


class PatternAnalyzer:
    """Анализатор паттернов распознавания с использованием LLM."""
    
    def __init__(self, db: Session):
        """Инициализация анализатора.
        
        Args:
            db: SQLAlchemy сессия
        """
        self.db = db
        self.llm_service = LLMService()
        self.log_service = IntentLogService(db)
    
    async def analyze_low_confidence_requests(
        self,
        threshold: float = 0.7,
        period_hours: int = 24,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Анализирует запросы с низкой уверенностью.
        
        Args:
            threshold: Порог уверенности
            period_hours: Период анализа в часах
            limit: Максимальное количество запросов
            
        Returns:
            Список проблем с рекомендациями
        """
        # Получаем логи с низкой уверенностью
        logs = await self.log_service.get_low_confidence_logs(
            threshold=threshold,
            period_hours=period_hours,
            limit=limit
        )
        
        if not logs:
            return []
        
        # Группируем по intent
        by_intent: Dict[str, List[IntentLogResponse]] = {}
        for log in logs:
            intent = log.detected_intent
            if intent not in by_intent:
                by_intent[intent] = []
            by_intent[intent].append(log)
        
        issues = []
        for intent, intent_logs in by_intent.items():
            issues.append({
                "intent": intent,
                "count": len(intent_logs),
                "avg_confidence": sum(l.confidence for l in intent_logs) / len(intent_logs),
                "example_messages": [l.message for l in intent_logs[:5]],
                "issue_type": "low_confidence"
            })
        
        return issues
    
    async def analyze_failed_patterns(
        self,
        period_hours: int = 24,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Анализирует запросы, попавшие в CHAT вместо специфичных intent'ов.
        
        Args:
            period_hours: Период анализа в часах
            limit: Максимальное количество запросов
            
        Returns:
            Список потенциальных проблем
        """
        period_start = datetime.now() - timedelta(hours=period_hours)
        
        # Ищем запросы в CHAT с ключевыми словами, которые могут указывать на другие intent'ы
        query = text("""
            SELECT message, detected_intent, confidence, all_matches
            FROM intent_recognition_logs
            WHERE created_at >= :period_start
              AND detected_intent = 'chat'
              AND (
                message ILIKE '%заяв%' OR message ILIKE '%платеж%' OR
                message ILIKE '%оператор%' OR message ILIKE '%отчет%' OR
                message ILIKE '%compliance%' OR message ILIKE '%аналитик%'
              )
            ORDER BY created_at DESC
            LIMIT :limit
        """)
        
        rows = self.db.execute(query, {
            "period_start": period_start,
            "limit": limit
        }).fetchall()
        
        issues = []
        for row in rows:
            message = row[0]
            all_matches = json.loads(row[3]) if row[3] else []
            
            # Определяем, какой intent мог бы подойти
            potential_intent = self._guess_intent(message)
            
            if potential_intent:
                issues.append({
                    "message": message,
                    "current_intent": "chat",
                    "potential_intent": potential_intent,
                    "all_matches": all_matches,
                    "issue_type": "missed_pattern"
                })
        
        return issues
    
    def _guess_intent(self, message: str) -> Optional[str]:
        """Пытается определить потенциальный intent по сообщению."""
        message_lower = message.lower()
        
        keywords_to_intent = {
            ("заяв", "платеж", "платёж"): "list_form_payments",
            ("оператор", "аналитик", "метрик"): "operator_analytics",
            ("отчет", "отчёт", "сформируй"): "create_report",
            ("compliance", "санкци", "aml"): "check_compliance",
        }
        
        for keywords, intent in keywords_to_intent.items():
            if any(kw in message_lower for kw in keywords):
                return intent
        
        return None
    
    async def get_pattern_stats(
        self,
        period_hours: int = 24,
    ) -> List[Dict[str, Any]]:
        """Получает статистику по каждому паттерну.
        
        Args:
            period_hours: Период анализа
            
        Returns:
            Статистика по паттернам
        """
        period_start = datetime.now() - timedelta(hours=period_hours)
        
        query = text("""
            SELECT 
                detected_intent,
                COUNT(*) as total,
                AVG(confidence) as avg_confidence,
                SUM(CASE WHEN confidence < 0.7 THEN 1 ELSE 0 END) as low_conf,
                SUM(CASE WHEN confidence >= 0.85 THEN 1 ELSE 0 END) as high_conf
            FROM intent_recognition_logs
            WHERE created_at >= :period_start
            GROUP BY detected_intent
            ORDER BY total DESC
        """)
        
        rows = self.db.execute(query, {"period_start": period_start}).fetchall()
        
        return [
            {
                "intent": row[0],
                "total_matches": row[1],
                "avg_confidence": float(row[2]) if row[2] else 0,
                "low_confidence_count": row[3] or 0,
                "high_confidence_count": row[4] or 0,
            }
            for row in rows
        ]
    
    async def run_llm_analysis(
        self,
        period_hours: int = 24,
        min_confidence_threshold: float = 0.7,
    ) -> PatternAnalysisResult:
        """Запускает полный анализ паттернов с использованием LLM.
        
        Args:
            period_hours: Период анализа
            min_confidence_threshold: Порог уверенности
            
        Returns:
            PatternAnalysisResult с результатами анализа
        """
        # Собираем данные для анализа
        low_conf_issues = await self.analyze_low_confidence_requests(
            threshold=min_confidence_threshold,
            period_hours=period_hours,
            limit=30
        )
        
        failed_issues = await self.analyze_failed_patterns(
            period_hours=period_hours,
            limit=30
        )
        
        pattern_stats = await self.get_pattern_stats(period_hours=period_hours)
        
        # Получаем текущие паттерны
        current_patterns = self._get_current_patterns()
        
        # Формируем промпт для LLM
        analysis_data = {
            "low_confidence_issues": low_conf_issues,
            "failed_patterns": failed_issues,
            "pattern_stats": pattern_stats,
            "current_patterns": current_patterns,
        }
        
        prompt = f"""Проанализируй данные о распознавании намерений и предложи улучшения паттернов.

**Текущие паттерны:**
{json.dumps(current_patterns, ensure_ascii=False, indent=2)}

**Запросы с низкой уверенностью (< {min_confidence_threshold}):**
{json.dumps(low_conf_issues, ensure_ascii=False, indent=2)}

**Запросы, попавшие в CHAT вместо специфичного intent:**
{json.dumps(failed_issues, ensure_ascii=False, indent=2)}

**Статистика по паттернам за {period_hours}ч:**
{json.dumps(pattern_stats, ensure_ascii=False, indent=2)}

Проанализируй эти данные и предложи конкретные улучшения паттернов в формате JSON.
"""
        
        try:
            # Вызываем LLM для анализа
            response = await self.llm_service.complete(
                prompt=prompt,
                system_prompt=PATTERN_ANALYSIS_SYSTEM_PROMPT,
                temperature=0.3,  # Более детерминированный ответ
                max_tokens=2000,
            )
            
            # Парсим ответ LLM
            llm_result = self._parse_llm_response(response.get("content", ""))
            
        except Exception as e:
            logger.error(f"LLM analysis failed: {e}")
            llm_result = {"issues": [], "improvements": []}
        
        # Формируем результат
        total_logs = sum(s.get("total_matches", 0) for s in pattern_stats)
        low_conf_count = sum(s.get("low_confidence_count", 0) for s in pattern_stats)
        
        suggested_improvements = []
        for imp in llm_result.get("improvements", []):
            try:
                suggested_improvements.append(PatternImprovementCreate(
                    intent_type=imp.get("intent_type", ""),
                    suggested_keywords=imp.get("suggested_keywords"),
                    suggested_required_keywords=imp.get("suggested_required_keywords"),
                    suggested_exclude_keywords=imp.get("suggested_exclude_keywords"),
                    suggested_priority=imp.get("suggested_priority"),
                    confidence=imp.get("confidence", 0.5),
                    analysis_data={"reason": imp.get("reason", "")}
                ))
            except Exception as e:
                logger.warning(f"Failed to parse improvement: {e}")
        
        return PatternAnalysisResult(
            analyzed_logs_count=total_logs,
            low_confidence_count=low_conf_count,
            potential_issues=llm_result.get("issues", []) + low_conf_issues + failed_issues,
            suggested_improvements=suggested_improvements,
            analysis_timestamp=datetime.now()
        )
    
    def _get_current_patterns(self) -> List[Dict[str, Any]]:
        """Получает текущие паттерны из IntentDetector."""
        from app.services.intent_detector import get_intent_detector
        
        detector = get_intent_detector()
        patterns = []
        
        for pattern in detector.patterns:
            patterns.append({
                "intent": pattern.intent.value,
                "keywords": pattern.keywords,
                "required_keywords": pattern.required_keywords,
                "exclude_keywords": pattern.exclude_keywords,
                "priority": pattern.priority
            })
        
        return patterns
    
    def _parse_llm_response(self, content: str) -> Dict[str, Any]:
        """Парсит ответ LLM в структурированный формат."""
        # Пытаемся извлечь JSON из ответа
        try:
            # Ищем JSON в ответе
            import re
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass
        
        # Если JSON не найден, возвращаем пустой результат
        logger.warning(f"Could not parse LLM response as JSON: {content[:200]}...")
        return {"issues": [], "improvements": []}


# Singleton instance
_analyzer_instance: Optional[PatternAnalyzer] = None


def get_pattern_analyzer(db: Session) -> PatternAnalyzer:
    """Создает экземпляр анализатора паттернов."""
    return PatternAnalyzer(db)
