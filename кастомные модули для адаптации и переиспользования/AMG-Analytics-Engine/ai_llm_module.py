"""
Модуль интеграции с Ollama для обработки естественного языка
Автоматизированная банковская система (АБС) - AI/LLM компонент
"""

import requests
import json
import os
from typing import Dict, List, Optional, Any
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OllamaClient:
    """Клиент для работы с Ollama API"""
    
    def __init__(self, host: str = None, port: int = None, model: str = None):
        self.host = host or os.getenv('OLLAMA_HOST', 'localhost')
        self.port = port or int(os.getenv('OLLAMA_PORT', 11434))
        self.model = model or os.getenv('OLLAMA_MODEL', 'llama2')
        self.base_url = f"http://{self.host}:{self.port}"
        
    def is_available(self) -> bool:
        """Проверка доступности Ollama сервера"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            return response.status_code == 200
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Ошибка подключения к Ollama: {e}")
            return False
        except requests.exceptions.Timeout as e:
            logger.error(f"Таймаут подключения к Ollama: {e}")
            return False
        except Exception as e:
            logger.error(f"Неожиданная ошибка при подключении к Ollama: {e}")
            return False
    
    def get_available_models(self) -> List[Dict]:
        """Получение списка доступных моделей"""
        try:
            response = requests.get(f"{self.base_url}/api/tags")
            if response.status_code == 200:
                return response.json().get('models', [])
            return []
        except Exception as e:
            logger.error(f"Ошибка получения моделей: {e}")
            return []
    
    def generate_response(self, prompt: str, model: str = None, 
                         system_prompt: str = None, **kwargs) -> Dict:
        """Генерация ответа от языковой модели"""
        model = model or self.model
        
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            **kwargs
        }
        
        if system_prompt:
            payload["system"] = system_prompt
            
        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Ошибка генерации: HTTP {response.status_code}")
                return {"error": f"HTTP {response.status_code}", "details": "Сервер вернул ошибку"}
                
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Ошибка подключения к Ollama: {e}")
            return {"error": "ConnectionError", "details": "Сервер Ollama недоступен"}
        except requests.exceptions.Timeout as e:
            logger.error(f"Таймаут запроса к Ollama: {e}")
            return {"error": "Timeout", "details": "Превышено время ожидания ответа"}
        except requests.exceptions.RequestException as e:
            logger.error(f"Ошибка HTTP запроса к Ollama: {e}")
            return {"error": "RequestException", "details": "Ошибка HTTP запроса"}
        except Exception as e:
            logger.error(f"Неожиданная ошибка при запросе к Ollama: {e}")
            return {"error": "UnexpectedError", "details": str(e)}
    
    def pull_model(self, model_name: str) -> bool:
        """Загрузка модели"""
        try:
            response = requests.post(
                f"{self.base_url}/api/pull",
                json={"name": model_name}
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Ошибка загрузки модели {model_name}: {e}")
            return False

class BankingAI:
    """AI-помощник для банковской системы"""
    
    def __init__(self):
        self.ollama = OllamaClient()
        self.system_prompt = """Ты - AI-помощник банковской системы AMG. 
        Твоя задача - помогать пользователям с банковскими операциями, 
        аналитикой и консультациями. Отвечай профессионально и точно."""
        self._check_availability()
    
    def _check_availability(self) -> None:
        """Проверка доступности AI сервиса"""
        if not self.ollama.is_available():
            logger.warning("AI сервис недоступен. Функции будут работать в ограниченном режиме.")
    
    def _is_ai_available(self) -> bool:
        """Проверка доступности AI для выполнения запросов"""
        return self.ollama.is_available()
    
    def analyze_transaction(self, transaction_data: Dict) -> str:
        """Анализ транзакции с помощью AI"""
        if not self._is_ai_available():
            return "⚠️ AI сервис недоступен. Анализ транзакции невозможен."
        
        prompt = f"""
        Проанализируй следующую банковскую транзакцию:
        Сумма: {transaction_data.get('amount')} {transaction_data.get('currency')}
        Описание: {transaction_data.get('description')}
        Статус: {transaction_data.get('status')}
        
        Предоставь краткий анализ и рекомендации.
        """
        
        response = self.ollama.generate_response(
            prompt=prompt,
            system_prompt=self.system_prompt
        )
        
        if 'error' in response:
            logger.error(f"Ошибка AI анализа: {response['error']}")
            return f"❌ Ошибка AI анализа: {response.get('details', 'Неизвестная ошибка')}"
        
        return response.get('response', 'Анализ недоступен')
    
    def generate_report(self, data_type: str, filters: Dict = None) -> str:
        """Генерация отчета с помощью AI"""
        if not self._is_ai_available():
            return "⚠️ AI сервис недоступен. Генерация отчета невозможна."
        
        prompt = f"""
        Сгенерируй отчет по типу данных: {data_type}
        Фильтры: {filters or 'Нет'}
        
        Создай структурированный отчет с ключевыми метриками и выводами.
        """
        
        response = self.ollama.generate_response(
            prompt=prompt,
            system_prompt=self.system_prompt
        )
        
        if 'error' in response:
            logger.error(f"Ошибка генерации отчета: {response['error']}")
            return f"❌ Ошибка генерации отчета: {response.get('details', 'Неизвестная ошибка')}"
        
        return response.get('response', 'Отчет недоступен')
    
    def customer_support(self, question: str) -> str:
        """Поддержка клиентов с помощью AI"""
        if not self._is_ai_available():
            return "⚠️ AI сервис недоступен. Поддержка клиентов невозможна."
        
        prompt = f"""
        Клиент задал вопрос: {question}
        
        Предоставь профессиональный и полезный ответ, 
        учитывая контекст банковской системы.
        """
        
        response = self.ollama.generate_response(
            prompt=prompt,
            system_prompt=self.system_prompt
        )
        
        if 'error' in response:
            logger.error(f"Ошибка поддержки клиентов: {response['error']}")
            return f"❌ Ошибка поддержки клиентов: {response.get('details', 'Неизвестная ошибка')}"
        
        return response.get('response', 'Ответ недоступен')
    
    def fraud_detection_analysis(self, transaction_data: Dict) -> Dict:
        """Анализ подозрительных транзакций"""
        if not self._is_ai_available():
            return {
                "analysis": "⚠️ AI сервис недоступен. Анализ безопасности невозможен.",
                "risk_level": "неопределен",
                "recommendations": ["Проверить доступность AI сервиса"]
            }
        
        prompt = f"""
        Проанализируй транзакцию на предмет подозрительной активности:
        Сумма: {transaction_data.get('amount')}
        Валюта: {transaction_data.get('currency')}
        Описание: {transaction_data.get('description')}
        Клиент: {transaction_data.get('client_info')}
        
        Оцени риск (низкий/средний/высокий) и объясни причины.
        """
        
        response = self.ollama.generate_response(
            prompt=prompt,
            system_prompt=self.system_prompt + " Ты эксперт по безопасности банковских операций."
        )
        
        if 'error' in response:
            logger.error(f"Ошибка анализа безопасности: {response['error']}")
            return {
                "analysis": f"❌ Ошибка анализа безопасности: {response.get('details', 'Неизвестная ошибка')}",
                "risk_level": "неопределен",
                "recommendations": ["Проверить логи AI сервиса"]
            }
        
        return {
            "analysis": response.get('response', 'Анализ недоступен'),
            "risk_level": "неопределен",
            "recommendations": []
        }

# Глобальный экземпляр для использования в dashboard
banking_ai = BankingAI()
