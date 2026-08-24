"""LLM service for interacting with language models via LiteLLM"""

import httpx
from typing import List, Dict, Any, Optional

from app.core.config import settings
from app.core.exceptions import LLMException
from app.services.embedding_service import EmbeddingService


class LLMService:
    """Сервис для работы с LLM через LiteLLM или напрямую Ollama"""
    
    def __init__(self):
        self.litellm_url = settings.LITELLM_URL
        self.ollama_url = settings.OLLAMA_URL
        self.embedding_service = EmbeddingService()
        self.use_ollama_direct = True  # Временно используем Ollama напрямую
    
    async def complete(
        self,
        prompt: str,
        model: str = "local-llama",
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Генерация completion через LiteLLM
        
        Args:
            prompt: Промпт для модели
            model: Название модели
            system_prompt: Системный промпт
            temperature: Температура генерации
            max_tokens: Максимальное количество токенов
            **kwargs: Дополнительные параметры
        
        Returns:
            Dict: Ответ от модели
        """
        if not prompt:
            raise LLMException("Empty prompt provided")
        
        # Пытаемся использовать Ollama напрямую для локальных моделей
        if self.use_ollama_direct and model.startswith("local-"):
            try:
                return await self._complete_ollama(prompt, model, system_prompt, temperature, max_tokens)
            except Exception as e:
                import traceback
                print(f"Ollama direct failed, falling back to LiteLLM:")
                print(f"Error: {e}")
                print(f"Traceback: {traceback.format_exc()}")
                # Продолжаем к LiteLLM fallback
        
        try:
            url = f"{self.litellm_url}/chat/completions"
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            payload = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                **kwargs
            }
            
            headers = {
                "Authorization": f"Bearer {settings.LITELLM_API_KEY}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient(timeout=180.0) as client:  # 3 минуты для генерации
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                
                data = response.json()
                return {
                    "content": data["choices"][0]["message"]["content"],
                    "model": data.get("model"),
                    "usage": data.get("usage", {}),
                    "finish_reason": data["choices"][0].get("finish_reason"),
                }
        except httpx.HTTPError as e:
            raise LLMException(
                f"HTTP error during LLM completion: {str(e)}",
                details={"model": model, "error": str(e)}
            )
        except Exception as e:
            raise LLMException(
                f"Failed to generate completion: {str(e)}",
                details={"model": model, "error": str(e)}
            )
    
    async def _complete_ollama(
        self,
        prompt: str,
        model: str,
        system_prompt: Optional[str],
        temperature: float,
        max_tokens: int
    ) -> Dict[str, Any]:
        """Прямое обращение к Ollama API"""
        # Мапим названия моделей
        model_map = {
            "local-llama": "llama3.2",
            "local-qwen": "qwen2.5:7b",
            "local-qwen-small": "qwen2.5:3b",
            "local-mistral": "mistral",
            "local-phi": "phi3:mini"
        }
        
        ollama_model = model_map.get(model, "llama3.2")
        
        url = f"{self.ollama_url}/api/generate"
        
        # Формируем полный промпт
        full_prompt = ""
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n{prompt}"
        else:
            full_prompt = prompt
        
        payload = {
            "model": ollama_model,
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens
            }
        }
        
        async with httpx.AsyncClient(timeout=180.0) as client:  # 3 минуты для генерации
            response = await client.post(url, json=payload)
            response.raise_for_status()
            
            data = response.json()
            return {
                "content": data.get("response", ""),
                "model": ollama_model,
                "usage": {},
                "finish_reason": "stop" if data.get("done") else "length"
            }
    
    async def analyze_with_rag(
        self,
        query: str,
        context: str,
        model: str = "local-llama",
        instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Анализ с использованием RAG контекста
        
        Args:
            query: Запрос пользователя
            context: Контекст из RAG
            model: Модель для использования
            instruction: Дополнительная инструкция
        
        Returns:
            Dict: Результат анализа
        """
        system_prompt = """Ты — AI-ассистент для анализа финансовых документов и compliance проверок.
Используй предоставленный контекст для точного ответа на вопрос.
Если информации в контексте недостаточно, так и скажи."""
        
        if instruction:
            system_prompt += f"\n\n{instruction}"
        
        prompt = f"""Контекст:
{context}

Вопрос: {query}

Предоставь детальный анализ на основе контекста выше."""
        
        return await self.complete(
            prompt=prompt,
            model=model,
            system_prompt=system_prompt,
            temperature=0.3  # Более низкая температура для точности
        )
    
    async def generate_embedding(self, text: str) -> List[float]:
        """
        Генерация embedding (делегирует в EmbeddingService)
        
        Args:
            text: Текст для embedding
        
        Returns:
            List[float]: Вектор embedding
        """
        return await self.embedding_service.generate_embedding(text)
    
    async def stream_complete(
        self,
        prompt: str,
        model: str = "local-llama",
        **kwargs
    ):
        """
        Streaming completion (для будущей реализации)
        
        Args:
            prompt: Промпт
            model: Модель
            **kwargs: Дополнительные параметры
        
        Yields:
            str: Части ответа
        """
        # TODO: Implement streaming when needed
        raise NotImplementedError("Streaming not implemented yet")
