#!/usr/bin/env python3
"""
Скрипт для загрузки методологии управления проектами в базу знаний VILI

Использование:
    python upload_project_methodology.py [--url API_URL] [--token TOKEN]

Примеры:
    python upload_project_methodology.py
    python upload_project_methodology.py --url http://localhost:8000 --token mock-token
"""

import argparse
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    print("Ошибка: требуется библиотека requests")
    print("Установите: pip install requests")
    sys.exit(1)


def upload_project_methodology(
    api_url: str = "http://localhost:8000",
    token: str = "mock-token",
    file_path: str = "UprPOjct.pdf"
) -> bool:
    """
    Загружает файл методологии управления проектами в базу знаний VILI.
    
    Args:
        api_url: URL API VILI
        token: Токен авторизации
        file_path: Путь к PDF файлу
    
    Returns:
        bool: True если загрузка успешна
    """
    file_path = Path(file_path)
    
    if not file_path.exists():
        print(f"Ошибка: файл {file_path} не найден")
        return False
    
    print("=" * 50)
    print("Загрузка методологии управления проектами")
    print("=" * 50)
    print(f"API URL: {api_url}")
    print(f"Файл: {file_path}")
    print()
    
    url = f"{api_url}/api/v1/knowledge_sources/upload"
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    data = {
        "name": "Методология управления проектами",
        "description": "Руководство по управлению проектами для бизнеса. "
                      "Включает методологии, этапы проекта, инструменты планирования.",
        "category": "project_management",
        "owner_only": "true"  # Form data передаётся как строка
    }
    
    files = {
        "file": (file_path.name, open(file_path, "rb"), "application/pdf")
    }
    
    try:
        print("Загрузка файла...")
        response = requests.post(url, headers=headers, data=data, files=files, timeout=120)
        
        if response.status_code == 201:
            result = response.json()
            print()
            print("Успех! Файл загружен.")
            print()
            print("Детали источника знаний:")
            print(f"  ID: {result.get('id')}")
            print(f"  Название: {result.get('name')}")
            print(f"  Категория: {result.get('category')}")
            print(f"  Chunks: {result.get('chunks_count', 'N/A')}")
            print(f"  Owner Only: {result.get('owner_only')}")
            print()
            print("Теперь ассистент VILI может отвечать на вопросы по управлению проектами!")
            print()
            print("Примеры запросов:")
            print("  - Как спланировать проект?")
            print("  - Что такое Scrum?")
            print("  - Какие этапы есть в проекте?")
            print("  - Как управлять рисками проекта?")
            return True
        else:
            print()
            print(f"Ошибка при загрузке (HTTP {response.status_code}):")
            try:
                print(response.json())
            except:
                print(response.text)
            return False
            
    except requests.exceptions.ConnectionError:
        print()
        print(f"Ошибка: не удалось подключиться к {api_url}")
        print("Убедитесь, что VILI сервер запущен.")
        return False
    except Exception as e:
        print()
        print(f"Ошибка: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Загрузка методологии управления проектами в VILI"
    )
    parser.add_argument(
        "--url", 
        default="http://localhost:8000",
        help="URL API VILI (по умолчанию: http://localhost:8000)"
    )
    parser.add_argument(
        "--token", 
        default="mock-token",
        help="Токен авторизации (по умолчанию: mock-token)"
    )
    parser.add_argument(
        "--file", 
        default="UprPOjct.pdf",
        help="Путь к PDF файлу (по умолчанию: UprPOjct.pdf)"
    )
    
    args = parser.parse_args()
    
    success = upload_project_methodology(
        api_url=args.url,
        token=args.token,
        file_path=args.file
    )
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
