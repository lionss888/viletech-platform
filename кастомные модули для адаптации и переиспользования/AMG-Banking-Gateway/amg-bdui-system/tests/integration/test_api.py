#!/usr/bin/env python3
"""
Integration tests for API endpoints
"""

import unittest
import requests
import json
import time
import os

class TestAPIEndpoints(unittest.TestCase):
    """Тесты для API endpoints"""
    
    @classmethod
    def setUpClass(cls):
        """Настройка перед запуском всех тестов"""
        cls.base_url = "http://localhost:8080"
        cls.api_url = f"{cls.base_url}/api"
        
        # Ожидание готовности сервиса
        cls.wait_for_service()
    
    @classmethod
    def wait_for_service(cls, timeout=60):
        """Ожидание готовности сервиса"""
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                response = requests.get(f"{cls.base_url}/health", timeout=5)
                if response.status_code == 200:
                    print("✅ Сервис готов")
                    return
            except requests.exceptions.RequestException:
                pass
            time.sleep(2)
        
        raise Exception("Сервис не готов после ожидания")
    
    def test_health_endpoint(self):
        """Тест health endpoint"""
        response = requests.get(f"{self.base_url}/health")
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("timestamp", data)
    
    def test_ui_health_endpoint(self):
        """Тест UI health endpoint"""
        response = requests.get(f"{self.base_url}/health/ui")
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertIn("status", data)
    
    def test_database_health_endpoint(self):
        """Тест database health endpoint"""
        response = requests.get(f"{self.base_url}/health/database")
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertIn("status", data)
    
    def test_cache_health_endpoint(self):
        """Тест cache health endpoint"""
        response = requests.get(f"{self.base_url}/health/cache")
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertIn("status", data)
    
    def test_ui_schema_endpoint(self):
        """Тест UI schema endpoint"""
        # Тест получения схемы для customer dashboard
        response = requests.get(f"{self.api_url}/ui/schema/customer/dashboard")
        
        # Может быть 404 если схема не найдена, но endpoint должен работать
        self.assertIn(response.status_code, [200, 404])
        
        if response.status_code == 200:
            data = response.json()
            self.assertIn("success", data)
            self.assertIn("data", data)
    
    def test_ui_validate_endpoint(self):
        """Тест UI validate endpoint"""
        test_schema = {
            "role": "customer",
            "page": "dashboard",
            "title": "Test Dashboard",
            "components": [
                {
                    "id": "test_component",
                    "type": "text",
                    "name": "test_text"
                }
            ]
        }
        
        response = requests.post(
            f"{self.api_url}/ui/validate",
            json=test_schema,
            headers={"Content-Type": "application/json"}
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("success", data)
    
    def test_ui_status_endpoint(self):
        """Тест UI status endpoint"""
        response = requests.get(f"{self.api_url}/ui/status")
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertIn("success", data)
        self.assertIn("data", data)
    
    def test_roles_endpoint(self):
        """Тест roles endpoint"""
        response = requests.get(f"{self.api_url}/ui/roles")
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertIn("success", data)
        self.assertIn("data", data)
        
        # Проверяем, что возвращается список ролей
        if "data" in data:
            self.assertIsInstance(data["data"], list)
    
    def test_metrics_endpoint(self):
        """Тест metrics endpoint"""
        response = requests.get(f"{self.base_url}/metrics")
        self.assertEqual(response.status_code, 200)
        
        # Проверяем, что возвращаются метрики Prometheus
        content = response.text
        self.assertIn("prometheus", content.lower())

class TestFrontendIntegration(unittest.TestCase):
    """Тесты интеграции с frontend"""
    
    @classmethod
    def setUpClass(cls):
        """Настройка перед запуском всех тестов"""
        cls.frontend_url = "http://localhost:3000"
        cls.wait_for_frontend()
    
    @classmethod
    def wait_for_frontend(cls, timeout=60):
        """Ожидание готовности frontend"""
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                response = requests.get(cls.frontend_url, timeout=5)
                if response.status_code == 200:
                    print("✅ Frontend готов")
                    return
            except requests.exceptions.RequestException:
                pass
            time.sleep(2)
        
        print("⚠️ Frontend не готов, пропускаем тесты")
    
    def test_frontend_accessible(self):
        """Тест доступности frontend"""
        try:
            response = requests.get(self.frontend_url, timeout=10)
            self.assertEqual(response.status_code, 200)
        except requests.exceptions.RequestException:
            self.skipTest("Frontend недоступен")
    
    def test_frontend_has_html(self):
        """Тест наличия HTML в frontend"""
        try:
            response = requests.get(self.frontend_url, timeout=10)
            self.assertIn("html", response.text.lower())
        except requests.exceptions.RequestException:
            self.skipTest("Frontend недоступен")

if __name__ == '__main__':
    # Запуск тестов
    unittest.main(verbosity=2)
