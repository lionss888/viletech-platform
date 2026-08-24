#!/usr/bin/env python3
"""
Скрипт мониторинга состояния контейнеров AMG
"""

import docker
import requests
import json
import time
import logging
from datetime import datetime
from typing import Dict, List, Any

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('amg_health.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class AMGHealthMonitor:
    """Мониторинг состояния системы AMG"""
    
    def __init__(self):
        try:
            self.client = docker.from_env()
        except Exception as e:
            logger.error(f"Ошибка подключения к Docker: {e}")
            self.client = None
    
    def check_container_health(self, container_name: str) -> Dict[str, Any]:
        """Проверка состояния конкретного контейнера"""
        try:
            container = self.client.containers.get(container_name)
            health = container.attrs.get('State', {}).get('Health', {})
            
            return {
                "name": container_name,
                "status": container.status,
                "health": health.get('Status', 'unknown'),
                "running": container.status == 'running',
                "restart_count": container.attrs['State'].get('RestartCount', 0),
                "memory_usage": container.attrs['MemoryStats'].get('usage', 0),
                "cpu_usage": container.attrs['CPUStats'].get('cpu_usage', {}).get('total_usage', 0)
            }
        except Exception as e:
            logger.error(f"Ошибка проверки контейнера {container_name}: {e}")
            return {
                "name": container_name,
                "status": "error",
                "health": "unknown",
                "running": False,
                "error": str(e)
            }
    
    def check_ollama_health(self) -> Dict[str, Any]:
        """Проверка состояния Ollama API"""
        try:
            response = requests.get('http://localhost:11434/api/tags', timeout=5)
            if response.status_code == 200:
                models = response.json().get('models', [])
                return {
                    "status": "healthy",
                    "models_count": len(models),
                    "models": [m['name'] for m in models],
                    "response_time": response.elapsed.total_seconds()
                }
            else:
                return {
                    "status": "unhealthy",
                    "http_status": response.status_code,
                    "error": f"HTTP {response.status_code}"
                }
        except Exception as e:
            logger.error(f"Ошибка проверки Ollama: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    def check_postgres_health(self) -> Dict[str, Any]:
        """Проверка состояния PostgreSQL"""
        try:
            container = self.client.containers.get('abs_postgres')
            logs = container.logs(tail=10).decode('utf-8')
            
            return {
                "status": "healthy" if container.status == 'running' else "unhealthy",
                "container_status": container.status,
                "recent_logs": logs.split('\n')[-5:],
                "port": "5432"
            }
        except Exception as e:
            logger.error(f"Ошибка проверки PostgreSQL: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    def check_dashboard_health(self) -> Dict[str, Any]:
        """Проверка состояния Streamlit Dashboard"""
        try:
            response = requests.get('http://localhost:8502', timeout=10)
            if response.status_code == 200:
                return {
                    "status": "healthy",
                    "http_status": response.status_code,
                    "response_time": response.elapsed.total_seconds(),
                    "accessible": True
                }
            else:
                return {
                    "status": "unhealthy",
                    "http_status": response.status_code,
                    "accessible": False
                }
        except Exception as e:
            logger.error(f"Ошибка проверки Dashboard: {e}")
            return {
                "status": "error",
                "error": str(e),
                "accessible": False
            }
    
    def get_system_overview(self) -> Dict[str, Any]:
        """Полный обзор состояния системы"""
        if not self.client:
            return {"error": "Docker недоступен"}
        
        containers = ['abs_postgres', 'abs_pgadmin', 'abs_ollama', 'abs_dashboard']
        container_statuses = {}
        
        for container in containers:
            container_statuses[container] = self.check_container_health(container)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "system_status": "healthy" if all(c["running"] for c in container_statuses.values()) else "degraded",
            "containers": container_statuses,
            "services": {
                "ollama": self.check_ollama_health(),
                "postgres": self.check_postgres_health(),
                "dashboard": self.check_dashboard_health()
            }
        }
    
    def generate_health_report(self) -> str:
        """Генерация текстового отчета о состоянии системы"""
        overview = self.get_system_overview()
        
        if "error" in overview:
            return f"❌ Ошибка мониторинга: {overview['error']}"
        
        report = f"""
🏥 ОТЧЕТ О СОСТОЯНИИ СИСТЕМЫ AMG
{'='*50}
Время проверки: {overview['timestamp']}
Общий статус: {overview['system_status'].upper()}

📊 СТАТУС КОНТЕЙНЕРОВ:
"""
        
        for container_name, status in overview['containers'].items():
            emoji = "✅" if status.get('running') else "❌"
            report += f"{emoji} {container_name}: {status.get('status', 'unknown')}\n"
        
        report += f"\n🤖 СТАТУС AI СЕРВИСОВ:\n"
        ollama_status = overview['services']['ollama']['status']
        ollama_emoji = "✅" if ollama_status == "healthy" else "❌"
        report += f"{ollama_emoji} Ollama: {ollama_status}\n"
        
        if ollama_status == "healthy":
            models_count = overview['services']['ollama'].get('models_count', 0)
            report += f"   📚 Доступно моделей: {models_count}\n"
        
        report += f"\n🗄️ БАЗА ДАННЫХ:\n"
        pg_status = overview['services']['postgres']['status']
        pg_emoji = "✅" if pg_status == "healthy" else "❌"
        report += f"{pg_emoji} PostgreSQL: {pg_status}\n"
        
        report += f"\n📊 DASHBOARD:\n"
        dash_status = overview['services']['dashboard']['status']
        dash_emoji = "✅" if dash_status == "healthy" else "❌"
        report += f"{dash_emoji} Streamlit: {dash_status}\n"
        
        return report
    
    def continuous_monitoring(self, interval: int = 60):
        """Непрерывный мониторинг системы"""
        logger.info("Запуск непрерывного мониторинга AMG...")
        
        while True:
            try:
                report = self.generate_health_report()
                logger.info(f"\n{report}")
                
                # Сохраняем отчет в файл
                with open('amg_health_report.txt', 'w', encoding='utf-8') as f:
                    f.write(report)
                
                time.sleep(interval)
                
            except KeyboardInterrupt:
                logger.info("Мониторинг остановлен пользователем")
                break
            except Exception as e:
                logger.error(f"Ошибка мониторинга: {e}")
                time.sleep(interval)

def main():
    """Основная функция"""
    monitor = AMGHealthMonitor()
    
    if not monitor.client:
        print("❌ Docker недоступен. Проверьте, что Docker запущен.")
        return
    
    print("🔍 Проверка состояния системы AMG...")
    report = monitor.generate_health_report()
    print(report)
    
    # Сохраняем отчет
    with open('amg_health_report.txt', 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(f"\n📄 Отчет сохранен в файл: amg_health_report.txt")
    
    # Спрашиваем о непрерывном мониторинге
    choice = input("\nЗапустить непрерывный мониторинг? (y/N): ").strip().lower()
    if choice == 'y':
        monitor.continuous_monitoring()

if __name__ == "__main__":
    main()
