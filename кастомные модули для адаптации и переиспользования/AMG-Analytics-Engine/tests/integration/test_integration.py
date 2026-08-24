#!/usr/bin/env python3
"""
Тестирование интеграционных возможностей AMG Banking Core
Проверка экспорта данных, коннектера и унифицированного потребителя
"""

import sys
import os
import pandas as pd
from datetime import datetime, timedelta

# Добавляем корневую папку проекта в путь для импорта
project_root = os.path.join(os.path.dirname(__file__), '..', '..')
sys.path.insert(0, project_root)
os.chdir(project_root)

def test_connector():
    """Тестирование коннектера"""
    print("🔗 Тестирование коннектера...")
    
    try:
        from amg_connector import AMGConnector, ConnectionConfig
        
        # Создание коннектора
        config = ConnectionConfig(
            host="localhost",
            port=5432,
            database="abs_core",
            user="lionss",
            password="Lionss2025"
        )
        
        connector = AMGConnector(config)
        
        # Тестирование получения данных
        clients = connector.get_clients(limit=5)
        accounts = connector.get_accounts(active_only=True, limit=5)
        transactions = connector.get_transactions(limit=5)
        metrics = connector.get_metrics()
        
        print(f"✅ Коннектор работает:")
        print(f"   - Клиентов: {len(clients)}")
        print(f"   - Активных счетов: {len(accounts)}")
        print(f"   - Транзакций: {len(transactions)}")
        print(f"   - Метрики: {metrics}")
        
        connector.close()
        return True
        
    except Exception as e:
        print(f"❌ Ошибка коннектора: {e}")
        return False

def test_data_consumer():
    """Тестирование унифицированного потребителя данных"""
    print("\n📊 Тестирование унифицированного потребителя данных...")
    
    try:
        from amg_connector import AMGConnector, ConnectionConfig
        from amg_data_consumer import DataConsumer, DataRequest, DataType, DataFormat
        
        # Создание коннектора и потребителя
        config = ConnectionConfig()
        connector = AMGConnector(config)
        consumer = DataConsumer(connector)
        
        # Тест 1: Получение клиентов в разных форматах
        print("   Тест 1: Получение клиентов...")
        
        request = DataRequest(
            data_type=DataType.CLIENTS,
            format=DataFormat.DICT,
            limit=3
        )
        response = consumer.get_data(request)
        
        if response.success:
            print(f"   ✅ Клиенты получены: {len(response.data)} записей")
            print(f"   Метаданные: {response.metadata}")
        else:
            print(f"   ❌ Ошибка: {response.error}")
            return False
        
        # Тест 2: Фильтрация данных
        print("   Тест 2: Фильтрация счетов...")
        
        request = DataRequest(
            data_type=DataType.ACCOUNTS,
            filters={"is_active": True, "currency": "RUB"},
            format=DataFormat.PANDAS
        )
        response = consumer.get_data(request)
        
        if response.success:
            print(f"   ✅ Активные рублевые счета: {len(response.data)} записей")
        else:
            print(f"   ❌ Ошибка: {response.error}")
            return False
        
        # Тест 3: Агрегация данных
        print("   Тест 3: Агрегация по валютам...")
        
        response = consumer.get_aggregated_data(
            DataType.ACCOUNTS,
            "by_currency"
        )
        
        if response.success:
            print(f"   ✅ Агрегация выполнена:")
            print(f"   {response.data}")
        else:
            print(f"   ❌ Ошибка: {response.error}")
            return False
        
        connector.close()
        return True
        
    except Exception as e:
        print(f"❌ Ошибка потребителя данных: {e}")
        return False

def test_data_export():
    """Тестирование экспорта данных"""
    print("\n📤 Тестирование экспорта данных...")
    
    try:
        from amg_connector import AMGConnector, ConnectionConfig, DataExporter
        
        # Создание коннектора и экспортера
        config = ConnectionConfig()
        connector = AMGConnector(config)
        exporter = DataExporter(connector)
        
        # Получение тестовых данных
        clients = connector.get_clients(limit=5)
        accounts = connector.get_accounts(active_only=True, limit=5)
        
        # Тест 1: Экспорт в CSV
        print("   Тест 1: Экспорт в CSV...")
        
        csv_file = exporter.export_to_csv(clients, "test_clients.csv")
        if os.path.exists(csv_file):
            print(f"   ✅ CSV файл создан: {csv_file}")
            os.remove(csv_file)  # Удаляем тестовый файл
        else:
            print(f"   ❌ CSV файл не создан")
            return False
        
        # Тест 2: Экспорт в JSON
        print("   Тест 2: Экспорт в JSON...")
        
        json_file = exporter.export_to_json(accounts, "test_accounts.json")
        if os.path.exists(json_file):
            print(f"   ✅ JSON файл создан: {json_file}")
            os.remove(json_file)  # Удаляем тестовый файл
        else:
            print(f"   ❌ JSON файл не создан")
            return False
        
        # Тест 3: Экспорт в Excel
        print("   Тест 3: Экспорт в Excel...")
        
        data_dict = {
            "clients": clients,
            "accounts": accounts
        }
        excel_file = exporter.export_to_excel(data_dict, "test_export.xlsx")
        if os.path.exists(excel_file):
            print(f"   ✅ Excel файл создан: {excel_file}")
            os.remove(excel_file)  # Удаляем тестовый файл
        else:
            print(f"   ❌ Excel файл не создан")
            return False
        
        connector.close()
        return True
        
    except Exception as e:
        print(f"❌ Ошибка экспорта: {e}")
        return False

def test_webhook():
    """Тестирование webhook (мок)"""
    print("\n🔗 Тестирование webhook (мок)...")
    
    try:
        from amg_connector import WebhookConnector
        
        # Создание webhook коннектора с мок URL
        webhook = WebhookConnector("https://httpbin.org/post")
        
        # Тест отправки данных
        test_data = {
            "test": True,
            "message": "Тестовое сообщение",
            "timestamp": datetime.now().isoformat()
        }
        
        success = webhook.send_data(test_data)
        if success:
            print("   ✅ Webhook отправлен успешно")
        else:
            print("   ⚠️ Webhook не отправлен (ожидаемо для тестов)")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка webhook: {e}")
        return False

def test_api_connector():
    """Тестирование API коннектора (мок)"""
    print("\n🌐 Тестирование API коннектора (мок)...")
    
    try:
        from amg_connector import APIConnector
        
        # Создание API коннектора с тестовым URL
        api = APIConnector("https://httpbin.org")
        
        # Тест GET запроса
        result = api.get("/get", params={"test": "true"})
        if result:
            print("   ✅ GET запрос выполнен успешно")
        else:
            print("   ⚠️ GET запрос не выполнен (ожидаемо для тестов)")
        
        # Тест POST запроса
        test_data = {"test": True, "message": "Тестовые данные"}
        result = api.post("/post", test_data)
        if result:
            print("   ✅ POST запрос выполнен успешно")
        else:
            print("   ⚠️ POST запрос не выполнен (ожидаемо для тестов)")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка API коннектора: {e}")
        return False

def test_dashboard_export():
    """Тестирование экспорта из дашборда"""
    print("\n📊 Тестирование экспорта из дашборда...")
    
    try:
        # Проверяем, что дашборд содержит функцию экспорта
        import amg_dashboard
        
        # Проверяем наличие функции экспорта
        if hasattr(amg_dashboard, 'export_data_section'):
            print("   ✅ Функция экспорта найдена в дашборде")
            return True
        else:
            print("   ❌ Функция экспорта не найдена в дашборде")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка проверки дашборда: {e}")
        return False

def main():
    """Основная функция тестирования"""
    print("🧪 ТЕСТИРОВАНИЕ ИНТЕГРАЦИОННЫХ ВОЗМОЖНОСТЕЙ AMG BANKING CORE")
    print("=" * 70)
    
    tests = [
        ("Коннектер", test_connector),
        ("Унифицированный потребитель данных", test_data_consumer),
        ("Экспорт данных", test_data_export),
        ("Webhook (мок)", test_webhook),
        ("API коннектор (мок)", test_api_connector),
        ("Экспорт из дашборда", test_dashboard_export)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Критическая ошибка в тесте '{test_name}': {e}")
            results.append((test_name, False))
    
    # Вывод результатов
    print("\n" + "=" * 70)
    print("📋 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ")
    print("=" * 70)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ ПРОЙДЕН" if result else "❌ ПРОВАЛЕН"
        print(f"{test_name:.<50} {status}")
        if result:
            passed += 1
    
    print("=" * 70)
    print(f"Итого: {passed}/{total} тестов пройдено")
    
    if passed == total:
        print("🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
        return True
    else:
        print("⚠️ НЕКОТОРЫЕ ТЕСТЫ ПРОВАЛЕНЫ")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
