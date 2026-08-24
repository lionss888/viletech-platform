#!/usr/bin/env python3
"""Скрипт для проверки подключения к fea-stage API."""

import os
import sys
import asyncio
import httpx
from pathlib import Path

# Добавляем путь к приложению
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings


async def check_connection():
    """Проверка подключения к fea-stage API."""
    print("=" * 60)
    print("Проверка подключения к fea-stage API")
    print("=" * 60)
    print()
    
    # Проверка конфигурации
    print("📋 Конфигурация:")
    print(f"  FEA_STAGE_API_URL: {settings.FEA_STAGE_API_URL or '(не установлен)'}")
    print(f"  FEA_STAGE_API_KEY: {'*' * 10 if settings.FEA_STAGE_API_KEY else '(не установлен)'}")
    print(f"  FEA_STAGE_EMAIL: {settings.FEA_STAGE_EMAIL or '(не установлен)'}")
    print(f"  FEA_STAGE_PASSWORD: {'*' * 10 if settings.FEA_STAGE_PASSWORD else '(не установлен)'}")
    print(f"  FEA_STAGE_TIMEOUT: {settings.FEA_STAGE_TIMEOUT}s")
    print()
    
    # Проверка наличия URL
    if not settings.FEA_STAGE_API_URL:
        print("❌ ОШИБКА: FEA_STAGE_API_URL не установлен!")
        print()
        print("Решение:")
        print("  1. Установите переменную окружения FEA_STAGE_API_URL")
        print("  2. Или добавьте её в docker-compose.yml")
        print("  3. Или создайте .env файл с FEA_STAGE_API_URL=...")
        return False
    
    # Проверка наличия аутентификации
    has_auth = bool(settings.FEA_STAGE_API_KEY or (settings.FEA_STAGE_EMAIL and settings.FEA_STAGE_PASSWORD))
    if not has_auth:
        print("⚠️  ПРЕДУПРЕЖДЕНИЕ: Не настроена аутентификация!")
        print("  Установите FEA_STAGE_API_KEY или FEA_STAGE_EMAIL + FEA_STAGE_PASSWORD")
        print()
    
    # Проверка доступности сервера
    print("🔍 Проверка доступности сервера...")
    try:
        async with httpx.AsyncClient(timeout=settings.FEA_STAGE_TIMEOUT) as client:
            # Пробуем простой GET запрос к базовому URL
            base_url = settings.FEA_STAGE_API_URL.rstrip('/')
            
            # Пробуем несколько эндпоинтов
            endpoints_to_check = [
                "/health",
                "/diadoc/health",
                "/api/health",
                "/"
            ]
            
            accessible = False
            for endpoint in endpoints_to_check:
                try:
                    url = f"{base_url}{endpoint}"
                    print(f"  Проверка: {url}")
                    response = await client.get(url, follow_redirects=True)
                    print(f"  ✅ Ответ получен: {response.status_code}")
                    accessible = True
                    break
                except httpx.ConnectError as e:
                    print(f"  ❌ Ошибка подключения: {str(e)}")
                except httpx.TimeoutException:
                    print(f"  ⏱️  Таймаут при подключении")
                except httpx.HTTPStatusError as e:
                    print(f"  ⚠️  HTTP {e.response.status_code}: {e.response.text[:100]}")
                    accessible = True  # Сервер доступен, но эндпоинт неверный
                    break
                except Exception as e:
                    print(f"  ❌ Неожиданная ошибка: {type(e).__name__}: {str(e)}")
            
            if not accessible:
                print()
                print("❌ Сервер недоступен по указанному адресу!")
                print()
                print("Возможные причины:")
                print("  1. Сервер fea-stage не запущен")
                print("  2. Неверный адрес в FEA_STAGE_API_URL")
                print("  3. Проблемы с сетью или файрволом")
                print("  4. Если используете Docker, проверьте host.docker.internal")
                print()
                print("Проверьте:")
                print(f"  - Доступность: curl {base_url}/health")
                print(f"  - Или откройте в браузере: {base_url}")
                return False
            
            print()
            print("✅ Сервер доступен!")
            
            # Если есть аутентификация, пробуем авторизоваться
            if has_auth:
                print()
                print("🔐 Проверка аутентификации...")
                try:
                    from app.integrations.fea_stage_client import FeaStageClient, FeaStageAuthError, FeaStageError
                    client_instance = FeaStageClient()
                    
                    if client_instance.is_configured:
                        # Если используется email/password, проверяем эндпоинт /auth/login
                        if settings.FEA_STAGE_EMAIL and settings.FEA_STAGE_PASSWORD:
                            print(f"  Проверка логина через /auth/login с email: {settings.FEA_STAGE_EMAIL}")
                            try:
                                auth_url = f"{base_url}/auth/login"
                                async with httpx.AsyncClient(timeout=settings.FEA_STAGE_TIMEOUT) as test_client:
                                    auth_response = await test_client.post(
                                        auth_url,
                                        json={"email": settings.FEA_STAGE_EMAIL, "password": settings.FEA_STAGE_PASSWORD},
                                        headers={"Content-Type": "application/json"}
                                    )
                                    print(f"  Статус ответа: {auth_response.status_code}")
                                    
                                    if auth_response.status_code == 200:
                                        data = auth_response.json()
                                        token = data.get("accessToken") or data.get("access_token") or data.get("token")
                                        if token:
                                            print(f"  ✅ Аутентификация успешна, получен токен (длина: {len(token)})")
                                        else:
                                            print(f"  ⚠️  Получен ответ 200, но токен отсутствует. Ответ: {data}")
                                    elif auth_response.status_code in (401, 403):
                                        print(f"  ❌ Ошибка аутентификации: {auth_response.status_code}")
                                        try:
                                            error_data = auth_response.json()
                                            print(f"  Детали: {error_data}")
                                        except:
                                            print(f"  Текст ответа: {auth_response.text[:200]}")
                                    elif auth_response.status_code >= 500:
                                        print(f"  ❌ Серверная ошибка fea-stage: {auth_response.status_code}")
                                        print(f"  ⚠️  Это проблема на стороне сервера fea-stage, а не аутентификации!")
                                        try:
                                            error_data = auth_response.json()
                                            print(f"  Детали: {error_data}")
                                        except:
                                            print(f"  Текст ответа: {auth_response.text[:200]}")
                                    else:
                                        print(f"  ⚠️  Неожиданный статус: {auth_response.status_code}")
                                        print(f"  Текст ответа: {auth_response.text[:200]}")
                            except httpx.ConnectError as e:
                                print(f"  ❌ Ошибка подключения к /auth/login: {str(e)}")
                            except httpx.TimeoutException:
                                print(f"  ⏱️  Таймаут при запросе к /auth/login")
                            except Exception as e:
                                print(f"  ❌ Ошибка при проверке /auth/login: {type(e).__name__}: {str(e)}")
                        
                        # Пробуем health check или простой запрос с токеном
                        try:
                            is_healthy = await client_instance.health_check()
                            if is_healthy:
                                print("  ✅ Health check прошёл успешно")
                            else:
                                print("  ⚠️  Health check не прошёл (эндпоинт может быть недоступен)")
                        except FeaStageAuthError as e:
                            print(f"  ❌ Ошибка аутентификации при health check: {str(e)}")
                        except FeaStageError as e:
                            error_msg = str(e)
                            if "server error" in error_msg.lower() or "500" in error_msg:
                                print(f"  ❌ Серверная ошибка fea-stage: {error_msg}")
                                print(f"  ⚠️  Это проблема на стороне сервера, а не аутентификации!")
                            else:
                                print(f"  ⚠️  Ошибка при health check: {error_msg}")
                        except Exception as e:
                            print(f"  ⚠️  Ошибка при health check: {type(e).__name__}: {str(e)}")
                    else:
                        print("  ⚠️  Клиент не настроен")
                except Exception as e:
                    print(f"  ❌ Ошибка при проверке аутентификации: {type(e).__name__}: {str(e)}")
                    import traceback
                    traceback.print_exc()
            
            return True
            
    except Exception as e:
        print(f"❌ Критическая ошибка: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Главная функция."""
    success = await check_connection()
    print()
    print("=" * 60)
    if success:
        print("✅ Проверка завершена успешно")
    else:
        print("❌ Обнаружены проблемы с подключением")
    print("=" * 60)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
