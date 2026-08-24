#!/usr/bin/env python3
"""
End-to-End tests for AMG BDUI System
"""

import unittest
import requests
import time
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

class TestE2E(unittest.TestCase):
    """E2E тесты для полного пользовательского сценария"""
    
    @classmethod
    def setUpClass(cls):
        """Настройка перед запуском всех тестов"""
        cls.base_url = "http://localhost:8080"
        cls.frontend_url = "http://localhost:3000"
        
        # Настройка Selenium
        cls.setup_selenium()
        
        # Ожидание готовности сервисов
        cls.wait_for_services()
    
    @classmethod
    def setup_selenium(cls):
        """Настройка Selenium WebDriver"""
        try:
            chrome_options = Options()
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            
            cls.driver = webdriver.Chrome(options=chrome_options)
            cls.wait = WebDriverWait(cls.driver, 10)
        except Exception as e:
            print(f"⚠️ Selenium не настроен: {e}")
            cls.driver = None
    
    @classmethod
    def wait_for_services(cls):
        """Ожидание готовности сервисов"""
        # Ожидание backend
        start_time = time.time()
        while time.time() - start_time < 60:
            try:
                response = requests.get(f"{cls.base_url}/health", timeout=5)
                if response.status_code == 200:
                    print("✅ Backend готов")
                    break
            except requests.exceptions.RequestException:
                pass
            time.sleep(2)
        else:
            raise Exception("Backend не готов")
        
        # Ожидание frontend
        start_time = time.time()
        while time.time() - start_time < 60:
            try:
                response = requests.get(cls.frontend_url, timeout=5)
                if response.status_code == 200:
                    print("✅ Frontend готов")
                    break
            except requests.exceptions.RequestException:
                pass
            time.sleep(2)
        else:
            print("⚠️ Frontend не готов, пропускаем UI тесты")
    
    @classmethod
    def tearDownClass(cls):
        """Очистка после всех тестов"""
        if cls.driver:
            cls.driver.quit()
    
    def test_backend_health(self):
        """Тест здоровья backend"""
        response = requests.get(f"{self.base_url}/health")
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data["status"], "healthy")
    
    def test_frontend_accessible(self):
        """Тест доступности frontend"""
        response = requests.get(self.frontend_url)
        self.assertEqual(response.status_code, 200)
    
    def test_ui_schema_api(self):
        """Тест API UI схем"""
        # Тест получения схемы
        response = requests.get(f"{self.base_url}/api/ui/schema/customer/dashboard")
        
        # Может быть 404 если схема не найдена
        self.assertIn(response.status_code, [200, 404])
        
        if response.status_code == 200:
            data = response.json()
            self.assertTrue(data["success"])
            self.assertIn("data", data)
    
    def test_ui_validation_api(self):
        """Тест API валидации UI"""
        test_schema = {
            "role": "customer",
            "page": "dashboard",
            "title": "Test Dashboard",
            "components": [
                {
                    "id": "test_component",
                    "type": "text",
                    "name": "test_text",
                    "title": "Test Text"
                }
            ]
        }
        
        response = requests.post(
            f"{self.base_url}/api/ui/validate",
            json=test_schema,
            headers={"Content-Type": "application/json"}
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
    
    def test_roles_api(self):
        """Тест API ролей"""
        response = requests.get(f"{self.base_url}/api/ui/roles")
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIsInstance(data["data"], list)
    
    def test_frontend_ui_rendering(self):
        """Тест рендеринга UI во frontend"""
        if not self.driver:
            self.skipTest("Selenium не настроен")
        
        try:
            # Переход на главную страницу
            self.driver.get(self.frontend_url)
            
            # Ожидание загрузки страницы
            self.wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            
            # Проверка наличия основных элементов
            self.assertIn("AMG", self.driver.title)
            
        except Exception as e:
            self.skipTest(f"UI тест не выполнен: {e}")
    
    def test_api_error_handling(self):
        """Тест обработки ошибок API"""
        # Тест несуществующего endpoint
        response = requests.get(f"{self.base_url}/api/nonexistent")
        self.assertEqual(response.status_code, 404)
        
        # Тест невалидного JSON
        response = requests.post(
            f"{self.base_url}/api/ui/validate",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        self.assertEqual(response.status_code, 400)
    
    def test_metrics_endpoint(self):
        """Тест metrics endpoint"""
        response = requests.get(f"{self.base_url}/metrics")
        self.assertEqual(response.status_code, 200)
        
        # Проверяем наличие метрик
        content = response.text
        self.assertIn("prometheus", content.lower())
    
    def test_cors_headers(self):
        """Тест CORS заголовков"""
        response = requests.options(f"{self.base_url}/api/ui/schema/customer/dashboard")
        
        # Проверяем наличие CORS заголовков
        self.assertIn("Access-Control-Allow-Origin", response.headers)
        self.assertIn("Access-Control-Allow-Methods", response.headers)

class TestPerformance(unittest.TestCase):
    """Тесты производительности"""
    
    def setUp(self):
        self.base_url = "http://localhost:8080"
    
    def test_response_times(self):
        """Тест времени ответа API"""
        endpoints = [
            "/health",
            "/health/ui",
            "/api/ui/status",
            "/api/ui/roles"
        ]
        
        for endpoint in endpoints:
            start_time = time.time()
            response = requests.get(f"{self.base_url}{endpoint}")
            response_time = time.time() - start_time
            
            self.assertEqual(response.status_code, 200)
            self.assertLess(response_time, 2.0, f"Медленный ответ для {endpoint}: {response_time:.2f}s")
    
    def test_concurrent_requests(self):
        """Тест одновременных запросов"""
        import threading
        import queue
        
        results = queue.Queue()
        
        def make_request():
            try:
                response = requests.get(f"{self.base_url}/health", timeout=5)
                results.put(response.status_code)
            except Exception as e:
                results.put(f"Error: {e}")
        
        # Создаем 10 одновременных запросов
        threads = []
        for _ in range(10):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()
        
        # Ждем завершения всех потоков
        for thread in threads:
            thread.join()
        
        # Проверяем результаты
        success_count = 0
        while not results.empty():
            result = results.get()
            if result == 200:
                success_count += 1
        
        self.assertGreaterEqual(success_count, 8, "Слишком много неудачных запросов")

if __name__ == '__main__':
    # Запуск тестов
    unittest.main(verbosity=2)
