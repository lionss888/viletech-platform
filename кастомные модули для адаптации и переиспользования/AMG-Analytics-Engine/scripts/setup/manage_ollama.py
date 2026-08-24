#!/usr/bin/env python3
"""
Скрипт для управления моделями Ollama в проекте AMG
"""

import requests
import json
import sys
import os
from typing import List, Dict

class OllamaManager:
    def __init__(self, host: str = "localhost", port: int = 11434):
        self.base_url = f"http://{host}:{port}"
        
    def is_server_running(self) -> bool:
        """Проверка доступности сервера Ollama"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def get_models(self) -> List[Dict]:
        """Получение списка установленных моделей"""
        try:
            response = requests.get(f"{self.base_url}/api/tags")
            if response.status_code == 200:
                return response.json().get('models', [])
            return []
        except Exception as e:
            print(f"Ошибка получения моделей: {e}")
            return []
    
    def pull_model(self, model_name: str) -> bool:
        """Загрузка модели"""
        print(f"Загружаем модель: {model_name}")
        try:
            response = requests.post(
                f"{self.base_url}/api/pull",
                json={"name": model_name}
            )
            if response.status_code == 200:
                print(f"✅ Модель {model_name} успешно загружена")
                return True
            else:
                print(f"❌ Ошибка загрузки модели {model_name}")
                return False
        except Exception as e:
            print(f"❌ Ошибка: {e}")
            return False
    
    def delete_model(self, model_name: str) -> bool:
        """Удаление модели"""
        print(f"Удаляем модель: {model_name}")
        try:
            response = requests.delete(f"{self.base_url}/api/delete", json={"name": model_name})
            if response.status_code == 200:
                print(f"✅ Модель {model_name} удалена")
                return True
            else:
                print(f"❌ Ошибка удаления модели {model_name}")
                return False
        except Exception as e:
            print(f"❌ Ошибка: {e}")
            return False
    
    def show_model_info(self, model_name: str) -> None:
        """Показать информацию о модели"""
        try:
            response = requests.post(
                f"{self.base_url}/api/show",
                json={"name": model_name}
            )
            if response.status_code == 200:
                model_info = response.json()
                print(f"\n📋 Информация о модели {model_name}:")
                print(f"Размер: {model_info.get('size', 'Неизвестно')} байт")
                print(f"Модифицирована: {model_info.get('modified_at', 'Неизвестно')}")
                print(f"Параметры: {model_info.get('parameter_size', 'Неизвестно')}")
            else:
                print(f"❌ Модель {model_name} не найдена")
        except Exception as e:
            print(f"❌ Ошибка: {e}")

def main():
    print("🤖 Ollama Manager для проекта AMG")
    print("=" * 50)
    
    # Проверяем переменные окружения
    host = os.getenv('OLLAMA_HOST', 'localhost')
    port = int(os.getenv('OLLAMA_PORT', 11434))
    
    manager = OllamaManager(host, port)
    
    if not manager.is_server_running():
        print("❌ Сервер Ollama недоступен!")
        print(f"Убедитесь, что Ollama запущен на {host}:{port}")
        sys.exit(1)
    
    print("✅ Сервер Ollama доступен")
    
    while True:
        print("\nВыберите действие:")
        print("1. 📋 Показать установленные модели")
        print("2. ⬇️  Загрузить модель")
        print("3. 🗑️  Удалить модель")
        print("4. ℹ️  Информация о модели")
        print("5. 🚀 Быстрая установка (llama2)")
        print("6. ❌ Выход")
        
        choice = input("\nВведите номер (1-6): ").strip()
        
        if choice == "1":
            models = manager.get_models()
            if models:
                print("\n📋 Установленные модели:")
                for model in models:
                    print(f"  - {model.get('name', 'Неизвестно')}")
            else:
                print("📋 Модели не установлены")
        
        elif choice == "2":
            model_name = input("Введите название модели (например, llama2): ").strip()
            if model_name:
                manager.pull_model(model_name)
            else:
                print("❌ Введите название модели")
        
        elif choice == "3":
            models = manager.get_models()
            if models:
                print("\nДоступные модели:")
                for i, model in enumerate(models, 1):
                    print(f"{i}. {model.get('name', 'Неизвестно')}")
                
                try:
                    model_index = int(input("Введите номер модели для удаления: ")) - 1
                    if 0 <= model_index < len(models):
                        model_name = models[model_index]['name']
                        confirm = input(f"Удалить модель {model_name}? (y/N): ").strip().lower()
                        if confirm == 'y':
                            manager.delete_model(model_name)
                        else:
                            print("❌ Удаление отменено")
                    else:
                        print("❌ Неверный номер")
                except ValueError:
                    print("❌ Введите корректный номер")
            else:
                print("📋 Модели не установлены")
        
        elif choice == "4":
            model_name = input("Введите название модели: ").strip()
            if model_name:
                manager.show_model_info(model_name)
            else:
                print("❌ Введите название модели")
        
        elif choice == "5":
            print("🚀 Быстрая установка llama2...")
            if manager.pull_model("llama2"):
                print("✅ Готово! Модель llama2 установлена")
            else:
                print("❌ Ошибка установки")
        
        elif choice == "6":
            print("👋 До свидания!")
            break
        
        else:
            print("❌ Неверный выбор. Попробуйте снова.")

if __name__ == "__main__":
    main()
