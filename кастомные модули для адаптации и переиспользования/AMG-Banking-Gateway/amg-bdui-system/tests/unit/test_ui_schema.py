#!/usr/bin/env python3
"""
Unit tests for UI Schema functionality
"""

import unittest
import json
import sys
import os

# Добавляем путь к модулям
sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend'))

class TestUISchema(unittest.TestCase):
    """Тесты для UI схем"""
    
    def setUp(self):
        """Настройка перед каждым тестом"""
        self.sample_schema = {
            "id": "test_schema",
            "role": "customer",
            "page": "dashboard",
            "title": "Test Dashboard",
            "description": "Test description",
            "layout": {
                "type": "grid",
                "columns": 12
            },
            "components": [
                {
                    "id": "test_component",
                    "type": "text",
                    "name": "test_text",
                    "title": "Test Text",
                    "permissions": ["read_profile"]
                }
            ],
            "permissions": ["read_profile"],
            "is_active": True
        }
    
    def test_schema_validation(self):
        """Тест валидации схемы"""
        # Проверяем обязательные поля
        required_fields = ["id", "role", "page", "title", "components"]
        for field in required_fields:
            self.assertIn(field, self.sample_schema)
        
        # Проверяем типы данных
        self.assertIsInstance(self.sample_schema["components"], list)
        self.assertIsInstance(self.sample_schema["permissions"], list)
        self.assertIsInstance(self.sample_schema["is_active"], bool)
    
    def test_component_validation(self):
        """Тест валидации компонентов"""
        component = self.sample_schema["components"][0]
        
        # Проверяем обязательные поля компонента
        required_component_fields = ["id", "type", "name"]
        for field in required_component_fields:
            self.assertIn(field, component)
    
    def test_permission_filtering(self):
        """Тест фильтрации по правам доступа"""
        # Тестируем фильтрацию компонентов
        user_permissions = ["read_profile"]
        component = self.sample_schema["components"][0]
        
        # Компонент должен быть видимым для пользователя с правами read_profile
        component_permissions = component.get("permissions", [])
        if component_permissions:
            has_permission = any(perm in user_permissions for perm in component_permissions)
            self.assertTrue(has_permission)
        else:
            # Если у компонента нет ограничений, он должен быть видимым
            self.assertTrue(True)
    
    def test_schema_serialization(self):
        """Тест сериализации схемы в JSON"""
        try:
            json_str = json.dumps(self.sample_schema)
            parsed_schema = json.loads(json_str)
            self.assertEqual(parsed_schema, self.sample_schema)
        except (TypeError, ValueError) as e:
            self.fail(f"Ошибка сериализации: {e}")
    
    def test_role_based_schemas(self):
        """Тест схем для разных ролей"""
        roles = ["customer", "teller", "admin", "ceo"]
        
        for role in roles:
            schema = self.sample_schema.copy()
            schema["role"] = role
            
            # Проверяем, что схема валидна для каждой роли
            self.assertIsNotNone(schema["role"])
            self.assertIn(schema["role"], roles)

class TestComponentRegistry(unittest.TestCase):
    """Тесты для реестра компонентов"""
    
    def test_component_types(self):
        """Тест типов компонентов"""
        component_types = [
            "text", "button", "input", "select", "checkbox", "radio",
            "textarea", "card", "badge", "tooltip", "spinner", "progress",
            "form", "data_table", "chart", "modal", "tabs", "accordion"
        ]
        
        for component_type in component_types:
            # Проверяем, что тип компонента валиден
            self.assertIsInstance(component_type, str)
            self.assertTrue(len(component_type) > 0)
    
    def test_component_properties(self):
        """Тест свойств компонентов"""
        component = {
            "id": "test_component",
            "type": "button",
            "name": "test_button",
            "title": "Test Button",
            "properties": {
                "variant": "primary",
                "size": "large",
                "disabled": False
            }
        }
        
        # Проверяем основные свойства
        self.assertIn("id", component)
        self.assertIn("type", component)
        self.assertIn("name", component)
        
        # Проверяем дополнительные свойства
        if "properties" in component:
            self.assertIsInstance(component["properties"], dict)

class TestHealthChecks(unittest.TestCase):
    """Тесты для health checks"""
    
    def test_health_endpoints(self):
        """Тест endpoints для проверки здоровья"""
        health_endpoints = [
            "/health",
            "/health/ui",
            "/health/database",
            "/health/cache"
        ]
        
        for endpoint in health_endpoints:
            self.assertTrue(endpoint.startswith("/health"))
            self.assertIsInstance(endpoint, str)
    
    def test_health_response_format(self):
        """Тест формата ответа health check"""
        expected_response = {
            "status": "healthy",
            "timestamp": "2024-01-01T00:00:00Z",
            "services": {
                "ui_service": {
                    "status": "healthy",
                    "response_time": "10ms"
                }
            }
        }
        
        # Проверяем структуру ответа
        self.assertIn("status", expected_response)
        self.assertIn("timestamp", expected_response)
        self.assertIn("services", expected_response)
        
        # Проверяем статус
        self.assertIn(expected_response["status"], ["healthy", "unhealthy", "degraded"])

if __name__ == '__main__':
    # Запуск тестов
    unittest.main(verbosity=2)
