"""Unit tests for Chat Handlers."""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from app.services.chat_handlers.base_handler import BaseHandler, ChatResponseData
from app.services.chat_handlers.operator_handler import OperatorHandler
from app.services.chat_handlers.report_handler import ReportHandler
from app.services.chat_handlers.form_payment_handler import FormPaymentHandler
from app.database.schemas.intent import IntentResult, IntentType, EntityType, ExtractedEntity


class TestBaseHandler:
    """Тесты для BaseHandler."""
    
    def test_format_percentage(self):
        """Тест форматирования процентов."""
        # Создаём mock для db
        db = Mock()
        
        # Создаём конкретную реализацию для теста
        class ConcreteHandler(BaseHandler):
            async def handle(self, intent_result):
                pass
        
        handler = ConcreteHandler(db)
        
        assert handler.format_percentage(0.95) == "95.0%"
        assert handler.format_percentage(0.123) == "12.3%"
        assert handler.format_percentage(1.0) == "100.0%"
    
    def test_format_currency(self):
        """Тест форматирования валюты."""
        db = Mock()
        
        class ConcreteHandler(BaseHandler):
            async def handle(self, intent_result):
                pass
        
        handler = ConcreteHandler(db)
        
        assert handler.format_currency(1000.50, "USD") == "1,000.50 USD"
        assert handler.format_currency(1234567.89, "EUR") == "1,234,567.89 EUR"
    
    def test_create_link(self):
        """Тест создания markdown ссылки."""
        db = Mock()
        
        class ConcreteHandler(BaseHandler):
            async def handle(self, intent_result):
                pass
        
        handler = ConcreteHandler(db)
        
        link = handler.create_link("Дашборд", "/operators/")
        assert link == "[Дашборд](/operators/)"
    
    def test_create_action(self):
        """Тест создания объекта действия."""
        db = Mock()
        
        class ConcreteHandler(BaseHandler):
            async def handle(self, intent_result):
                pass
        
        handler = ConcreteHandler(db)
        
        action = handler.create_action("link", "Открыть", url="/page")
        assert action == {"type": "link", "label": "Открыть", "url": "/page"}
        
        action_with_data = handler.create_action("create", "Создать", data={"entity": "payment"})
        assert action_with_data == {"type": "create", "label": "Создать", "data": {"entity": "payment"}}


class TestChatResponseData:
    """Тесты для ChatResponseData."""
    
    def test_default_values(self):
        """Тест значений по умолчанию."""
        response = ChatResponseData(answer="Test answer")
        
        assert response.answer == "Test answer"
        assert response.context_used is True
        assert response.model == "vili"
        assert response.sources is None
        assert response.links is None
        assert response.actions is None
    
    def test_with_all_fields(self):
        """Тест с заполненными полями."""
        response = ChatResponseData(
            answer="Test answer",
            context_used=False,
            model="vili-analytics",
            links={"Link": "/url"},
            actions=[{"type": "link", "label": "Click"}],
            embedded_data={"type": "test"}
        )
        
        assert response.model == "vili-analytics"
        assert response.links == {"Link": "/url"}
        assert len(response.actions) == 1


class TestFormPaymentHandler:
    """Тесты для FormPaymentHandler."""
    
    @pytest.fixture
    def handler(self):
        """Создание экземпляра обработчика."""
        db = Mock()
        return FormPaymentHandler(db)
    
    @pytest.fixture
    def intent_result_list(self):
        """Intent result для списка заявок."""
        return IntentResult(
            intent=IntentType.LIST_FORM_PAYMENTS,
            confidence=1.0,
            entities=[],
            original_message="Покажи все заявки"
        )
    
    @pytest.fixture
    def intent_result_status(self):
        """Intent result для статуса заявки."""
        return IntentResult(
            intent=IntentType.GET_FORM_PAYMENT_STATUS,
            confidence=1.0,
            entities=[
                ExtractedEntity(
                    type=EntityType.FORM_PAYMENT_ID,
                    value="12345",
                    raw_text="#12345"
                )
            ],
            original_message="Статус заявки #12345"
        )
    
    @pytest.mark.asyncio
    async def test_handle_list_not_configured(self, handler, intent_result_list):
        """Тест обработки списка заявок без настроенной интеграции."""
        handler.fea_stage_configured = False
        
        result = await handler.handle(intent_result_list)
        
        assert "fea-stage" in result.answer
        assert "настройки" in result.answer.lower() or "настрок" in result.answer.lower()
        assert result.embedded_data["integration_status"] == "pending_configuration"
    
    @pytest.mark.asyncio
    async def test_handle_status_not_configured(self, handler, intent_result_status):
        """Тест обработки статуса заявки без настроенной интеграции."""
        handler.fea_stage_configured = False
        
        result = await handler.handle(intent_result_status)
        
        assert "fea-stage" in result.answer
        assert result.embedded_data["payment_id"] == "12345"


class TestReportHandler:
    """Тесты для ReportHandler."""
    
    @pytest.fixture
    def mock_operator_service(self):
        """Mock для OperatorService."""
        service = Mock()
        service.get_operators_list = AsyncMock()
        return service
    
    @pytest.fixture
    def intent_result_report(self):
        """Intent result для создания отчёта."""
        return IntentResult(
            intent=IntentType.CREATE_REPORT,
            confidence=1.0,
            entities=[
                ExtractedEntity(
                    type=EntityType.REPORT_TYPE,
                    value="operators",
                    raw_text="операторы"
                )
            ],
            original_message="Создай отчёт по операторам"
        )
    
    @pytest.mark.asyncio
    async def test_handle_creates_report(self, intent_result_report):
        """Тест создания отчёта."""
        db = Mock()
        handler = ReportHandler(db)
        
        # Mock operator service
        mock_list = Mock()
        mock_list.total = 10
        mock_list.team_stats = {"avg_compliance_score": 0.9, "avg_success_rate": 0.95}
        mock_list.operators = []
        
        with patch.object(handler, 'operator_service') as mock_service:
            mock_service.get_operators_list = AsyncMock(return_value=mock_list)
            
            result = await handler.handle(intent_result_report)
            
            assert "Отчёт" in result.answer
            assert result.model == "vili-reports"
            assert result.embedded_data["report_type"] == "operators"
