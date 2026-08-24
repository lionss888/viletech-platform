"""Tests for AI Chat Processor."""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from app.ai.chat_processor import AIChatProcessor, ChatRequest, ChatMessage


@pytest.fixture
def chat_processor():
    """Создает экземпляр AI Chat Processor."""
    return AIChatProcessor()


@pytest.fixture
def sample_chat_request():
    """Создает тестовый запрос чата."""
    return ChatRequest(
        model="llama3.2:3b-instruct-q4_0",
        messages=[
            ChatMessage(role="user", content="Hello, how are you?")
        ],
        conversation_id="test-conv-123",
        use_rag=False,
        use_smart_prompts=False,
        stream=False
    )


class TestAIChatProcessor:
    """Тесты для AI Chat Processor."""
    
    @pytest.mark.asyncio
    async def test_process_chat_basic(self, chat_processor, sample_chat_request):
        """Тест базовой обработки чата."""
        with patch('app.ai.chat_processor.ollama_client') as mock_client:
            # Настройка мока
            mock_client.chat = AsyncMock(return_value={
                "message": {"content": "Hello! I'm doing well, thank you."},
                "tokens": {"prompt": 10, "completion": 15}
            })
            
            # Выполнение теста
            response = await chat_processor.process_chat(sample_chat_request)
            
            # Проверки
            assert response is not None
            assert response.message.role == "assistant"
            assert response.message.content == "Hello! I'm doing well, thank you."
            assert response.model == "llama3.2:3b-instruct-q4_0"
            assert "processing_time" in response.metadata
            assert response.metadata["use_rag"] is False
            assert response.metadata["use_smart_prompts"] is False
    
    @pytest.mark.asyncio
    async def test_process_chat_with_rag(self, chat_processor):
        """Тест обработки чата с RAG."""
        request = ChatRequest(
            model="llama3.2:3b-instruct-q4_0",
            messages=[
                ChatMessage(role="user", content="What is RAG?")
            ],
            conversation_id="test-conv-456",
            use_rag=True,
            use_smart_prompts=False,
            stream=False
        )
        
        with patch('app.ai.chat_processor.ollama_client') as mock_client, \
             patch('app.ai.chat_processor.rag_system') as mock_rag:
            
            # Настройка моков
            mock_rag.search = AsyncMock(return_value=[
                {"content": "RAG stands for Retrieval-Augmented Generation"}
            ])
            mock_rag.add_message = AsyncMock()
            
            mock_client.chat = AsyncMock(return_value={
                "message": {"content": "RAG is a technique that combines retrieval and generation."},
                "tokens": {"prompt": 20, "completion": 25}
            })
            
            # Выполнение теста
            response = await chat_processor.process_chat(request)
            
            # Проверки
            assert response is not None
            assert response.metadata["use_rag"] is True
            mock_rag.search.assert_called_once()
            mock_rag.add_message.assert_called()
    
    @pytest.mark.asyncio
    async def test_process_chat_with_smart_prompts(self, chat_processor):
        """Тест обработки чата с умными промптами."""
        request = ChatRequest(
            model="llama3.2:3b-instruct-q4_0",
            messages=[
                ChatMessage(role="user", content="Explain AI")
            ],
            conversation_id="test-conv-789",
            use_rag=False,
            use_smart_prompts=True,
            stream=False
        )
        
        with patch('app.ai.chat_processor.ollama_client') as mock_client:
            # Настройка мока
            mock_client.chat = AsyncMock(return_value={
                "message": {"content": "AI stands for Artificial Intelligence..."},
                "tokens": {"prompt": 30, "completion": 50}
            })
            
            # Выполнение теста
            response = await chat_processor.process_chat(request)
            
            # Проверки
            assert response is not None
            assert response.metadata["use_smart_prompts"] is True
    
    @pytest.mark.asyncio
    async def test_enhance_prompt(self, chat_processor):
        """Тест улучшения промпта."""
        original_prompt = "Tell me about Python"
        
        # Выполнение теста
        enhanced = await chat_processor._enhance_prompt(original_prompt)
        
        # Проверки
        assert enhanced is not None
        assert len(enhanced) > len(original_prompt)
        assert "Python" in enhanced
        assert "detailed" in enhanced.lower()
    
    @pytest.mark.asyncio
    async def test_get_rag_context(self, chat_processor):
        """Тест получения RAG контекста."""
        request = ChatRequest(
            model="llama3.2:3b-instruct-q4_0",
            messages=[
                ChatMessage(role="user", content="What is machine learning?")
            ],
            conversation_id="test-conv-ml",
            use_rag=True
        )
        
        with patch('app.ai.chat_processor.rag_system') as mock_rag:
            # Настройка мока
            mock_rag.search = AsyncMock(return_value=[
                {"content": "Machine learning is a subset of AI"},
                {"content": "ML algorithms learn from data"}
            ])
            
            # Выполнение теста
            context = await chat_processor._get_rag_context(request)
            
            # Проверки
            assert context is not None
            assert "Machine learning is a subset of AI" in context
            assert "ML algorithms learn from data" in context
            mock_rag.search.assert_called_once_with(
                query="What is machine learning?",
                conversation_id="test-conv-ml",
                limit=3
            )
    
    @pytest.mark.asyncio
    async def test_get_rag_context_no_messages(self, chat_processor):
        """Тест получения RAG контекста без сообщений."""
        request = ChatRequest(
            model="llama3.2:3b-instruct-q4_0",
            messages=[],
            conversation_id="test-conv-empty",
            use_rag=True
        )
        
        # Выполнение теста
        context = await chat_processor._get_rag_context(request)
        
        # Проверки
        assert context is None
    
    @pytest.mark.asyncio
    async def test_prepare_messages_basic(self, chat_processor, sample_chat_request):
        """Тест подготовки сообщений."""
        with patch('app.ai.chat_processor.get_system_prompt') as mock_prompt:
            # Настройка мока
            mock_prompt.return_value = "You are a helpful assistant."
            
            # Выполнение теста
            messages = await chat_processor._prepare_messages(sample_chat_request)
            
            # Проверки
            assert len(messages) >= 2  # Системный промпт + пользовательское сообщение
            assert messages[0]["role"] == "system"
            assert messages[0]["content"] == "You are a helpful assistant."
            assert messages[1]["role"] == "user"
            assert messages[1]["content"] == "Hello, how are you?"
    
    @pytest.mark.asyncio
    async def test_prepare_messages_with_custom_system_prompt(self, chat_processor):
        """Тест подготовки сообщений с кастомным системным промптом."""
        request = ChatRequest(
            model="llama3.2:3b-instruct-q4_0",
            messages=[
                ChatMessage(role="user", content="Hello")
            ],
            conversation_id="test-conv",
            system_prompt="You are a coding assistant."
        )
        
        # Выполнение теста
        messages = await chat_processor._prepare_messages(request)
        
        # Проверки
        assert messages[0]["role"] == "system"
        assert messages[0]["content"] == "You are a coding assistant."
    
    def test_chat_request_validation(self):
        """Тест валидации запроса чата."""
        # Валидный запрос
        valid_request = ChatRequest(
            model="llama3.2:3b-instruct-q4_0",
            messages=[ChatMessage(role="user", content="Hello")],
            conversation_id="test-conv"
        )
        assert valid_request.model == "llama3.2:3b-instruct-q4_0"
        assert len(valid_request.messages) == 1
        assert valid_request.use_rag is False  # Значение по умолчанию
        assert valid_request.stream is False  # Значение по умолчанию
    
    def test_chat_message_validation(self):
        """Тест валидации сообщения чата."""
        message = ChatMessage(role="user", content="Test message")
        assert message.role == "user"
        assert message.content == "Test message"
