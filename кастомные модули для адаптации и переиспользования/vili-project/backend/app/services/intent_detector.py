"""Intent Detection Service for Universal Chat.

This module provides intent recognition capabilities for the VILI chat,
enabling routing of user requests to appropriate handlers (analytics,
reports, form payments, etc.).

Based on keyword patterns with fallback to regular chat.
Supports dynamic pattern loading from database with hot reload.
"""

import re
import json
import logging
from typing import Optional, Dict, Any, List, Tuple
from uuid import UUID
from datetime import datetime

from app.database.schemas.intent import (
    IntentType,
    IntentResult,
    ExtractedEntity,
    EntityType,
    IntentPattern,
)

logger = logging.getLogger(__name__)


class IntentDetector:
    """Сервис распознавания намерений пользователя.
    
    Использует паттерны ключевых слов для определения типа запроса.
    При отсутствии совпадения возвращает CHAT (обычный чат).
    
    Поддерживает:
    - Статические паттерны (из кода, fallback)
    - Динамические паттерны (из БД)
    - Hot reload паттернов без рестарта
    """
    
    def __init__(self):
        """Инициализация детектора с паттернами."""
        self._static_patterns = self._build_patterns()
        self._db_patterns: List[IntentPattern] = []
        self._use_db_patterns = False
        self._last_reload: Optional[datetime] = None
        
        # Используем статические паттерны по умолчанию
        self.patterns = self._static_patterns
        self.period_patterns = self._build_period_patterns()
        self.status_patterns = self._build_status_patterns()
        # Кэш последних совпадений для логирования
        self._last_matches: List[Tuple[IntentPattern, float]] = []
    
    def reload_patterns_from_db(self, db_session) -> bool:
        """Перезагружает паттерны из базы данных.
        
        Args:
            db_session: SQLAlchemy сессия
            
        Returns:
            True если паттерны загружены, False если используются статические
        """
        try:
            from sqlalchemy import text
            
            query = text("""
                SELECT intent_type, keywords, required_keywords, exclude_keywords, priority
                FROM intent_patterns
                WHERE is_active = true
                ORDER BY priority DESC
            """)
            
            rows = db_session.execute(query).fetchall()
            
            if not rows:
                logger.info("No patterns in DB, using static patterns")
                self._use_db_patterns = False
                self.patterns = self._static_patterns
                return False
            
            # Преобразуем в IntentPattern
            db_patterns = []
            for row in rows:
                try:
                    intent_type = IntentType(row[0])
                    keywords = json.loads(row[1]) if row[1] else []
                    required = json.loads(row[2]) if row[2] else []
                    exclude = json.loads(row[3]) if row[3] else []
                    priority = row[4] or 5
                    
                    db_patterns.append(IntentPattern(
                        intent=intent_type,
                        keywords=keywords,
                        required_keywords=required,
                        exclude_keywords=exclude,
                        priority=priority
                    ))
                except (ValueError, json.JSONDecodeError) as e:
                    logger.warning(f"Failed to parse pattern {row[0]}: {e}")
                    continue
            
            if db_patterns:
                self._db_patterns = db_patterns
                self._use_db_patterns = True
                self.patterns = self._db_patterns
                self._last_reload = datetime.now()
                logger.info(f"Loaded {len(db_patterns)} patterns from DB")
                return True
            else:
                logger.info("No valid patterns in DB, using static patterns")
                self._use_db_patterns = False
                self.patterns = self._static_patterns
                return False
                
        except Exception as e:
            logger.error(f"Failed to reload patterns from DB: {e}")
            self._use_db_patterns = False
            self.patterns = self._static_patterns
            return False
    
    def force_static_patterns(self) -> None:
        """Принудительно использует статические паттерны."""
        self._use_db_patterns = False
        self.patterns = self._static_patterns
        logger.info("Forced static patterns")
    
    def get_patterns_info(self) -> Dict[str, Any]:
        """Возвращает информацию о текущих паттернах.
        
        Returns:
            Словарь с информацией о паттернах
        """
        return {
            "source": "database" if self._use_db_patterns else "static",
            "count": len(self.patterns),
            "last_reload": self._last_reload.isoformat() if self._last_reload else None,
            "patterns": [
                {
                    "intent": p.intent.value,
                    "keywords_count": len(p.keywords),
                    "priority": p.priority
                }
                for p in self.patterns
            ]
        }
    
    def _build_patterns(self) -> List[IntentPattern]:
        """Создаёт список паттернов для распознавания."""
        return [
            # Аналитика оператора (высокий приоритет)
            IntentPattern(
                intent=IntentType.OPERATOR_ANALYTICS,
                keywords=["аналитик", "метрик", "показател", "производительност", "эффективност"],
                required_keywords=["оператор"],
                exclude_keywords=["список", "все", "отобраз", "сравни", "сравнен", "отчёт", "отчет", "создай", "сформируй", "заявк", "платеж"],
                priority=10
            ),
            # Список операторов
            IntentPattern(
                intent=IntentType.OPERATOR_LIST,
                keywords=["список", "все", "покажи", "отобраз"],
                required_keywords=["оператор"],
                exclude_keywords=["аналитик", "метрик", "показател", "производительност", "эффективност", "сравни", "сравнен"],
                priority=8
            ),
            # Сравнение операторов
            IntentPattern(
                intent=IntentType.OPERATOR_COMPARE,
                keywords=["сравни", "сравнен", "сопостав"],
                required_keywords=["оператор"],
                priority=9
            ),
            # Статистика операторов
            IntentPattern(
                intent=IntentType.OPERATOR_STATISTICS,
                keywords=["статистик", "общая", "команд", "отдел"],
                required_keywords=["оператор"],
                priority=7
            ),
            # Создание отчёта
            IntentPattern(
                intent=IntentType.CREATE_REPORT,
                keywords=["отчёт", "отчет", "создай", "сформируй", "сгенерируй"],
                exclude_keywords=["аналитик", "метрик", "показател"],
                priority=8
            ),
            # Список заявок (fea-stage)
            IntentPattern(
                intent=IntentType.LIST_FORM_PAYMENTS,
                keywords=["заяв", "платеж", "платёж", "список", "активн", "все", "покажи", "мне", "дай", "выведи", "отображ"],
                required_keywords=["заяв", "платеж", "платёж"],  # Должно быть упоминание заявки или платежа (любое - ИЛИ логика)
                exclude_keywords=["создай", "создать", "новую", "новый", "статус", "аналитик", "метрик", "показател", "оператор"],
                priority=9
            ),
            # Статус заявки
            IntentPattern(
                intent=IntentType.GET_FORM_PAYMENT_STATUS,
                keywords=["статус", "состояни"],
                required_keywords=["заяв"],
                exclude_keywords=["покажи", "список", "все", "активн", "создай", "создать"],
                priority=9
            ),
            # Создание заявки
            IntentPattern(
                intent=IntentType.CREATE_FORM_PAYMENT,
                keywords=["создай", "создать", "оформи", "новую", "новый"],
                required_keywords=["заяв"],
                exclude_keywords=["покажи", "список", "все", "активн"],
                priority=10
            ),
            # Compliance проверка
            IntentPattern(
                intent=IntentType.CHECK_COMPLIANCE,
                keywords=["провер", "compliance", "санкци", "aml", "kyc"],
                exclude_keywords=["как", "что", "где", "когда", "почему", "расскажи", "объясни"],  # Исключаем вопросы и общие запросы
                priority=7
            ),
            # Compliance события
            IntentPattern(
                intent=IntentType.COMPLIANCE_EVENTS,
                keywords=["событи", "нарушен", "инцидент"],
                required_keywords=["compliance"],
                exclude_keywords=["расскажи", "объясни", "как", "что"],
                priority=8
            ),
            # Анализ документа
            IntentPattern(
                intent=IntentType.ANALYZE_DOCUMENT,
                keywords=["анализ", "проанализируй", "разбер", "извлеки"],
                required_keywords=["документ", "файл"],
                priority=7
            ),
            # ============================================
            # Контрагенты (fea-stage)
            # ============================================
            # Список контрагентов
            IntentPattern(
                intent=IntentType.LIST_COUNTERPARTIES,
                keywords=["контрагент", "поставщик", "покупател", "партнер", "партнёр", "список", "все", "покажи", "мои", 
                          "из", "германи", "китай", "китаск", "турци", "росси", "сша", "оаэ"],  # страны указывают на фильтрацию списка
                required_keywords=["контрагент", "поставщик", "партнер", "партнёр"],
                exclude_keywords=["создай", "создать", "новый", "новую", "статус", "история", "запрос", "информаци", "детал", "подробн", "карточк"],
                priority=8
            ),
            # Детали контрагента (требует явного указания на получение информации)
            IntentPattern(
                intent=IntentType.GET_COUNTERPARTY,
                keywords=["контрагент", "информаци", "детал", "данные", "подробн", "карточк"],
                required_keywords=["информаци", "детал", "подробн", "карточк"],  # Требуем явное указание на детали
                exclude_keywords=["список", "все", "создай", "история", "запрос", "из"],  # "из страны" = фильтрация списка
                priority=9
            ),
            # История запросов контрагента
            IntentPattern(
                intent=IntentType.GET_COUNTERPARTY_REQUESTS,
                keywords=["истори", "запрос", "заявк", "платеж"],
                required_keywords=["контрагент"],
                exclude_keywords=["список", "все", "создай"],
                priority=9
            ),
            # ============================================
            # Контракты (fea-stage)
            # ============================================
            # Список контрактов
            IntentPattern(
                intent=IntentType.LIST_CONTRACTS,
                keywords=["контракт", "договор", "агентск", "список", "все", "покажи", "мои"],
                required_keywords=["контракт", "договор"],
                exclude_keywords=["создай", "создать", "новый", "статус", "diadoc", "диадок"],
                priority=8
            ),
            # Детали контракта
            IntentPattern(
                intent=IntentType.GET_CONTRACT,
                keywords=["контракт", "договор", "информаци", "детал", "данные", "подробн"],
                required_keywords=["контракт", "договор"],
                exclude_keywords=["список", "все", "создай", "diadoc", "диадок"],
                priority=9
            ),
            # Статус контракта в Diadoc
            IntentPattern(
                intent=IntentType.GET_CONTRACT_DIADOC_STATUS,
                keywords=["статус", "diadoc", "диадок", "подписан", "подписание"],
                required_keywords=["контракт", "договор"],
                exclude_keywords=["список", "все", "создай"],
                priority=10
            ),
            # ============================================
            # Валюты (fea-stage)
            # ============================================
            # Курсы валют
            IntentPattern(
                intent=IntentType.GET_CURRENCY_RATES,
                keywords=["курс", "валют", "курсы", "доллар", "евро", "юань", "рубл", "usd", "eur", "cny", "rub"],
                required_keywords=["курс"],
                exclude_keywords=["создай", "установи", "изменить"],
                priority=9
            ),
            # Курс конкретной валюты
            IntentPattern(
                intent=IntentType.GET_CURRENCY_BY_SYMBOL,
                keywords=["курс", "доллар", "евро", "юань", "сколько", "стоит"],
                required_keywords=["доллар", "евро", "юань", "usd", "eur", "cny"],
                exclude_keywords=["все", "список"],
                priority=10
            ),
            # ============================================
            # Управление проектами (бизнес-методология)
            # ============================================
            IntentPattern(
                intent=IntentType.PROJECT_MANAGEMENT,
                keywords=["проект", "план", "этап", "milestone", "задач", "риск", 
                          "управлени", "методолог", "agile", "waterfall", "scrum", 
                          "kanban", "инициац", "планирован", "исполнен", "мониторинг",
                          "завершен", "wbs", "gantt", "гант", "спринт", "бэклог",
                          "стейкхолдер", "stakeholder", "ресурс", "бюджет", "срок",
                          "дедлайн", "deadline", "веха", "критический путь"],
                exclude_keywords=["платеж", "заявк", "оператор", "контрагент", "контракт", "валют"],
                priority=7
            ),
        ]
    
    def _build_period_patterns(self) -> Dict[str, int]:
        """Паттерны для извлечения периодов."""
        return {
            "день": 1,
            "неделя": 7,
            "неделю": 7,
            "месяц": 30,
            "квартал": 90,
            "год": 365,
            "7 дней": 7,
            "30 дней": 30,
            "90 дней": 90,
            "365 дней": 365,
        }
    
    def _build_status_patterns(self) -> Dict[str, str]:
        """Паттерны для извлечения статусов заявок."""
        return {
            "активн": "active",
            "в обработк": "processing",
            "на проверк": "pending_review",
            "одобрен": "approved",
            "отклонен": "rejected",
            "черновик": "draft",
            "завершен": "completed",
        }
    
    def detect_intent(self, message: str) -> IntentResult:
        """Распознаёт намерение пользователя.
        
        Args:
            message: Текст сообщения пользователя
            
        Returns:
            IntentResult: Результат распознавания с intent и entities
        """
        message_lower = message.lower()
        
        # Ищем совпадения с паттернами
        matches: List[Tuple[IntentPattern, float]] = []
        
        for pattern in self.patterns:
            confidence = self._match_pattern(message_lower, pattern)
            if confidence > 0:
                matches.append((pattern, confidence))
        
        # Сортируем по уверенности и приоритету (confidence важнее)
        matches.sort(key=lambda x: (x[1], x[0].priority), reverse=True)
        
        # Сохраняем все совпадения для логирования
        self._last_matches = matches.copy()
        
        if matches:
            best_pattern, confidence = matches[0]
            entities = self._extract_entities(message, best_pattern.intent)
            
            return IntentResult(
                intent=best_pattern.intent,
                confidence=confidence,
                entities=entities,
                original_message=message
            )
        
        # Fallback: обычный чат
        self._last_matches = []  # Нет совпадений
        return IntentResult(
            intent=IntentType.CHAT,
            confidence=1.0,
            entities=[],
            original_message=message
        )
    
    def get_last_matches(self) -> List[Tuple[IntentPattern, float]]:
        """Возвращает все совпадения последнего распознавания.
        
        Returns:
            Список кортежей (паттерн, уверенность)
        """
        return self._last_matches
    
    def _match_pattern(self, message: str, pattern: IntentPattern) -> float:
        """Проверяет соответствие сообщения паттерну.
        
        Returns:
            float: Уверенность совпадения (0.0 - нет, 1.0 - максимальная)
        """
        # Проверяем исключающие слова
        for exclude in pattern.exclude_keywords:
            if exclude in message:
                return 0.0
        
        # Проверяем обязательные слова (подстрока должна входить в сообщение)
        # Если required_keywords содержит несколько слов, достаточно одного (ИЛИ логика)
        if pattern.required_keywords:
            found_required = any(required in message for required in pattern.required_keywords)
            if not found_required:
                return 0.0
        
        # Считаем совпадения ключевых слов
        keyword_matches = 0
        for keyword in pattern.keywords:
            if keyword in message:
                keyword_matches += 1
        
        if keyword_matches == 0 and not pattern.required_keywords:
            return 0.0
        
        # Вычисляем уверенность
        if pattern.keywords:
            confidence = keyword_matches / len(pattern.keywords)
        else:
            confidence = 1.0 if pattern.required_keywords else 0.0
        
        return min(confidence + 0.3, 1.0)  # Бонус за required_keywords
    
    def _extract_entities(self, message: str, intent: IntentType) -> List[ExtractedEntity]:
        """Извлекает сущности из сообщения в зависимости от намерения."""
        entities = []
        message_lower = message.lower()
        
        # Извлекаем UUID (если есть)
        uuid_pattern = r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
        uuid_match = re.search(uuid_pattern, message, re.IGNORECASE)
        if uuid_match:
            try:
                uuid_value = UUID(uuid_match.group())
                # Определяем тип UUID по контексту
                if intent in [IntentType.OPERATOR_ANALYTICS, IntentType.OPERATOR_COMPARE]:
                    entities.append(ExtractedEntity(
                        type=EntityType.OPERATOR_ID,
                        value=str(uuid_value),
                        raw_text=uuid_match.group()
                    ))
                elif intent in [IntentType.GET_FORM_PAYMENT_STATUS, IntentType.LIST_FORM_PAYMENTS]:
                    entities.append(ExtractedEntity(
                        type=EntityType.FORM_PAYMENT_ID,
                        value=str(uuid_value),
                        raw_text=uuid_match.group()
                    ))
            except ValueError:
                pass
        
        # Извлекаем номер заявки (#12345)
        payment_num_pattern = r'#(\d+)'
        payment_match = re.search(payment_num_pattern, message)
        if payment_match:
            entities.append(ExtractedEntity(
                type=EntityType.FORM_PAYMENT_ID,
                value=payment_match.group(1),
                raw_text=payment_match.group()
            ))
        
        # Извлекаем период
        for pattern, days in self.period_patterns.items():
            if pattern in message_lower:
                entities.append(ExtractedEntity(
                    type=EntityType.PERIOD_DAYS,
                    value=days,
                    raw_text=pattern
                ))
                break
        
        # Извлекаем статус заявки
        for pattern, status in self.status_patterns.items():
            if pattern in message_lower:
                entities.append(ExtractedEntity(
                    type=EntityType.FORM_PAYMENT_STATUS,
                    value=status,
                    raw_text=pattern
                ))
                break
        
        # Извлекаем имя оператора (простой паттерн: после "оператора")
        operator_name_pattern = r'оператор[а-я]?\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)*)'
        name_match = re.search(operator_name_pattern, message, re.UNICODE)
        if name_match:
            entities.append(ExtractedEntity(
                type=EntityType.OPERATOR_NAME,
                value=name_match.group(1),
                raw_text=name_match.group()
            ))
        
        # Извлекаем тип отчёта
        if intent == IntentType.CREATE_REPORT:
            if "оператор" in message_lower:
                entities.append(ExtractedEntity(
                    type=EntityType.REPORT_TYPE,
                    value="operators",
                    raw_text="операторы"
                ))
            elif "compliance" in message_lower or "комплаенс" in message_lower:
                entities.append(ExtractedEntity(
                    type=EntityType.REPORT_TYPE,
                    value="compliance",
                    raw_text="compliance"
                ))
            elif "заяв" in message_lower or "платеж" in message_lower:
                entities.append(ExtractedEntity(
                    type=EntityType.REPORT_TYPE,
                    value="form_payments",
                    raw_text="заявки"
                ))
        
        # Извлекаем ID/имя контрагента
        if intent in [IntentType.GET_COUNTERPARTY, IntentType.GET_COUNTERPARTY_REQUESTS, 
                      IntentType.LIST_COUNTERPARTIES]:
            # UUID контрагента
            if uuid_match:
                entities.append(ExtractedEntity(
                    type=EntityType.COUNTERPARTY_ID,
                    value=uuid_match.group(),
                    raw_text=uuid_match.group()
                ))
            
            # Название контрагента (после "контрагент" или "контрагента")
            counterparty_name_pattern = r'контрагент[а-я]?\s+["\']?([A-Za-zА-ЯЁа-яё][A-Za-zА-ЯЁа-яё\s\.\-]+?)["\']?(?:\s|$|,|\.|!|\?)'
            cp_match = re.search(counterparty_name_pattern, message, re.UNICODE | re.IGNORECASE)
            if cp_match:
                name = cp_match.group(1).strip()
                if len(name) > 2:  # Минимальная длина имени
                    entities.append(ExtractedEntity(
                        type=EntityType.COUNTERPARTY_NAME,
                        value=name,
                        raw_text=cp_match.group()
                    ))
            
            # Страна контрагента
            country_patterns = {
                "германи": "Germany",
                "китай": "China",
                "китаск": "China",
                "турци": "Turkey",
                "турецк": "Turkey",
                "оаэ": "UAE",
                "эмират": "UAE",
                "росси": "Russia",
                "российск": "Russia",
                "сша": "USA",
                "америк": "USA",
            }
            for pattern, country in country_patterns.items():
                if pattern in message_lower:
                    entities.append(ExtractedEntity(
                        type=EntityType.COUNTERPARTY_COUNTRY,
                        value=country,
                        raw_text=pattern
                    ))
                    break
        
        # Извлекаем ID/номер контракта
        if intent in [IntentType.GET_CONTRACT, IntentType.GET_CONTRACT_DIADOC_STATUS,
                      IntentType.LIST_CONTRACTS]:
            # UUID контракта
            if uuid_match:
                entities.append(ExtractedEntity(
                    type=EntityType.CONTRACT_ID,
                    value=uuid_match.group(),
                    raw_text=uuid_match.group()
                ))
            
            # Номер контракта (формат АГ-XXX или подобный)
            contract_num_pattern = r'(?:№|#|номер)?\s*([А-ЯA-Z]{1,3}[-\s]?\d{1,6}(?:[-/]\d+)?)'
            contract_match = re.search(contract_num_pattern, message, re.IGNORECASE)
            if contract_match:
                entities.append(ExtractedEntity(
                    type=EntityType.CONTRACT_NUMBER,
                    value=contract_match.group(1),
                    raw_text=contract_match.group()
                ))
        
        # Извлекаем символ валюты
        if intent in [IntentType.GET_CURRENCY_RATES, IntentType.GET_CURRENCY_BY_SYMBOL]:
            currency_map = {
                "доллар": "USD",
                "usd": "USD",
                "евро": "EUR",
                "eur": "EUR",
                "юань": "CNY",
                "cny": "CNY",
                "юан": "CNY",
                "рубл": "RUB",
                "rub": "RUB",
                "фунт": "GBP",
                "gbp": "GBP",
                "йен": "JPY",
                "jpy": "JPY",
                "франк": "CHF",
                "chf": "CHF",
            }
            for pattern, symbol in currency_map.items():
                if pattern in message_lower:
                    entities.append(ExtractedEntity(
                        type=EntityType.CURRENCY_SYMBOL,
                        value=symbol,
                        raw_text=pattern
                    ))
                    break
            
            # Источник курса
            if "цб" in message_lower or "cbr" in message_lower or "центробанк" in message_lower:
                entities.append(ExtractedEntity(
                    type=EntityType.CURRENCY_SOURCE,
                    value="cbr",
                    raw_text="cbr"
                ))
            elif "openexchange" in message_lower or "биржев" in message_lower:
                entities.append(ExtractedEntity(
                    type=EntityType.CURRENCY_SOURCE,
                    value="openexchange",
                    raw_text="openexchange"
                ))
        
        # Извлекаем фазу проекта для управления проектами
        if intent == IntentType.PROJECT_MANAGEMENT:
            phase_patterns = {
                "инициац": "initiation",
                "старт": "initiation",
                "начал": "initiation",
                "планирован": "planning",
                "план": "planning",
                "исполнен": "execution",
                "реализац": "execution",
                "выполнен": "execution",
                "мониторинг": "monitoring",
                "контрол": "monitoring",
                "отслежива": "monitoring",
                "завершен": "closing",
                "закрыт": "closing",
                "финал": "closing",
            }
            for pattern, phase in phase_patterns.items():
                if pattern in message_lower:
                    entities.append(ExtractedEntity(
                        type=EntityType.PROJECT_PHASE,
                        value=phase,
                        raw_text=pattern
                    ))
                    break
        
        return entities
    
    def get_entity_value(
        self, 
        intent_result: IntentResult, 
        entity_type: EntityType, 
        default: Any = None
    ) -> Any:
        """Получает значение сущности из результата распознавания."""
        value = intent_result.get_entity(entity_type)
        return value if value is not None else default


# Singleton instance
_detector_instance: Optional[IntentDetector] = None


def get_intent_detector() -> IntentDetector:
    """Возвращает singleton экземпляр детектора."""
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = IntentDetector()
    return _detector_instance
