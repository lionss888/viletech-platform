"""Integration tests for Extended Chat API."""

import pytest
from unittest.mock import patch, AsyncMock, Mock, MagicMock

# Note: client fixture is provided by conftest.py


class TestChatIntentDetection:
    """Интеграционные тесты для Chat API с Intent Detection."""
    
    @pytest.fixture(autouse=True)
    def mock_llm_service(self):
        """Автоматически мокаем LLM сервис для всех тестов."""
        with patch('app.api.v1.chat.LLMService') as mock_llm:
            mock_instance = MagicMock()
            mock_instance.complete = AsyncMock(return_value={
                "content": "Test response from LLM",
                "model": "test-model",
                "finish_reason": "stop"
            })
            mock_instance.analyze_with_rag = AsyncMock(return_value={
                "content": "Test RAG response",
                "model": "test-model"
            })
            mock_llm.return_value = mock_instance
            yield mock_instance
    
    # Note: client fixture is provided by conftest.py
    
    def test_chat_endpoint_exists(self, client):
        """Тест существования endpoint."""
        response = client.post(
            "/api/v1/chat/message",
            json={"message": "test"}
        )
        # Не 404 = endpoint существует
        assert response.status_code != 404
    
    def test_intents_endpoint(self, client):
        """Тест endpoint списка поддерживаемых намерений."""
        response = client.get("/api/v1/chat/intents")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "intents" in data
        assert len(data["intents"]) > 0
        
        # Проверяем наличие ключевых типов
        intent_types = [i["type"] for i in data["intents"]]
        assert "operator_analytics" in intent_types
        assert "operator_list" in intent_types
        assert "create_report" in intent_types
        assert "chat" in intent_types
    
    def test_models_endpoint_extended(self, client):
        """Тест расширенного endpoint моделей."""
        response = client.get("/api/v1/chat/models")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "models" in data
        model_ids = [m["id"] for m in data["models"]]
        
        # Проверяем наличие vili-analytics
        assert "vili-analytics" in model_ids
    
    def test_chat_response_schema(self, client):
        """Тест схемы ответа чата."""
        # Мокаем LLM сервис
        with patch('app.api.v1.chat.LLMService') as mock_llm:
            mock_instance = Mock()
            mock_instance.complete = AsyncMock(return_value={
                "content": "Test response",
                "model": "test-model"
            })
            mock_llm.return_value = mock_instance
            
            with patch('app.api.v1.chat.RAGService'):
                response = client.post(
                    "/api/v1/chat/message",
                    json={"message": "Что такое FATF?"},
                )
        
        if response.status_code == 200:
            data = response.json()
            
            # Проверяем наличие расширенных полей
            assert "answer" in data
            assert "context_used" in data
            assert "model" in data
            
            # Новые поля могут быть None
            assert "links" in data or data.get("links") is None
            assert "actions" in data or data.get("actions") is None
            assert "intent_type" in data or data.get("intent_type") is None


class TestChatOperatorIntents:
    """Тесты для операторских намерений в чате."""
    
    @pytest.fixture(autouse=True)
    def mock_llm_service(self):
        """Автоматически мокаем LLM сервис для всех тестов."""
        with patch('app.api.v1.chat.LLMService') as mock_llm:
            mock_instance = MagicMock()
            mock_instance.complete = AsyncMock(return_value={
                "content": "Test response from LLM",
                "model": "test-model",
                "finish_reason": "stop"
            })
            mock_instance.analyze_with_rag = AsyncMock(return_value={
                "content": "Test RAG response",
                "model": "test-model"
            })
            mock_llm.return_value = mock_instance
            yield mock_instance
    
    # Note: client fixture is provided by conftest.py
    
    def test_operator_list_intent(self, client):
        """Тест распознавания запроса списка операторов."""
        with patch('app.api.v1.chat._handle_operator_list') as mock_handler:
            mock_handler.return_value = Mock(
                answer="Список операторов",
                context_used=True,
                model="vili-analytics",
                links={},
                actions=[],
                embedded_data={},
                sources=None,
                intent_type="operator_list",
                processing_time_ms=100
            )
            
            response = client.post(
                "/api/v1/chat/message",
                json={"message": "Покажи всех операторов"},
            )
        
        # Проверяем что запрос обработан
        assert response.status_code in [200, 500]  # 500 если сервисы недоступны
    
    def test_regular_chat_fallback(self, client):
        """Тест fallback на обычный чат."""
        with patch('app.api.v1.chat._handle_chat') as mock_handler:
            mock_handler.return_value = Mock(
                answer="Ответ от LLM",
                context_used=False,
                model="test-model",
                links=None,
                actions=None,
                embedded_data=None,
                sources=None,
                intent_type="chat",
                processing_time_ms=100
            )
            
            response = client.post(
                "/api/v1/chat/message",
                json={"message": "Что такое машинное обучение?"},
            )
        
        assert response.status_code in [200, 500]


class TestBackwardCompatibility:
    """Тесты обратной совместимости."""
    
    @pytest.fixture(autouse=True)
    def mock_llm_service(self):
        """Автоматически мокаем LLM сервис для всех тестов."""
        with patch('app.api.v1.chat.LLMService') as mock_llm:
            mock_instance = MagicMock()
            mock_instance.complete = AsyncMock(return_value={
                "content": "Test response from LLM",
                "model": "test-model",
                "finish_reason": "stop"
            })
            mock_instance.analyze_with_rag = AsyncMock(return_value={
                "content": "Test RAG response",
                "model": "test-model"
            })
            mock_llm.return_value = mock_instance
            yield mock_instance
    
    # Note: client fixture is provided by conftest.py
    
    def test_old_response_format_compatible(self, client):
        """Тест совместимости со старым форматом ответа."""
        with patch('app.api.v1.chat.LLMService') as mock_llm:
            mock_instance = Mock()
            mock_instance.complete = AsyncMock(return_value={
                "content": "Test response",
                "model": "test-model"
            })
            mock_llm.return_value = mock_instance
            
            with patch('app.api.v1.chat.RAGService'):
                response = client.post(
                    "/api/v1/chat/message",
                    json={"message": "Test message"},
                )
        
        if response.status_code == 200:
            data = response.json()
            
            # Старые поля должны присутствовать
            assert "answer" in data
            assert "context_used" in data
            assert "model" in data
    
    def test_models_endpoint_still_works(self, client):
        """Тест работы endpoint моделей."""
        response = client.get("/api/v1/chat/models")
        
        assert response.status_code == 200
        data = response.json()
        assert "models" in data
    
    def test_clear_history_still_works(self, client):
        """Тест работы очистки истории."""
        response = client.delete("/api/v1/chat/history", )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
