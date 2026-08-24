#!/usr/bin/env python3
"""
Автоматическое тестирование дашборда АБС
Проверяет все метрики и создает отчет о состоянии
"""

import psycopg2
import requests
import time
import json
from datetime import datetime
import sys
import os

# Добавляем корневую папку проекта в путь
project_root = os.path.join(os.path.dirname(__file__), '..', '..')
sys.path.insert(0, project_root)
os.chdir(project_root)

class DashboardTester:
    def __init__(self):
        self.db_config = {
            'host': 'localhost',
            'port': 5432,
            'database': 'abs_core',
            'user': 'lionss',
            'password': 'Lionss2025'
        }
        self.dashboard_url = 'http://localhost:8502'
        self.test_results = {}
        
    def test_database_connection(self):
        """Тест подключения к БД"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            # Проверка таблиц
            cursor.execute("SELECT COUNT(*) FROM clients")
            clients_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM accounts")
            accounts_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM transactions")
            transactions_count = cursor.fetchone()[0]
            
            cursor.close()
            conn.close()
            
            self.test_results['database'] = {
                'status': 'OK',
                'clients': clients_count,
                'accounts': accounts_count,
                'transactions': transactions_count,
                'message': f'БД содержит {clients_count} клиентов, {accounts_count} счетов, {transactions_count} транзакций'
            }
            return True
            
        except Exception as e:
            self.test_results['database'] = {
                'status': 'ERROR',
                'message': f'Ошибка подключения к БД: {str(e)}'
            }
            return False
    
    def test_dashboard_accessibility(self):
        """Тест доступности дашборда"""
        try:
            response = requests.get(self.dashboard_url, timeout=10)
            if response.status_code == 200:
                self.test_results['dashboard_access'] = {
                    'status': 'OK',
                    'message': f'Дашборд доступен по адресу {self.dashboard_url}'
                }
                return True
            else:
                self.test_results['dashboard_access'] = {
                    'status': 'ERROR',
                    'message': f'Дашборд недоступен. Код ответа: {response.status_code}'
                }
                return False
        except Exception as e:
            self.test_results['dashboard_access'] = {
                'status': 'ERROR',
                'message': f'Ошибка доступа к дашборду: {str(e)}'
            }
            return False
    
    def test_data_quality(self):
        """Тест качества данных"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            # Проверка активных счетов
            cursor.execute("SELECT COUNT(*) FROM accounts WHERE is_active = true")
            active_accounts = cursor.fetchone()[0]
            
            # Проверка балансов
            cursor.execute("SELECT SUM(balance) FROM accounts WHERE is_active = true")
            total_balance = cursor.fetchone()[0] or 0
            
            # Проверка валют
            cursor.execute("SELECT DISTINCT currency FROM accounts WHERE is_active = true")
            currencies = [row[0] for row in cursor.fetchall()]
            
            # Проверка типов счетов
            cursor.execute("SELECT DISTINCT type FROM accounts WHERE is_active = true")
            account_types = [row[0] for row in cursor.fetchall()]
            
            # Проверка статусов транзакций
            cursor.execute("SELECT status, COUNT(*) FROM transactions GROUP BY status")
            transaction_statuses = dict(cursor.fetchall())
            
            cursor.close()
            conn.close()
            
            self.test_results['data_quality'] = {
                'status': 'OK',
                'active_accounts': active_accounts,
                'total_balance': float(total_balance),
                'currencies': currencies,
                'account_types': account_types,
                'transaction_statuses': transaction_statuses,
                'message': f'Данные качественные: {active_accounts} активных счетов, {len(currencies)} валют, {len(account_types)} типов счетов'
            }
            return True
            
        except Exception as e:
            self.test_results['data_quality'] = {
                'status': 'ERROR',
                'message': f'Ошибка проверки качества данных: {str(e)}'
            }
            return False
    
    def test_views(self):
        """Тест представлений БД"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            # Проверка active_accounts_view
            cursor.execute("SELECT COUNT(*) FROM active_accounts_view")
            active_view_count = cursor.fetchone()[0]
            
            # Проверка transactions_view
            cursor.execute("SELECT COUNT(*) FROM transactions_view")
            transactions_view_count = cursor.fetchone()[0]
            
            cursor.close()
            conn.close()
            
            self.test_results['views'] = {
                'status': 'OK',
                'active_accounts_view': active_view_count,
                'transactions_view': transactions_view_count,
                'message': f'Представления работают: active_accounts_view={active_view_count}, transactions_view={transactions_view_count}'
            }
            return True
            
        except Exception as e:
            self.test_results['views'] = {
                'status': 'ERROR',
                'message': f'Ошибка проверки представлений: {str(e)}'
            }
            return False
    
    def generate_report(self):
        """Генерация отчета о тестировании"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results.values() if result['status'] == 'OK')
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        report = f"""
{'='*60}
ОТЧЕТ О ТЕСТИРОВАНИИ ДАШБОРДА АБС
{'='*60}
Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Общий результат: {passed_tests}/{total_tests} тестов пройдено
Успешность: {success_rate:.1f}%

ДЕТАЛЬНЫЕ РЕЗУЛЬТАТЫ:
{'-'*60}
"""
        
        for test_name, result in self.test_results.items():
            status_icon = "✅" if result['status'] == 'OK' else "❌"
            report += f"{status_icon} {test_name.upper()}: {result['status']}\n"
            report += f"   {result['message']}\n"
            
            if 'status' in result and result['status'] == 'OK' and 'clients' in result:
                report += f"   📊 Клиенты: {result['clients']}, Счета: {result['accounts']}, Транзакции: {result['transactions']}\n"
            
            if 'status' in result and result['status'] == 'OK' and 'active_accounts' in result:
                # Форматируем баланс в правильном формате
                balance_str = f"{result['total_balance']:,.2f}".replace(',', ' ').replace('.', ',')
                report += f"   💰 Активных счетов: {result['active_accounts']}, Общий баланс: ₽{balance_str}\n"
                report += f"   🌍 Валюты: {', '.join(result['currencies'])}\n"
                report += f"   🏦 Типы счетов: {', '.join(result['account_types'])}\n"
            
            report += "\n"
        
        # Рекомендации
        if success_rate >= 95:
            report += f"🎉 ОТЛИЧНО! Дашборд готов к работе. Все метрики должны отображаться корректно.\n"
        elif success_rate >= 80:
            report += f"⚠️ ХОРОШО! Дашборд работает, но есть незначительные проблемы.\n"
        else:
            report += f"❌ КРИТИЧНО! Дашборд требует исправления ошибок.\n"
        
        report += f"{'='*60}\n"
        
        return report, success_rate
    
    def run_all_tests(self):
        """Запуск всех тестов"""
        print("🧪 Запуск автоматического тестирования дашборда АБС...")
        print("="*60)
        
        # Тест 1: Подключение к БД
        print("1️⃣ Тестирование подключения к БД...")
        self.test_database_connection()
        time.sleep(1)
        
        # Тест 2: Доступность дашборда
        print("2️⃣ Тестирование доступности дашборда...")
        self.test_dashboard_accessibility()
        time.sleep(1)
        
        # Тест 3: Качество данных
        print("3️⃣ Тестирование качества данных...")
        self.test_data_quality()
        time.sleep(1)
        
        # Тест 4: Представления БД
        print("4️⃣ Тестирование представлений БД...")
        self.test_views()
        time.sleep(1)
        
        # Генерация отчета
        print("📊 Генерация отчета...")
        report, success_rate = self.generate_report()
        
        print(report)
        
        # Сохранение отчета в файл
        with open('dashboard_test_report.txt', 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(f"📄 Отчет сохранен в файл: dashboard_test_report.txt")
        
        return success_rate >= 95

def main():
    """Основная функция"""
    tester = DashboardTester()
    
    try:
        success = tester.run_all_tests()
        
        if success:
            print("🎯 РЕЗУЛЬТАТ: Все тесты пройдены успешно!")
            print("✅ Дашборд готов к работе и должен показывать все метрики")
            sys.exit(0)
        else:
            print("❌ РЕЗУЛЬТАТ: Есть проблемы, требующие исправления")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⏹️ Тестирование прервано пользователем")
        sys.exit(1)
    except Exception as e:
        print(f"💥 Критическая ошибка: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
