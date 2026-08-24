"""
Модуль метрик для AMG Banking Core
Обеспечивает сбор и экспорт метрик производительности для Prometheus
"""

import time
import threading
from typing import Dict, Any, Optional, Callable
from collections import defaultdict, Counter
from datetime import datetime, timedelta
import psutil
import os

class MetricsCollector:
    """Коллектор метрик для AMG Banking Core"""
    
    def __init__(self):
        self.metrics = defaultdict(Counter)
        self.gauges = defaultdict(float)
        self.histograms = defaultdict(list)
        self.lock = threading.Lock()
        self.start_time = time.time()
        
        # Системные метрики
        self.system_metrics_enabled = True
        self.collection_interval = 15  # секунды
        
        # Запускаем сбор системных метрик
        if self.system_metrics_enabled:
            self._start_system_metrics_collection()
    
    def _start_system_metrics_collection(self):
        """Запуск сбора системных метрик в фоновом режиме"""
        def collect_system_metrics():
            while True:
                try:
                    self._collect_system_metrics()
                    time.sleep(self.collection_interval)
                except Exception as e:
                    print(f"Error collecting system metrics: {e}")
        
        thread = threading.Thread(target=collect_system_metrics, daemon=True)
        thread.start()
    
    def _collect_system_metrics(self):
        """Сбор системных метрик"""
        try:
            # CPU метрики
            cpu_percent = psutil.cpu_percent(interval=1)
            self.set_gauge('system_cpu_usage_percent', cpu_percent)
            
            # Memory метрики
            memory = psutil.virtual_memory()
            self.set_gauge('system_memory_usage_percent', memory.percent)
            self.set_gauge('system_memory_available_bytes', memory.available)
            self.set_gauge('system_memory_total_bytes', memory.total)
            
            # Disk метрики
            disk = psutil.disk_usage('/')
            self.set_gauge('system_disk_usage_percent', (disk.used / disk.total) * 100)
            self.set_gauge('system_disk_free_bytes', disk.free)
            
            # Network метрики
            network = psutil.net_io_counters()
            self.set_gauge('system_network_bytes_sent', network.bytes_sent)
            self.set_gauge('system_network_bytes_recv', network.bytes_recv)
            
        except Exception as e:
            print(f"Error collecting system metrics: {e}")
    
    def increment_counter(self, name: str, value: int = 1, labels: Dict[str, str] = None):
        """Увеличение счетчика"""
        with self.lock:
            if labels:
                key = f"{name}_{hash(frozenset(labels.items()))}"
                self.metrics[key].update(labels)
            else:
                self.metrics[name] += value
    
    def set_gauge(self, name: str, value: float, labels: Dict[str, str] = None):
        """Установка значения gauge"""
        with self.lock:
            if labels:
                key = f"{name}_{hash(frozenset(labels.items()))}"
                self.gauges[key] = value
            else:
                self.gauges[name] = value
    
    def observe_histogram(self, name: str, value: float, labels: Dict[str, str] = None):
        """Наблюдение значения для гистограммы"""
        with self.lock:
            if labels:
                key = f"{name}_{hash(frozenset(labels.items()))}"
                self.histograms[key].append(value)
                # Ограничиваем размер гистограммы
                if len(self.histograms[key]) > 1000:
                    self.histograms[key] = self.histograms[key][-1000:]
            else:
                self.histograms[name].append(value)
                if len(self.histograms[name]) > 1000:
                    self.histograms[name] = self.histograms[name][-1000:]
    
    def get_metrics(self) -> str:
        """Получение метрик в формате Prometheus"""
        with self.lock:
            output = []
            
            # Системные метрики
            output.append(f"# HELP amg_system_uptime_seconds Total uptime in seconds")
            output.append(f"# TYPE amg_system_uptime_seconds gauge")
            output.append(f"amg_system_uptime_seconds {time.time() - self.start_time}")
            
            # Счетчики
            for name, value in self.metrics.items():
                output.append(f"# HELP amg_{name}_total Total count")
                output.append(f"# TYPE amg_{name}_total counter")
                output.append(f"amg_{name}_total {value}")
            
            # Gauge метрики
            for name, value in self.gauges.items():
                output.append(f"# HELP amg_{name} Current value")
                output.append(f"# TYPE amg_{name} gauge")
                output.append(f"amg_{name} {value}")
            
            # Гистограммы
            for name, values in self.histograms.items():
                if values:
                    output.append(f"# HELP amg_{name}_bucket Histogram bucket")
                    output.append(f"# TYPE amg_{name}_bucket histogram")
                    
                    # Бакеты для гистограммы
                    buckets = [0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0]
                    for bucket in buckets:
                        count = sum(1 for v in values if v <= bucket)
                        output.append(f"amg_{name}_bucket{{le=\"{bucket}\"}} {count}")
                    
                    # Общее количество и сумма
                    output.append(f"amg_{name}_bucket{{le=\"+Inf\"}} {len(values)}")
                    output.append(f"amg_{name}_sum {sum(values)}")
                    output.append(f"amg_{name}_count {len(values)}")
            
            return "\n".join(output)

class DatabaseMetrics:
    """Метрики для операций с базой данных"""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics = metrics_collector
    
    def record_query(self, table: str, operation: str, duration: float, success: bool):
        """Запись метрик запроса к БД"""
        labels = {'table': table, 'operation': operation}
        
        # Счетчик запросов
        self.metrics.increment_counter('database_queries_total', labels=labels)
        
        # Счетчик успешных/неуспешных запросов
        status = 'success' if success else 'failure'
        self.metrics.increment_counter('database_queries_status_total', 
                                     labels={**labels, 'status': status})
        
        # Гистограмма времени выполнения
        self.metrics.observe_histogram('database_query_duration_seconds', 
                                     duration, labels=labels)
        
        # Gauge для активных подключений (пример)
        if operation == 'SELECT':
            self.metrics.set_gauge('database_active_connections', 
                                 psutil.Process().num_threads())

class APIMetrics:
    """Метрики для API запросов"""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics = metrics_collector
    
    def record_request(self, method: str, endpoint: str, status_code: int, 
                      duration: float, user_id: str = None):
        """Запись метрик API запроса"""
        labels = {'method': method, 'endpoint': endpoint, 'status_code': str(status_code)}
        
        # Счетчик запросов
        self.metrics.increment_counter('api_requests_total', labels=labels)
        
        # Счетчик по статус кодам
        self.metrics.increment_counter('api_requests_by_status_total', 
                                     labels={'status_code': str(status_code)})
        
        # Гистограмма времени ответа
        self.metrics.observe_histogram('api_request_duration_seconds', 
                                     duration, labels=labels)
        
        # Метрики по пользователям
        if user_id:
            self.metrics.increment_counter('api_requests_by_user_total', 
                                         labels={'user_id': user_id})

class BusinessMetrics:
    """Бизнес метрики для AMG Banking"""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics = metrics_collector
    
    def record_user_login(self, user_id: str, success: bool):
        """Запись метрик входа пользователя"""
        status = 'success' if success else 'failure'
        self.metrics.increment_counter('user_logins_total', 
                                     labels={'status': status, 'user_id': user_id})
    
    def record_transaction(self, transaction_type: str, amount: float, currency: str):
        """Запись метрик транзакции"""
        labels = {'type': transaction_type, 'currency': currency}
        
        # Счетчик транзакций
        self.metrics.increment_counter('transactions_total', labels=labels)
        
        # Сумма транзакций
        self.metrics.set_gauge('transactions_amount_total', amount, labels=labels)
    
    def record_account_creation(self, account_type: str, currency: str):
        """Запись метрик создания счета"""
        self.metrics.increment_counter('accounts_created_total', 
                                     labels={'type': account_type, 'currency': currency})

class MetricsMiddleware:
    """Middleware для автоматического сбора метрик"""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics = metrics_collector
        self.api_metrics = APIMetrics(metrics_collector)
    
    def __call__(self, func):
        """Декоратор для функций"""
        def wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                success = True
                status_code = 200
            except Exception as e:
                success = False
                status_code = 500
                raise
            finally:
                duration = time.time() - start_time
                
                # Записываем метрики
                self.api_metrics.record_request(
                    method='FUNCTION',
                    endpoint=func.__name__,
                    status_code=status_code,
                    duration=duration
                )
            
            return result
        return wrapper

# Глобальный экземпляр коллектора метрик
_metrics_collector = None

def get_metrics_collector() -> MetricsCollector:
    """Получение глобального экземпляра коллектора метрик"""
    global _metrics_collector
    if _metrics_collector is None:
        _metrics_collector = MetricsCollector()
    return _metrics_collector

def get_database_metrics() -> DatabaseMetrics:
    """Получение метрик для БД"""
    return DatabaseMetrics(get_metrics_collector())

def get_api_metrics() -> APIMetrics:
    """Получение метрик для API"""
    return APIMetrics(get_metrics_collector())

def get_business_metrics() -> BusinessMetrics:
    """Получение бизнес метрик"""
    return BusinessMetrics(get_metrics_collector())

def get_metrics_middleware() -> MetricsMiddleware:
    """Получение middleware для метрик"""
    return MetricsMiddleware(get_metrics_collector())

# Пример использования
if __name__ == "__main__":
    # Инициализация метрик
    metrics = get_metrics_collector()
    db_metrics = get_database_metrics()
    api_metrics = get_api_metrics()
    business_metrics = get_business_metrics()
    
    # Симуляция метрик
    db_metrics.record_query("clients", "SELECT", 0.15, True)
    db_metrics.record_query("accounts", "INSERT", 0.08, True)
    
    api_metrics.record_request("GET", "/api/clients", 200, 0.25, "user123")
    api_metrics.record_request("POST", "/api/transactions", 201, 0.12, "user123")
    
    business_metrics.record_user_login("user123", True)
    business_metrics.record_transaction("transfer", 1000.0, "RUB")
    business_metrics.record_account_creation("savings", "RUB")
    
    # Вывод метрик
    print("=== AMG Banking Core Metrics ===")
    print(metrics.get_metrics())
