"""Prometheus metrics for Python API."""

import time
from typing import Dict, Any, Optional
from prometheus_client import Counter, Histogram, Gauge, Info, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Request, Response
from fastapi.responses import PlainTextResponse


# HTTP метрики
http_requests_total = Counter(
    'python_http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

http_request_duration = Histogram(
    'python_http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0]
)

http_requests_in_flight = Gauge(
    'python_http_requests_in_flight',
    'Number of HTTP requests currently being processed'
)

# AI метрики
ai_requests_total = Counter(
    'ai_requests_total',
    'Total AI processing requests',
    ['model', 'use_rag', 'use_smart_prompts', 'status']
)

ai_request_duration = Histogram(
    'ai_request_duration_seconds',
    'AI request processing duration in seconds',
    ['model', 'use_rag'],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0]
)

ai_tokens_processed = Counter(
    'ai_tokens_processed_total',
    'Total tokens processed by AI',
    ['model', 'type']  # type: prompt, completion
)

ai_model_usage = Counter(
    'ai_model_usage_total',
    'Total usage count per AI model',
    ['model']
)

# RAG метрики
rag_searches_total = Counter(
    'rag_searches_total',
    'Total RAG searches performed',
    ['status']
)

rag_search_duration = Histogram(
    'rag_search_duration_seconds',
    'RAG search duration in seconds',
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 2.0]
)

rag_documents_found = Histogram(
    'rag_documents_found',
    'Number of documents found in RAG search',
    buckets=[0, 1, 2, 5, 10, 20, 50]
)

# Analytics метрики
analytics_events_total = Counter(
    'analytics_events_total',
    'Total analytics events tracked',
    ['event_type', 'status']
)

analytics_processing_duration = Histogram(
    'analytics_processing_duration_seconds',
    'Analytics processing duration in seconds',
    ['operation'],
    buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0]
)

# База данных метрики
db_connections_active = Gauge(
    'python_db_connections_active',
    'Number of active database connections'
)

db_queries_total = Counter(
    'python_db_queries_total',
    'Total database queries',
    ['operation', 'table', 'status']
)

db_query_duration = Histogram(
    'python_db_query_duration_seconds',
    'Database query duration in seconds',
    ['operation', 'table'],
    buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0]
)

# Ollama метрики
ollama_requests_total = Counter(
    'ollama_requests_total',
    'Total requests to Ollama service',
    ['model', 'endpoint', 'status']
)

ollama_request_duration = Histogram(
    'ollama_request_duration_seconds',
    'Ollama request duration in seconds',
    ['model', 'endpoint'],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0, 120.0]
)

ollama_connection_errors = Counter(
    'ollama_connection_errors_total',
    'Total Ollama connection errors',
    ['error_type']
)

# Системные метрики
application_info = Info(
    'python_application_info',
    'Python application information'
)

application_start_time = Gauge(
    'python_application_start_time_seconds',
    'Application start time in unix timestamp'
)


class MetricsCollector:
    """Класс для сбора и управления метриками."""
    
    def __init__(self):
        self.start_time = time.time()
        self._setup_application_info()
    
    def _setup_application_info(self):
        """Настройка информации о приложении."""
        application_info.info({
            'version': '1.0.0',
            'environment': 'development',
            'service': 'python-analytics-api'
        })
        application_start_time.set(self.start_time)
    
    def record_http_request(self, method: str, endpoint: str, status: str, duration: float):
        """Записывает метрики HTTP запроса."""
        http_requests_total.labels(method=method, endpoint=endpoint, status=status).inc()
        http_request_duration.labels(method=method, endpoint=endpoint).observe(duration)
    
    def record_ai_request(self, model: str, use_rag: bool, use_smart_prompts: bool, 
                         status: str, duration: float, prompt_tokens: int = 0, 
                         completion_tokens: int = 0):
        """Записывает метрики AI запроса."""
        ai_requests_total.labels(
            model=model,
            use_rag=str(use_rag).lower(),
            use_smart_prompts=str(use_smart_prompts).lower(),
            status=status
        ).inc()
        
        ai_request_duration.labels(
            model=model,
            use_rag=str(use_rag).lower()
        ).observe(duration)
        
        ai_model_usage.labels(model=model).inc()
        
        if prompt_tokens > 0:
            ai_tokens_processed.labels(model=model, type='prompt').inc(prompt_tokens)
        if completion_tokens > 0:
            ai_tokens_processed.labels(model=model, type='completion').inc(completion_tokens)
    
    def record_rag_search(self, status: str, duration: float, documents_found: int):
        """Записывает метрики RAG поиска."""
        rag_searches_total.labels(status=status).inc()
        rag_search_duration.observe(duration)
        rag_documents_found.observe(documents_found)
    
    def record_analytics_event(self, event_type: str, status: str, duration: float, operation: str = 'track'):
        """Записывает метрики аналитического события."""
        analytics_events_total.labels(event_type=event_type, status=status).inc()
        analytics_processing_duration.labels(operation=operation).observe(duration)
    
    def record_db_query(self, operation: str, table: str, status: str, duration: float):
        """Записывает метрики запроса к БД."""
        db_queries_total.labels(operation=operation, table=table, status=status).inc()
        db_query_duration.labels(operation=operation, table=table).observe(duration)
    
    def record_ollama_request(self, model: str, endpoint: str, status: str, duration: float):
        """Записывает метрики запроса к Ollama."""
        ollama_requests_total.labels(model=model, endpoint=endpoint, status=status).inc()
        ollama_request_duration.labels(model=model, endpoint=endpoint).observe(duration)
    
    def record_ollama_error(self, error_type: str):
        """Записывает ошибку Ollama."""
        ollama_connection_errors.labels(error_type=error_type).inc()
    
    def update_db_connections(self, count: int):
        """Обновляет количество активных подключений к БД."""
        db_connections_active.set(count)
    
    def increment_requests_in_flight(self):
        """Увеличивает счетчик активных запросов."""
        http_requests_in_flight.inc()
    
    def decrement_requests_in_flight(self):
        """Уменьшает счетчик активных запросов."""
        http_requests_in_flight.dec()


# Глобальный экземпляр коллектора метрик
metrics_collector = MetricsCollector()


async def metrics_endpoint(request: Request) -> Response:
    """Эндпоинт для получения метрик Prometheus."""
    return PlainTextResponse(
        generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )


class MetricsMiddleware:
    """Middleware для автоматического сбора метрик HTTP запросов."""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        start_time = time.time()
        metrics_collector.increment_requests_in_flight()
        
        # Создаем обертку для отслеживания статуса ответа
        status_code = 500  # значение по умолчанию
        
        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)
        
        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            metrics_collector.decrement_requests_in_flight()
            
            # Записываем метрики
            duration = time.time() - start_time
            method = scope.get("method", "UNKNOWN")
            path = scope.get("path", "unknown")
            
            # Упрощаем путь для метрик (убираем ID и параметры)
            endpoint = self._normalize_endpoint(path)
            
            metrics_collector.record_http_request(
                method=method,
                endpoint=endpoint,
                status=str(status_code),
                duration=duration
            )
    
    def _normalize_endpoint(self, path: str) -> str:
        """Нормализует путь для метрик (убирает ID и параметры)."""
        # Простая нормализация - можно расширить
        if "/v1/" in path:
            parts = path.split("/")
            normalized_parts = []
            for part in parts:
                if part.isdigit() or len(part) > 20:  # Вероятно ID
                    normalized_parts.append("{id}")
                else:
                    normalized_parts.append(part)
            return "/".join(normalized_parts)
        return path
