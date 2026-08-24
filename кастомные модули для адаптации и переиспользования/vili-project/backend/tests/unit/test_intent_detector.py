"""Unit tests for Intent Detector Service."""

import pytest
from app.services.intent_detector import IntentDetector, get_intent_detector
from app.database.schemas.intent import IntentType, EntityType


class TestIntentDetector:
    """Тесты для IntentDetector."""
    
    @pytest.fixture
    def detector(self):
        """Создание экземпляра детектора."""
        return IntentDetector()
    
    # ==========================================
    # Тесты распознавания намерений
    # ==========================================
    
    def test_detect_operator_analytics(self, detector):
        """Тест распознавания запроса аналитики оператора."""
        messages = [
            "Покажи аналитику оператора Иванова",
            "Метрики оператора за месяц",
            "Покажи показатели оператора",
            "Производительность оператора",
            "Эффективность оператора Петрова",
        ]
        
        for msg in messages:
            result = detector.detect_intent(msg)
            assert result.intent == IntentType.OPERATOR_ANALYTICS, f"Failed for: {msg}"
    
    def test_detect_operator_list(self, detector):
        """Тест распознавания запроса списка операторов."""
        messages = [
            "Покажи всех операторов",
            "Список операторов",
            "Отобрази операторов",
        ]
        
        for msg in messages:
            result = detector.detect_intent(msg)
            assert result.intent == IntentType.OPERATOR_LIST, f"Failed for: {msg}"
    
    def test_detect_operator_compare(self, detector):
        """Тест распознавания запроса сравнения операторов."""
        messages = [
            "Сравни операторов по compliance",
            "Сравнение операторов",
            "Сопоставь операторов",
        ]
        
        for msg in messages:
            result = detector.detect_intent(msg)
            assert result.intent == IntentType.OPERATOR_COMPARE, f"Failed for: {msg}"
    
    def test_detect_create_report(self, detector):
        """Тест распознавания запроса создания отчёта."""
        messages = [
            "Создай отчёт по операторам",
            "Сформируй отчет за месяц",
            "Сгенерируй отчёт",
        ]
        
        for msg in messages:
            result = detector.detect_intent(msg)
            assert result.intent == IntentType.CREATE_REPORT, f"Failed for: {msg}"
    
    def test_detect_list_form_payments(self, detector):
        """Тест распознавания запроса списка заявок."""
        messages = [
            "Покажи все заявки на платёж",
            "Активные заявки",
            "Список платежей",
        ]
        
        for msg in messages:
            result = detector.detect_intent(msg)
            assert result.intent == IntentType.LIST_FORM_PAYMENTS, f"Failed for: {msg}"
    
    def test_detect_create_form_payment(self, detector):
        """Тест распознавания запроса создания заявки."""
        messages = [
            "Создай заявку на платёж",
            "Создать новую заявку",
            "Оформи заявку",
        ]
        
        for msg in messages:
            result = detector.detect_intent(msg)
            assert result.intent == IntentType.CREATE_FORM_PAYMENT, f"Failed for: {msg}"
    
    def test_detect_chat_fallback(self, detector):
        """Тест fallback на обычный чат."""
        messages = [
            "Что такое FATF?",
            "Как проверить санкции?",
            "Привет, как дела?",
            "Расскажи о compliance",
        ]
        
        for msg in messages:
            result = detector.detect_intent(msg)
            assert result.intent == IntentType.CHAT, f"Failed for: {msg}"
    
    # ==========================================
    # Тесты извлечения сущностей
    # ==========================================
    
    def test_extract_operator_name(self, detector):
        """Тест извлечения имени оператора."""
        result = detector.detect_intent("Покажи аналитику оператора Иванов")
        
        assert result.has_entity(EntityType.OPERATOR_NAME)
        assert "Иванов" in result.get_entity(EntityType.OPERATOR_NAME)
    
    def test_extract_period_days(self, detector):
        """Тест извлечения периода."""
        test_cases = [
            ("Аналитика оператора за неделю", 7),
            ("Метрики оператора за месяц", 30),
            ("Статистика оператора за квартал", 90),
        ]
        
        for msg, expected_days in test_cases:
            result = detector.detect_intent(msg)
            assert result.get_entity(EntityType.PERIOD_DAYS) == expected_days, f"Failed for: {msg}"
    
    def test_extract_form_payment_id(self, detector):
        """Тест извлечения ID заявки."""
        result = detector.detect_intent("Статус заявки #12345")
        
        assert result.has_entity(EntityType.FORM_PAYMENT_ID)
        assert result.get_entity(EntityType.FORM_PAYMENT_ID) == "12345"
    
    def test_extract_uuid(self, detector):
        """Тест извлечения UUID."""
        uuid_str = "550e8400-e29b-41d4-a716-446655440000"
        result = detector.detect_intent(f"Аналитика оператора {uuid_str}")
        
        assert result.has_entity(EntityType.OPERATOR_ID)
        assert result.get_entity(EntityType.OPERATOR_ID) == uuid_str
    
    def test_extract_report_type(self, detector):
        """Тест извлечения типа отчёта."""
        test_cases = [
            ("Создай отчёт по операторам", "operators"),
            ("Сформируй отчёт по compliance", "compliance"),
        ]
        
        for msg, expected_type in test_cases:
            result = detector.detect_intent(msg)
            assert result.get_entity(EntityType.REPORT_TYPE) == expected_type, f"Failed for: {msg}"
    
    # ==========================================
    # Тесты вспомогательных методов
    # ==========================================
    
    def test_get_entity_with_default(self, detector):
        """Тест получения сущности с дефолтным значением."""
        result = detector.detect_intent("Покажи всех операторов")
        
        # Период не указан, должен вернуть default
        period = detector.get_entity_value(result, EntityType.PERIOD_DAYS, default=30)
        assert period == 30
    
    def test_intent_result_methods(self, detector):
        """Тест методов IntentResult."""
        result = detector.detect_intent("Аналитика оператора за месяц")
        
        assert result.has_entity(EntityType.PERIOD_DAYS) is True
        assert result.has_entity(EntityType.FORM_PAYMENT_ID) is False
        assert result.get_entity(EntityType.FORM_PAYMENT_ID) is None
    
    # ==========================================
    # Тесты singleton
    # ==========================================
    
    def test_get_intent_detector_singleton(self):
        """Тест singleton экземпляра."""
        detector1 = get_intent_detector()
        detector2 = get_intent_detector()
        
        assert detector1 is detector2
    
    # ==========================================
    # Тесты приоритетов
    # ==========================================
    
    def test_operator_analytics_priority_over_list(self, detector):
        """Тест приоритета аналитики над списком."""
        # "Покажи" может триггерить и list, но с аналитикой должна быть аналитика
        result = detector.detect_intent("Покажи аналитику оператора")
        assert result.intent == IntentType.OPERATOR_ANALYTICS
    
    def test_create_form_payment_priority(self, detector):
        """Тест приоритета создания заявки."""
        # "Создай заявку" должен быть CREATE, а не LIST
        result = detector.detect_intent("Создай новую заявку на платёж")
        assert result.intent == IntentType.CREATE_FORM_PAYMENT
