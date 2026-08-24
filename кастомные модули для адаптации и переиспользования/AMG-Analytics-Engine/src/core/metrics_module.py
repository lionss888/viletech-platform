#!/usr/bin/env python3
"""
Модуль метрик для AMG Dashboard
Экспортирует метрики в формате Prometheus для мониторинга
"""

import time
import psutil
from prometheus_client import start_http_server, Counter, Gauge, Histogram, Summary
from prometheus_client.core import REGISTRY
import threading

class AMGMetrics:
    """Класс для сбора метрик AMG Dashboard"""
    
    def __init__(self):
        # Метрики запросов
        self.http_requests_total = Counter(
            'amg_http_requests_total', 
            'Total HTTP requests',
            ['method', 'endpoint', 'status']
        )
        
        # Метрики времени ответа
        self.http_request_duration_seconds = Histogram(
            'amg_http_request_duration_seconds',
            'HTTP request duration in seconds',
            ['method', 'endpoint']
        )
        
        # Метрики активных пользователей
        self.active_users = Gauge(
            'amg_active_users',
            'Number of active users'
        )
        
        # Метрики системных ресурсов
        self.cpu_usage_percent = Gauge(
            'amg_cpu_usage_percent',
            'CPU usage percentage'
        )
        
        self.memory_usage_bytes = Gauge(
            'amg_memory_usage_bytes',
            'Memory usage in bytes'
        )
        
        self.disk_usage_percent = Gauge(
            'amg_disk_usage_percent',
            'Disk usage percentage'
        )
        
        # Метрики базы данных
        self.db_connections = Gauge(
            'amg_db_connections',
            'Database connections count'
        )
        
        self.db_query_duration_seconds = Histogram(
            'amg_db_query_duration_seconds',
            'Database query duration in seconds',
            ['query_type']
        )
        
        # Метрики бизнес-логики
        self.transactions_total = Counter(
            'amg_transactions_total',
            'Total transactions processed',
            ['type', 'status']
        )
        
        self.transaction_amount_total = Counter(
            'amg_transaction_amount_total',
            'Total transaction amounts',
            ['currency']
        )
        
        # Метрики ошибок
        self.errors_total = Counter(
            'amg_errors_total',
            'Total errors',
            ['type', 'severity']
        )
        
        # Метрики производительности
        self.response_time_seconds = Summary(
            'amg_response_time_seconds',
            'Response time in seconds'
        )
        
        self.throughput_requests_per_second = Gauge(
            'amg_throughput_requests_per_second',
            'Requests per second'
        )
        
        # Запуск сбора системных метрик
        self.start_system_metrics_collection()
    
    def start_system_metrics_collection(self):
        """Запуск сбора системных метрик в фоновом режиме"""
        def collect_system_metrics():
            while True:
                try:
                    # CPU
                    self.cpu_usage_percent.set(psutil.cpu_percent(interval=1))
                    
                    # Память
                    memory = psutil.virtual_memory()
                    self.memory_usage_bytes.set(memory.used)
                    
                    # Диск
                    disk = psutil.disk_usage('/')
                    self.disk_usage_percent.set((disk.used / disk.total) * 100)
                    
                    time.sleep(15)  # Обновляем каждые 15 секунд
                except Exception as e:
                    print(f"Ошибка сбора системных метрик: {e}")
                    time.sleep(30)
        
        thread = threading.Thread(target=collect_system_metrics, daemon=True)
        thread.start()
    
    def record_request(self, method, endpoint, status, duration):
        """Запись метрики HTTP запроса"""
        self.http_requests_total.labels(method=method, endpoint=endpoint, status=status).inc()
        self.http_request_duration_seconds.labels(method=method, endpoint=endpoint).observe(duration)
    
    def set_active_users(self, count):
        """Установка количества активных пользователей"""
        self.active_users.set(count)
    
    def record_db_query(self, query_type, duration):
        """Запись метрики запроса к БД"""
        self.db_query_duration_seconds.labels(query_type=query_type).observe(duration)
    
    def set_db_connections(self, count):
        """Установка количества соединений с БД"""
        self.db_connections.set(count)
    
    def record_transaction(self, transaction_type, status, amount=None, currency='RUB'):
        """Запись метрики транзакции"""
        self.transactions_total.labels(type=transaction_type, status=status).inc()
        if amount:
            self.transaction_amount_total.labels(currency=currency).inc(amount)
    
    def record_error(self, error_type, severity='medium'):
        """Запись метрики ошибки"""
        self.errors_total.labels(type=error_type, severity=severity).inc()
    
    def record_response_time(self, duration):
        """Запись времени ответа"""
        self.response_time_seconds.observe(duration)
    
    def set_throughput(self, rps):
        """Установка пропускной способности"""
        self.throughput_requests_per_second.set(rps)

# Глобальный экземпляр метрик
metrics = AMGMetrics()

def start_metrics_server(port=8000):
    """Запуск HTTP сервера для экспорта метрик"""
    try:
        start_http_server(port)
        print(f"Сервер метрик запущен на порту {port}")
        print("Метрики доступны по адресу: http://localhost:{}/metrics".format(port))
    except Exception as e:
        print(f"Ошибка запуска сервера метрик: {e}")

if __name__ == "__main__":
    # Демонстрация работы метрик
    start_metrics_server(8000)
    
    # Симуляция некоторых метрик
    import random
    import time
    
    while True:
        # Симулируем HTTP запросы
        methods = ['GET', 'POST', 'PUT', 'DELETE']
        endpoints = ['/dashboard', '/api/users', '/api/transactions', '/api/reports']
        statuses = [200, 201, 400, 404, 500]
        
        method = random.choice(methods)
        endpoint = random.choice(endpoints)
        status = random.choice(statuses)
        duration = random.uniform(0.1, 2.0)
        
        metrics.record_request(method, endpoint, status, duration)
        
        # Симулируем активных пользователей
        active_users = random.randint(5, 50)
        metrics.set_active_users(active_users)
        
        # Симулируем транзакции
        if random.random() > 0.7:
            transaction_type = random.choice(['payment', 'transfer', 'withdrawal'])
            status = random.choice(['success', 'failed'])
            amount = random.randint(100, 10000)
            metrics.record_transaction(transaction_type, status, amount)
        
        # Симулируем ошибки
        if random.random() > 0.9:
            error_type = random.choice(['database', 'network', 'validation', 'auth'])
            severity = random.choice(['low', 'medium', 'high'])
            metrics.record_error(error_type, severity)
        
        time.sleep(5)
