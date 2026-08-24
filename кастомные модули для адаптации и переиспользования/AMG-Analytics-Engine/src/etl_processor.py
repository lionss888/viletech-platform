#!/usr/bin/env python3
"""
AMG Banking Core - ETL процессор
Утилита для обработки данных и создания витрин
"""

import psycopg2
import pandas as pd
from datetime import datetime, timedelta
import logging
import sys
import os
from typing import Dict, List, Optional

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('etl_processor.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class ETLProcessor:
    def __init__(self):
        self.connection = None
        self.config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5432'),
            'database': os.getenv('DB_NAME', 'abs_core'),
            'user': os.getenv('DB_USER', 'lionss'),
            'password': os.getenv('DB_PASSWORD', 'Lionss2025')
        }
    
    def connect(self):
        """Подключение к базе данных"""
        try:
            self.connection = psycopg2.connect(**self.config)
            logger.info("✅ Подключение к PostgreSQL установлено")
            return True
        except Exception as e:
            logger.error(f"❌ Ошибка подключения к PostgreSQL: {e}")
            return False
    
    def disconnect(self):
        """Отключение от базы данных"""
        if self.connection:
            self.connection.close()
            logger.info("🔌 Соединение с PostgreSQL закрыто")
    
    def process_client_mart(self):
        """Обработка клиентской витрины"""
        logger.info("🔄 Обработка клиентской витрины...")
        
        try:
            cursor = self.connection.cursor()
            
            # Очистка старых данных
            cursor.execute("DELETE FROM client_mart")
            
            # Вставка новых данных
            query = """
                INSERT INTO client_mart (
                    client_id, client_name, total_balance, account_count, 
                    last_transaction_date, transaction_count_30d, avg_transaction_amount, updated_at
                )
                SELECT 
                    c.id as client_id,
                    c.first_name || ' ' || c.last_name as client_name,
                    COALESCE(SUM(a.balance), 0) as total_balance,
                    COUNT(a.id) as account_count,
                    MAX(t.created_at::date) as last_transaction_date,
                    COUNT(CASE WHEN t.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as transaction_count_30d,
                    COALESCE(AVG(t.amount), 0) as avg_transaction_amount,
                    NOW() as updated_at
                FROM clients c
                LEFT JOIN accounts a ON c.id = a.client_id
                LEFT JOIN transactions t ON (a.id = t.debit_account_id OR a.id = t.credit_account_id)
                GROUP BY c.id, c.first_name, c.last_name
            """
            
            cursor.execute(query)
            
            # Подсчет обработанных записей
            cursor.execute("SELECT COUNT(*) FROM client_mart")
            count = cursor.fetchone()[0]
            
            self.connection.commit()
            logger.info(f"✅ Клиентская витрина обработана: {count} записей")
            
        except Exception as e:
            logger.error(f"❌ Ошибка обработки клиентской витрины: {e}")
            self.connection.rollback()
    
    def process_transaction_mart(self):
        """Обработка транзакционной витрины"""
        logger.info("🔄 Обработка транзакционной витрины...")
        
        try:
            cursor = self.connection.cursor()
            
            # Очистка старых данных
            cursor.execute("DELETE FROM transaction_mart")
            
            # Вставка новых данных
            query = """
                INSERT INTO transaction_mart (
                    date, hour, currency, transaction_count, total_amount, 
                    avg_amount, min_amount, max_amount, status, updated_at
                )
                SELECT 
                    DATE(t.created_at) as date,
                    EXTRACT(HOUR FROM t.created_at) as hour,
                    t.currency,
                    COUNT(*) as transaction_count,
                    SUM(t.amount) as total_amount,
                    AVG(t.amount) as avg_amount,
                    MIN(t.amount) as min_amount,
                    MAX(t.amount) as max_amount,
                    t.status,
                    NOW() as updated_at
                FROM transactions t
                WHERE t.created_at >= NOW() - INTERVAL '7 days'
                GROUP BY DATE(t.created_at), EXTRACT(HOUR FROM t.created_at), t.currency, t.status
            """
            
            cursor.execute(query)
            
            # Подсчет обработанных записей
            cursor.execute("SELECT COUNT(*) FROM transaction_mart")
            count = cursor.fetchone()[0]
            
            self.connection.commit()
            logger.info(f"✅ Транзакционная витрина обработана: {count} записей")
            
        except Exception as e:
            logger.error(f"❌ Ошибка обработки транзакционной витрины: {e}")
            self.connection.rollback()
    
    def process_account_mart(self):
        """Обработка счетной витрины"""
        logger.info("🔄 Обработка счетной витрины...")
        
        try:
            cursor = self.connection.cursor()
            
            # Очистка старых данных
            cursor.execute("DELETE FROM account_mart")
            
            # Вставка новых данных
            query = """
                INSERT INTO account_mart (
                    account_type, currency, total_balance, account_count, 
                    avg_balance, active_accounts, inactive_accounts, updated_at
                )
                SELECT 
                    a.type as account_type,
                    a.currency,
                    SUM(a.balance) as total_balance,
                    COUNT(*) as account_count,
                    AVG(a.balance) as avg_balance,
                    COUNT(CASE WHEN a.is_active = true THEN 1 END) as active_accounts,
                    COUNT(CASE WHEN a.is_active = false THEN 1 END) as inactive_accounts,
                    NOW() as updated_at
                FROM accounts a
                GROUP BY a.type, a.currency
            """
            
            cursor.execute(query)
            
            # Подсчет обработанных записей
            cursor.execute("SELECT COUNT(*) FROM account_mart")
            count = cursor.fetchone()[0]
            
            self.connection.commit()
            logger.info(f"✅ Счетная витрина обработана: {count} записей")
            
        except Exception as e:
            logger.error(f"❌ Ошибка обработки счетной витрины: {e}")
            self.connection.rollback()
    
    def cleanup_old_data(self):
        """Очистка старых данных"""
        logger.info("🧹 Очистка старых данных...")
        
        try:
            cursor = self.connection.cursor()
            cursor.execute("SELECT cleanup_old_data()")
            self.connection.commit()
            logger.info("✅ Очистка старых данных завершена")
            
        except Exception as e:
            logger.error(f"❌ Ошибка очистки старых данных: {e}")
            self.connection.rollback()
    
    def run(self):
        """Запуск ETL процесса"""
        logger.info("🚀 Запуск ETL процесса...")
        
        if not self.connect():
            return False
        
        try:
            # Обработка всех витрин
            self.process_client_mart()
            self.process_transaction_mart()
            self.process_account_mart()
            
            # Очистка старых данных
            self.cleanup_old_data()
            
            logger.info("✅ ETL процесс завершен успешно")
            return True
            
        except Exception as e:
            logger.error(f"❌ Критическая ошибка ETL процесса: {e}")
            return False
        
        finally:
            self.disconnect()

def main():
    """Главная функция"""
    logger.info("🏦 AMG Banking Core - ETL процессор запущен")
    
    processor = ETLProcessor()
    success = processor.run()
    
    if success:
        logger.info("🎉 ETL процесс завершен успешно")
        sys.exit(0)
    else:
        logger.error("💥 ETL процесс завершен с ошибками")
        sys.exit(1)

if __name__ == "__main__":
    main()
