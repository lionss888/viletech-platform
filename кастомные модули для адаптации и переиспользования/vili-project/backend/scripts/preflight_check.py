#!/usr/bin/env python3
"""
Скрипт проверки перед запуском VILI
Проверяет доступность всех необходимых сервисов и конфигурацию
"""

import sys
import os
import asyncio
import httpx
from pathlib import Path
from urllib.parse import urlparse
from typing import List, Tuple

# Добавляем путь к корню проекта
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from app.core.config import settings
except ImportError:
    print("❌ Не удалось импортировать настройки. Убедитесь, что вы в правильной директории.")
    sys.exit(1)


class Colors:
    """Цвета для вывода"""
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    CYAN = '\033[0;36m'
    NC = '\033[0m'  # No Color


def print_header(text: str):
    """Вывод заголовка"""
    print(f"\n{Colors.CYAN}{'=' * 60}{Colors.NC}")
    print(f"{Colors.CYAN}  {text}{Colors.NC}")
    print(f"{Colors.CYAN}{'=' * 60}{Colors.NC}\n")


def print_success(text: str):
    """Вывод успешного сообщения"""
    print(f"{Colors.GREEN}✅ {text}{Colors.NC}")


def print_error(text: str):
    """Вывод ошибки"""
    print(f"{Colors.RED}❌ {text}{Colors.NC}")


def print_warning(text: str):
    """Вывод предупреждения"""
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.NC}")


def print_info(text: str):
    """Вывод информации"""
    print(f"{Colors.BLUE}ℹ️  {text}{Colors.NC}")


class PreflightChecker:
    """Класс для проверки перед запуском"""
    
    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.checks_passed = 0
        self.checks_failed = 0
    
    async def check_service(self, name: str, url: str, timeout: float = 5.0) -> Tuple[bool, str]:
        """
        Проверка доступности сервиса
        
        Returns:
            Tuple[bool, str]: (успешно, сообщение)
        """
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                # Для разных типов сервисов разные проверки
                if 'ollama' in url.lower() or '11434' in url:
                    # Ollama - проверяем /api/tags
                    response = await client.get(f"{url}/api/tags")
                elif 'litellm' in url.lower() or '4000' in url:
                    # LiteLLM - проверяем /health
                    response = await client.get(f"{url}/health")
                elif 'postgres' in url.lower() or '5432' in url:
                    # PostgreSQL - просто проверяем, что можем подключиться
                    # Это делается через psycopg2, не через HTTP
                    return (True, "PostgreSQL проверяется через database connection")
                elif 'redis' in url.lower() or '6379' in url:
                    # Redis - проверяется через redis client
                    return (True, "Redis проверяется через redis connection")
                else:
                    # Общая HTTP проверка
                    response = await client.get(url)
                
                if response.status_code < 500:
                    return (True, f"Сервис доступен (HTTP {response.status_code})")
                else:
                    return (False, f"Сервис вернул ошибку (HTTP {response.status_code})")
        except httpx.TimeoutException:
            return (False, f"Таймаут подключения (>{timeout}s)")
        except httpx.ConnectError:
            return (False, "Не удалось подключиться")
        except Exception as e:
            return (False, f"Ошибка: {str(e)}")
    
    def check_file_exists(self, path: Path, description: str) -> bool:
        """Проверка существования файла"""
        if path.exists():
            print_success(f"{description}: {path}")
            return True
        else:
            print_error(f"{description} не найден: {path}")
            self.errors.append(f"Файл не найден: {path}")
            return False
    
    def check_directory_exists(self, path: Path, description: str, create_if_missing: bool = False) -> bool:
        """Проверка существования директории"""
        if path.exists() and path.is_dir():
            print_success(f"{description}: {path}")
            return True
        elif create_if_missing:
            path.mkdir(parents=True, exist_ok=True)
            print_success(f"{description} создана: {path}")
            return True
        else:
            print_error(f"{description} не найдена: {path}")
            self.errors.append(f"Директория не найдена: {path}")
            return False
    
    async def check_database_connection(self) -> bool:
        """Проверка подключения к базе данных"""
        try:
            from app.database.session import get_db
            from sqlalchemy import text
            
            # Пытаемся получить сессию и выполнить простой запрос
            async for db in get_db():
                result = await db.execute(text("SELECT 1"))
                result.scalar()
                print_success("Подключение к PostgreSQL успешно")
                return True
        except Exception as e:
            print_error(f"Не удалось подключиться к PostgreSQL: {str(e)}")
            self.errors.append(f"Database connection failed: {str(e)}")
            return False
    
    async def check_redis_connection(self) -> bool:
        """Проверка подключения к Redis"""
        try:
            import redis
            from urllib.parse import urlparse
            
            parsed = urlparse(settings.REDIS_URL)
            r = redis.Redis(
                host=parsed.hostname or 'localhost',
                port=parsed.port or 6379,
                db=int(parsed.path.lstrip('/')) if parsed.path else 0,
                socket_connect_timeout=3
            )
            r.ping()
            print_success("Подключение к Redis успешно")
            return True
        except Exception as e:
            print_warning(f"Не удалось подключиться к Redis: {str(e)}")
            self.warnings.append(f"Redis connection failed: {str(e)}")
            return False
    
    async def check_static_files(self) -> bool:
        """Проверка наличия статических файлов"""
        static_path = Path(__file__).parent.parent / "app" / "static"
        
        required_files = [
            (static_path / "css" / "common.css", "common.css"),
            (static_path / "js" / "common.js", "common.js"),
            (static_path / "chat" / "index.html", "chat/index.html"),
            (static_path / "admin" / "index.html", "admin/index.html"),
        ]
        
        all_ok = True
        for file_path, description in required_files:
            if not self.check_file_exists(file_path, description):
                all_ok = False
        
        return all_ok
    
    async def run_checks(self):
        """Запуск всех проверок"""
        print_header("ПРОВЕРКА ПЕРЕД ЗАПУСКОМ VILI")
        
        # 1. Проверка файлов и директорий
        print_header("1. ПРОВЕРКА ФАЙЛОВ И ДИРЕКТОРИЙ")
        
        backend_path = Path(__file__).parent.parent
        self.check_directory_exists(backend_path / "uploads", "Директория uploads", create_if_missing=True)
        self.check_directory_exists(backend_path / "logs", "Директория logs", create_if_missing=True)
        
        # Проверка статических файлов
        await self.check_static_files()
        
        # 2. Проверка конфигурации
        print_header("2. ПРОВЕРКА КОНФИГУРАЦИИ")
        
        print_info(f"Environment: {settings.ENVIRONMENT}")
        print_info(f"Database URL: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else 'N/A'}")
        print_info(f"Redis URL: {settings.REDIS_URL}")
        print_info(f"LiteLLM URL: {settings.LITELLM_URL}")
        print_info(f"Ollama URL: {settings.OLLAMA_URL}")
        
        # 3. Проверка подключений к сервисам
        print_header("3. ПРОВЕРКА ПОДКЛЮЧЕНИЙ К СЕРВИСАМ")
        
        # База данных
        try:
            await self.check_database_connection()
            self.checks_passed += 1
        except Exception as e:
            self.checks_failed += 1
            print_error(f"Database check failed: {e}")
        
        # Redis
        try:
            redis_ok = await self.check_redis_connection()
            if redis_ok:
                self.checks_passed += 1
            else:
                self.checks_failed += 1
        except Exception as e:
            self.checks_failed += 1
            print_error(f"Redis check failed: {e}")
        
        # LiteLLM
        print_info(f"Проверка LiteLLM: {settings.LITELLM_URL}")
        litellm_ok, litellm_msg = await self.check_service("LiteLLM", settings.LITELLM_URL, timeout=3.0)
        if litellm_ok:
            print_success(f"LiteLLM: {litellm_msg}")
            self.checks_passed += 1
        else:
            print_warning(f"LiteLLM: {litellm_msg}")
            self.warnings.append(f"LiteLLM недоступен: {litellm_msg}")
            self.checks_failed += 1
        
        # Ollama
        print_info(f"Проверка Ollama: {settings.OLLAMA_URL}")
        ollama_ok, ollama_msg = await self.check_service("Ollama", settings.OLLAMA_URL, timeout=3.0)
        if ollama_ok:
            print_success(f"Ollama: {ollama_msg}")
            self.checks_passed += 1
        else:
            print_warning(f"Ollama: {ollama_msg}")
            self.warnings.append(f"Ollama недоступен: {ollama_msg}")
            self.checks_failed += 1
        
        # 4. Итоговый отчет
        print_header("ИТОГОВЫЙ ОТЧЕТ")
        
        print_info(f"Проверок пройдено: {self.checks_passed}")
        print_info(f"Проверок провалено: {self.checks_failed}")
        print_info(f"Предупреждений: {len(self.warnings)}")
        print_info(f"Ошибок: {len(self.errors)}")
        
        if self.errors:
            print("\n" + Colors.RED + "КРИТИЧЕСКИЕ ОШИБКИ:" + Colors.NC)
            for error in self.errors:
                print_error(error)
        
        if self.warnings:
            print("\n" + Colors.YELLOW + "ПРЕДУПРЕЖДЕНИЯ:" + Colors.NC)
            for warning in self.warnings:
                print_warning(warning)
        
        # Решение о запуске
        if self.errors:
            print("\n" + Colors.RED + "❌ НЕЛЬЗЯ ЗАПУСКАТЬ: Есть критические ошибки!" + Colors.NC)
            return False
        elif self.checks_failed > 2:
            print("\n" + Colors.YELLOW + "⚠️  ЗАПУСК НЕ РЕКОМЕНДУЕТСЯ: Много сервисов недоступны" + Colors.NC)
            print_info("Приложение может работать некорректно")
            return False
        else:
            print("\n" + Colors.GREEN + "✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ: Можно запускать!" + Colors.NC)
            if self.warnings:
                print_info("Есть предупреждения, но они не критичны")
            return True


async def main():
    """Главная функция"""
    checker = PreflightChecker()
    success = await checker.run_checks()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
