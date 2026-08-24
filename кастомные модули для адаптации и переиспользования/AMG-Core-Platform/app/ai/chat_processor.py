"""AI Chat Processor - только обработка AI запросов."""

import json
import time
from typing import Dict, List, Any, Optional, AsyncGenerator, Union
from pydantic import BaseModel

from app.ollama_client import ollama_client
from app.prompts import get_system_prompt
from app.learning.rag_system import rag_system
from app.utils.errors import OllamaError
from app.utils.logging import get_request_id


class ChatMessage(BaseModel):
    """Сообщение чата."""
    role: str
    content: str


class ChatRequest(BaseModel):
    """Запрос на обработку чата."""
    model: str
    messages: List[ChatMessage]
    conversation_id: str
    use_rag: bool = False
    use_smart_prompts: bool = False
    system_prompt: Optional[str] = None
    stream: bool = False


class ChatResponse(BaseModel):
    """Ответ обработки чата."""
    message: ChatMessage
    request_id: str
    model: str
    metadata: Dict[str, Any]


class AIChatProcessor:
    """Процессор AI чата - только AI обработка."""
    
    def __init__(self):
        self.request_id = get_request_id()
    
    async def process_chat(self, request: ChatRequest) -> ChatResponse:
        """Обрабатывает обычный чат запрос через AI."""
        try:
            # Подготавливаем сообщения
            messages = await self._prepare_messages(request)
            
            # Обычный запрос
            return await self._process_regular(request, messages)
                
        except Exception as e:
            raise OllamaError(f"Failed to process chat: {str(e)}")
    
    async def process_chat_stream(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        """Обрабатывает стриминговый чат запрос через AI."""
        try:
            # Подготавливаем сообщения
            messages = await self._prepare_messages(request)
            
            # Стриминговый запрос
            async for chunk in self._process_streaming(request, messages):
                yield chunk
                
        except Exception as e:
            error_chunk = {
                "error": str(e),
                "request_id": self.request_id
            }
            yield f"data: {json.dumps(error_chunk)}\n\n"
    
    async def _prepare_messages(self, request: ChatRequest) -> List[Dict[str, str]]:
        """Подготавливает сообщения для AI."""
        messages = []
        
        # Добавляем системный промпт
        system_prompt = request.system_prompt or get_system_prompt()
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        # Добавляем RAG контекст, если нужен
        if request.use_rag:
            rag_context = await self._get_rag_context(request)
            if rag_context:
                messages.append({"role": "system", "content": f"Context: {rag_context}"})
        
        # Добавляем пользовательские сообщения
        for msg in request.messages:
            # Применяем умные промпты, если нужно
            content = msg.content
            if request.use_smart_prompts and msg.role == "user":
                content = await self._enhance_prompt(content)
            
            messages.append({"role": msg.role, "content": content})
        
        return messages
    
    async def _get_rag_context(self, request: ChatRequest) -> Optional[str]:
        """Получает контекст из RAG системы."""
        try:
            if not request.messages:
                return None
            
            # Берем последнее сообщение пользователя для поиска
            last_user_message = None
            for msg in reversed(request.messages):
                if msg.role == "user":
                    last_user_message = msg.content
                    break
            
            if not last_user_message:
                return None
            
            # Ищем релевантный контекст
            results = await rag_system.search(
                query=last_user_message,
                conversation_id=request.conversation_id,
                limit=3
            )
            
            if results:
                context_parts = []
                for result in results:
                    context_parts.append(f"- {result.get('content', '')}")
                return "\n".join(context_parts)
            
            return None
            
        except Exception as e:
            # Логируем ошибку, но не прерываем обработку
            print(f"RAG context error: {e}")
            return None
    
    async def _enhance_prompt(self, prompt: str) -> str:
        """Улучшает промпт с помощью AI."""
        try:
            # Простое улучшение промпта
            enhanced_prompt = f"""
            Please provide a detailed and helpful response to the following question:
            
            {prompt}
            
            Consider providing:
            - Clear explanations
            - Practical examples if applicable
            - Step-by-step guidance when relevant
            """
            
            return enhanced_prompt.strip()
            
        except Exception:
            # Если улучшение не удалось, возвращаем оригинал
            return prompt
    
    async def _process_regular(self, request: ChatRequest, messages: List[Dict[str, str]]) -> ChatResponse:
        """Обрабатывает обычный (не стриминговый) запрос."""
        start_time = time.time()
        
        # Отправляем в Ollama и собираем полный ответ
        full_content = ""
        last_response = {}
        
        async for chunk in ollama_client.chat(
            model=request.model,
            messages=messages,
            stream=False
        ):
            if chunk.get("message", {}).get("content"):
                full_content += chunk["message"]["content"]
            last_response = chunk
        
        processing_time = time.time() - start_time
        
        # Создаем финальный response объект
        final_response = {
            "message": {"content": full_content},
            "tokens": last_response.get("tokens", {})
        }
        
        # Сохраняем в RAG, если нужно
        if request.use_rag:
            await self._save_to_rag(request, final_response)
        
        return ChatResponse(
            message=ChatMessage(
                role="assistant",
                content=full_content
            ),
            request_id=self.request_id,
            model=request.model,
            metadata={
                "processing_time": processing_time,
                "use_rag": request.use_rag,
                "use_smart_prompts": request.use_smart_prompts,
                "tokens": final_response.get("tokens", {}),
            }
        )
    
    async def _process_streaming(self, request: ChatRequest, messages: List[Dict[str, str]]) -> AsyncGenerator[str, None]:
        """Обрабатывает стриминговый запрос."""
        try:
            async for chunk in ollama_client.chat(
                model=request.model,
                messages=messages,
                stream=True
            ):
                if chunk.get("message", {}).get("content"):
                    yield f"data: {json.dumps(chunk)}\n\n"
            
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            error_chunk = {
                "error": str(e),
                "request_id": self.request_id
            }
            yield f"data: {json.dumps(error_chunk)}\n\n"
    
    async def _save_to_rag(self, request: ChatRequest, response: Dict[str, Any]) -> None:
        """Сохраняет разговор в RAG систему."""
        try:
            # Сохраняем пользовательский запрос и ответ ассистента
            for msg in request.messages:
                if msg.role == "user":
                    await rag_system.add_message(
                        conversation_id=request.conversation_id,
                        role=msg.role,
                        content=msg.content,
                        metadata={"model": request.model}
                    )
            
            # Сохраняем ответ ассистента
            assistant_content = response.get("message", {}).get("content", "")
            if assistant_content:
                await rag_system.add_message(
                    conversation_id=request.conversation_id,
                    role="assistant",
                    content=assistant_content,
                    metadata={
                        "model": request.model,
                        "tokens": response.get("tokens", {}),
                    }
                )
                
        except Exception as e:
            # Логируем ошибку, но не прерываем обработку
            print(f"RAG save error: {e}")


# Глобальный экземпляр процессора
ai_chat_processor = AIChatProcessor()
