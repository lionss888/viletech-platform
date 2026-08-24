#!/usr/bin/env python3
"""
AMG Banking Core - Коннектер для сторонних сервисов
Модуль для быстрого подключения внешних систем к банковской системе
"""

import psycopg2
import pandas as pd
import json
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
import logging
from dataclasses import dataclass
from abc import ABC, abstractmethod

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ConnectionConfig:
    """Конфигурация подключения к базе данных"""
    host: str = "localhost"
    port: int = 5432
    database: str = "abs_core"
    user: str = "lionss"
    password: str = "Lionss2025"
    ssl_mode: str = "prefer"

class AMGConnector:
    """Основной класс коннектера для подключения к AMG Banking Core"""
    
    def __init__(self, config: ConnectionConfig):
        self.config = config
        self.connection = None
        self._connect()
    
    def _connect(self):
        """Установка соединения с базой данных"""
        try:
            self.connection = psycopg2.connect(
                host=self.config.host,
                port=self.config.port,
                database=self.config.database,
                user=self.config.user,
                password=self.config.password,
                sslmode=self.config.ssl_mode
            )
            logger.info(f"✅ Подключение к БД {self.config.database} установлено")
        except Exception as e:
            logger.error(f"❌ Ошибка подключения к БД: {e}")
            raise
    
    def execute_query(self, query: str, params: Optional[tuple] = None) -> pd.DataFrame:
        """Выполнение SQL запроса"""
        try:
            if self.connection is None or self.connection.closed:
                self._connect()
            
            return pd.read_sql_query(query, self.connection, params=params)
        except Exception as e:
            logger.error(f"❌ Ошибка выполнения запроса: {e}")
            raise
    
    def get_clients(self, limit: Optional[int] = None) -> pd.DataFrame:
        """Получение списка клиентов"""
        query = "SELECT * FROM clients"
        if limit:
            query += f" LIMIT {limit}"
        return self.execute_query(query)
    
    def get_accounts(self, active_only: bool = True, limit: Optional[int] = None) -> pd.DataFrame:
        """Получение списка счетов"""
        query = "SELECT * FROM accounts"
        if active_only:
            query += " WHERE is_active = true"
        if limit:
            query += f" LIMIT {limit}"
        return self.execute_query(query)
    
    def get_transactions(self, start_date: Optional[str] = None, 
                        end_date: Optional[str] = None, 
                        limit: Optional[int] = None) -> pd.DataFrame:
        """Получение транзакций за период"""
        query = "SELECT * FROM transactions WHERE 1=1"
        params = []
        
        if start_date:
            query += " AND created_at >= %s"
            params.append(start_date)
        
        if end_date:
            query += " AND created_at <= %s"
            params.append(end_date)
        
        query += " ORDER BY created_at DESC"
        
        if limit:
            query += f" LIMIT {limit}"
        
        return self.execute_query(query, tuple(params) if params else None)
    
    def get_active_accounts_view(self) -> pd.DataFrame:
        """Получение представления активных счетов"""
        return self.execute_query("SELECT * FROM active_accounts_view")
    
    def get_transactions_view(self) -> pd.DataFrame:
        """Получение детального представления транзакций"""
        return self.execute_query("SELECT * FROM transactions_view")
    
    def get_metrics(self) -> Dict[str, Any]:
        """Получение ключевых метрик"""
        try:
            # Количество клиентов
            clients_count = self.execute_query("SELECT COUNT(*) as count FROM clients").iloc[0]['count']
            
            # Количество активных счетов
            active_accounts = self.execute_query("SELECT COUNT(*) as count FROM accounts WHERE is_active = true").iloc[0]['count']
            
            # Общий баланс
            total_balance = self.execute_query("SELECT SUM(balance) as total FROM accounts WHERE is_active = true").iloc[0]['total'] or 0
            
            # Количество транзакций за последние 30 дней
            transactions_count = self.execute_query("""
                SELECT COUNT(*) as count FROM transactions 
                WHERE created_at >= NOW() - INTERVAL '30 days'
            """).iloc[0]['count']
            
            return {
                "clients_count": clients_count,
                "active_accounts_count": active_accounts,
                "total_balance": float(total_balance),
                "transactions_last_30_days": transactions_count,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"❌ Ошибка получения метрик: {e}")
            return {}
    
    def close(self):
        """Закрытие соединения"""
        if self.connection and not self.connection.closed:
            self.connection.close()
            logger.info("🔌 Соединение с БД закрыто")

class DataExporter:
    """Класс для экспорта данных в различные форматы"""
    
    def __init__(self, connector: AMGConnector):
        self.connector = connector
    
    def export_to_csv(self, data: pd.DataFrame, filename: str) -> str:
        """Экспорт данных в CSV файл"""
        try:
            data.to_csv(filename, index=False, encoding='utf-8-sig')
            logger.info(f"✅ Данные экспортированы в {filename}")
            return filename
        except Exception as e:
            logger.error(f"❌ Ошибка экспорта в CSV: {e}")
            raise
    
    def export_to_json(self, data: pd.DataFrame, filename: str) -> str:
        """Экспорт данных в JSON файл"""
        try:
            data.to_json(filename, orient='records', indent=2, force_ascii=False)
            logger.info(f"✅ Данные экспортированы в {filename}")
            return filename
        except Exception as e:
            logger.error(f"❌ Ошибка экспорта в JSON: {e}")
            raise
    
    def export_to_excel(self, data_dict: Dict[str, pd.DataFrame], filename: str) -> str:
        """Экспорт нескольких таблиц в Excel файл"""
        try:
            with pd.ExcelWriter(filename, engine='openpyxl') as writer:
                for sheet_name, df in data_dict.items():
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
            logger.info(f"✅ Данные экспортированы в {filename}")
            return filename
        except Exception as e:
            logger.error(f"❌ Ошибка экспорта в Excel: {e}")
            raise

class WebhookConnector:
    """Класс для отправки данных через webhook"""
    
    def __init__(self, webhook_url: str, headers: Optional[Dict[str, str]] = None):
        self.webhook_url = webhook_url
        self.headers = headers or {"Content-Type": "application/json"}
    
    def send_data(self, data: Dict[str, Any]) -> bool:
        """Отправка данных через webhook"""
        try:
            response = requests.post(
                self.webhook_url,
                json=data,
                headers=self.headers,
                timeout=30
            )
            response.raise_for_status()
            logger.info(f"✅ Данные отправлены через webhook: {response.status_code}")
            return True
        except Exception as e:
            logger.error(f"❌ Ошибка отправки webhook: {e}")
            return False
    
    def send_metrics(self, metrics: Dict[str, Any]) -> bool:
        """Отправка метрик через webhook"""
        return self.send_data({
            "type": "metrics",
            "timestamp": datetime.now().isoformat(),
            "data": metrics
        })
    
    def send_transaction_alert(self, transaction_data: Dict[str, Any]) -> bool:
        """Отправка уведомления о транзакции"""
        return self.send_data({
            "type": "transaction_alert",
            "timestamp": datetime.now().isoformat(),
            "data": transaction_data
        })

class APIConnector:
    """Класс для работы с REST API"""
    
    def __init__(self, base_url: str, api_key: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.headers = {"Content-Type": "application/json"}
        if api_key:
            self.headers["Authorization"] = f"Bearer {api_key}"
    
    def get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """GET запрос к API"""
        try:
            url = f"{self.base_url}/{endpoint.lstrip('/')}"
            response = requests.get(url, headers=self.headers, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"❌ Ошибка GET запроса: {e}")
            return None
    
    def post(self, endpoint: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """POST запрос к API"""
        try:
            url = f"{self.base_url}/{endpoint.lstrip('/')}"
            response = requests.post(url, headers=self.headers, json=data, timeout=30)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"❌ Ошибка POST запроса: {e}")
            return None

# Примеры использования
def example_usage():
    """Пример использования коннектера"""
    
    # 1. Подключение к базе данных
    config = ConnectionConfig(
        host="localhost",
        port=5432,
        database="abs_core",
        user="lionss",
        password="Lionss2025"
    )
    
    connector = AMGConnector(config)
    
    try:
        # 2. Получение данных
        clients = connector.get_clients(limit=10)
        accounts = connector.get_accounts(active_only=True, limit=10)
        transactions = connector.get_transactions(
            start_date=(datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'),
            limit=100
        )
        
        # 3. Получение метрик
        metrics = connector.get_metrics()
        print(f"Метрики: {metrics}")
        
        # 4. Экспорт данных
        exporter = DataExporter(connector)
        exporter.export_to_csv(clients, "clients_export.csv")
        exporter.export_to_json(accounts, "accounts_export.json")
        
        # 5. Экспорт в Excel
        data_dict = {
            "clients": clients,
            "accounts": accounts,
            "transactions": transactions
        }
        exporter.export_to_excel(data_dict, "amg_export.xlsx")
        
        # 6. Отправка через webhook
        webhook = WebhookConnector("https://api.example.com/webhook")
        webhook.send_metrics(metrics)
        
        # 7. Работа с API
        api = APIConnector("https://api.example.com", api_key="your_api_key")
        result = api.get("/clients")
        print(f"API результат: {result}")
        
    finally:
        connector.close()

if __name__ == "__main__":
    example_usage()
