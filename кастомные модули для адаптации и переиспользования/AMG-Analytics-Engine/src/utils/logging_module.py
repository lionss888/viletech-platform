"""
Модуль централизованного логирования для AMG Banking Core
Обеспечивает структурированное логирование с отправкой в центральную систему
"""

import logging
import logging.handlers
import json
import os
import sys
from datetime import datetime
from typing import Dict, Any, Optional
import socket
import threading
import queue

class StructuredFormatter(logging.Formatter):
    """Форматтер для структурированного логирования в JSON формате"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
            'hostname': socket.gethostname(),
            'service': 'amg-banking',
            'environment': os.getenv('ENVIRONMENT', 'development')
        }
        
        # Добавляем дополнительные поля если есть
        if hasattr(record, 'extra_fields'):
            log_entry.update(record.extra_fields)
        
        # Добавляем exception info если есть
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)
        
        return json.dumps(log_entry, ensure_ascii=False)

class FluentdHandler(logging.Handler):
    """Handler для отправки логов в Fluentd"""
    
    def __init__(self, host: str = 'localhost', port: int = 24224, tag: str = 'amg.banking'):
        super().__init__()
        self.host = host
        self.port = port
        self.tag = tag
        self.socket = None
        self.lock = threading.Lock()
        
    def emit(self, record: logging.LogRecord):
        try:
            msg = self.format(record)
            # Отправляем в Fluentd через forward протокол
            with self.lock:
                if not self.socket:
                    self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    self.socket.connect((self.host, self.port))
                
                # Простой forward протокол
                data = f"{self.tag}\t{msg}\n".encode('utf-8')
                self.socket.send(data)
                
        except Exception:
            self.handleError(record)

class AMGLogger:
    """Основной класс логирования для AMG Banking Core"""
    
    def __init__(self, 
                 name: str = 'amg-banking',
                 level: str = 'INFO',
                 log_file: str = None,
                 fluentd_host: str = None,
                 fluentd_port: int = 24224):
        
        self.logger = logging.getLogger(name)
        self.logger.setLevel(getattr(logging, level.upper()))
        
        # Очищаем существующие handlers
        self.logger.handlers.clear()
        
        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(console_formatter)
        self.logger.addHandler(console_handler)
        
        # File handler
        if log_file:
            file_handler = logging.handlers.RotatingFileHandler(
                log_file,
                maxBytes=10*1024*1024,  # 10MB
                backupCount=5
            )
            file_handler.setLevel(logging.DEBUG)
            file_formatter = StructuredFormatter()
            file_handler.setFormatter(file_formatter)
            self.logger.addHandler(file_handler)
        
        # Fluentd handler
        if fluentd_host:
            fluentd_handler = FluentdHandler(fluentd_host, fluentd_port)
            fluentd_handler.setLevel(logging.INFO)
            fluentd_formatter = StructuredFormatter()
            fluentd_handler.setFormatter(fluentd_formatter)
            self.logger.addHandler(fluentd_handler)
        
        # Создаем папку для логов если не существует
        if log_file:
            os.makedirs(os.path.dirname(log_file), exist_ok=True)
    
    def log_with_context(self, level: str, message: str, **kwargs):
        """Логирование с дополнительным контекстом"""
        extra_fields = kwargs.copy()
        record = self.logger.makeRecord(
            self.logger.name, getattr(logging, level.upper()),
            '', 0, message, (), None
        )
        record.extra_fields = extra_fields
        self.logger.handle(record)
    
    def info(self, message: str, **kwargs):
        """Информационное сообщение"""
        if kwargs:
            self.log_with_context('INFO', message, **kwargs)
        else:
            self.logger.info(message)
    
    def warning(self, message: str, **kwargs):
        """Предупреждение"""
        if kwargs:
            self.log_with_context('WARNING', message, **kwargs)
        else:
            self.logger.warning(message)
    
    def error(self, message: str, **kwargs):
        """Ошибка"""
        if kwargs:
            self.log_with_context('ERROR', message, **kwargs)
        else:
            self.logger.error(message)
    
    def critical(self, message: str, **kwargs):
        """Критическая ошибка"""
        if kwargs:
            self.log_with_context('CRITICAL', message, **kwargs)
        else:
            self.logger.critical(message)
    
    def debug(self, message: str, **kwargs):
        """Отладочная информация"""
        if kwargs:
            self.log_with_context('DEBUG', message, **kwargs)
        else:
            self.logger.debug(message)
    
    def exception(self, message: str, **kwargs):
        """Логирование исключения с traceback"""
        if kwargs:
            self.log_with_context('ERROR', message, **kwargs)
        else:
            self.logger.exception(message)

# Глобальный экземпляр логгера
_amg_logger = None

def get_logger(name: str = 'amg-banking') -> AMGLogger:
    """Получение глобального экземпляра логгера"""
    global _amg_logger
    if _amg_logger is None:
        _amg_logger = AMGLogger(
            name=name,
            level=os.getenv('LOG_LEVEL', 'INFO'),
            log_file=os.getenv('LOG_FILE', 'logs/amg-banking.log'),
            fluentd_host=os.getenv('FLUENTD_HOST'),
            fluentd_port=int(os.getenv('FLUENTD_PORT', '24224'))
        )
    return _amg_logger

def log_database_operation(operation: str, table: str, duration: float, success: bool, **kwargs):
    """Логирование операций с базой данных"""
    logger = get_logger('amg.database')
    logger.info(
        f"Database operation: {operation} on {table}",
        operation=operation,
        table=table,
        duration_ms=round(duration * 1000, 2),
        success=success,
        **kwargs
    )

def log_api_request(method: str, endpoint: str, status_code: int, duration: float, **kwargs):
    """Логирование API запросов"""
    logger = get_logger('amg.api')
    logger.info(
        f"API request: {method} {endpoint}",
        method=method,
        endpoint=endpoint,
        status_code=status_code,
        duration_ms=round(duration * 1000, 2),
        **kwargs
    )

def log_user_action(user_id: str, action: str, details: str = None, **kwargs):
    """Логирование действий пользователей"""
    logger = get_logger('amg.user')
    logger.info(
        f"User action: {action}",
        user_id=user_id,
        action=action,
        details=details,
        **kwargs
    )

def log_system_event(event: str, severity: str = 'INFO', **kwargs):
    """Логирование системных событий"""
    logger = get_logger('amg.system')
    log_method = getattr(logger, severity.lower(), logger.info)
    log_method(
        f"System event: {event}",
        event=event,
        severity=severity,
        **kwargs
    )

# Пример использования
if __name__ == "__main__":
    logger = get_logger('amg.test')
    
    logger.info("AMG Banking Core logger initialized")
    logger.info("Testing structured logging", user_id="123", action="login")
    
    log_database_operation("SELECT", "clients", 0.15, True, rows_returned=100)
    log_api_request("GET", "/api/clients", 200, 0.25, user_id="123")
    log_user_action("123", "login", "User logged in successfully")
    log_system_event("Service started", "INFO", version="1.0.0")
