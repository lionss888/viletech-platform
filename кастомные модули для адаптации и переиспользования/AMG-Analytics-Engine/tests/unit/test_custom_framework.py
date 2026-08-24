"""
Тесты для кастомного фреймворка дашборда
"""

import unittest
import os
import sys

# Добавляем корневую папку проекта в путь
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
project_root = os.path.join(os.path.dirname(__file__), '..', '..')
os.chdir(project_root)

class TestCustomFramework(unittest.TestCase):
    """Тесты кастомного фреймворка"""
    
    def test_css_file_exists(self):
        """Тест: CSS файл существует"""
        self.assertTrue(os.path.exists('custom_dashboard_framework.css'), 
                       "CSS файл не найден")
    
    def test_css_file_readable(self):
        """Тест: CSS файл читается"""
        try:
            with open('custom_dashboard_framework.css', 'r', encoding='utf-8') as f:
                content = f.read()
            self.assertGreater(len(content), 0, "CSS файл пустой")
        except Exception as e:
            self.fail(f"Ошибка чтения CSS файла: {e}")
    
    def test_css_syntax_valid(self):
        """Тест: CSS синтаксис корректен"""
        try:
            with open('custom_dashboard_framework.css', 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Проверяем наличие ключевых CSS правил
            required_rules = [
                ':root {',
                '.custom-dashboard {',
                '.custom-nav {',
                '.custom-sidebar {',
                '.custom-metric-card {',
                '.custom-btn {'
            ]
            
            for rule in required_rules:
                self.assertIn(rule, content, f"Отсутствует CSS правило: {rule}")
                
        except Exception as e:
            self.fail(f"Ошибка проверки CSS синтаксиса: {e}")
    
    def test_components_file_exists(self):
        """Тест: Файл компонентов существует"""
        self.assertTrue(os.path.exists('custom_dashboard_components.py'), 
                       "Файл компонентов не найден")
    
    def test_components_syntax_valid(self):
        """Тест: Синтаксис компонентов корректен"""
        try:
            with open('custom_dashboard_components.py', 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Компилируем для проверки синтаксиса
            compile(content, 'custom_dashboard_components.py', 'exec')
            self.assertTrue(True, "Файл компонентов компилируется без ошибок")
        except Exception as e:
            self.fail(f"Ошибка синтаксиса компонентов: {e}")
    
    def test_components_functions_exist(self):
        """Тест: Основные функции компонентов определены"""
        try:
            with open('custom_dashboard_components.py', 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Проверяем наличие ключевых функций
            required_functions = [
                'def load_custom_css():',
                'def custom_dashboard_container():',
                'def custom_navigation(',
                'def custom_sidebar():',
                'def custom_metric_card(',
                'def custom_metrics_grid(',
                'def custom_section(',
                'def custom_button(',
                'def format_number(',
                'def format_currency('
            ]
            
            for func in required_functions:
                self.assertIn(func, content, f"Отсутствует функция: {func}")
                
        except Exception as e:
            self.fail(f"Ошибка проверки функций: {e}")
    
    def test_dashboard_file_updated(self):
        """Тест: Основной файл дашборда обновлен"""
        try:
            with open('amg_dashboard.py', 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Проверяем использование нового фреймворка
            required_imports = [
                'from custom_dashboard_components import *',
                'load_custom_css()',
                'custom_dashboard_container()',
                'custom_navigation()',
                'custom_sidebar()',
                'custom_metrics_grid(',
                'format_number(',
                'format_currency('
            ]
            
            for item in required_imports:
                self.assertIn(item, content, f"Отсутствует использование: {item}")
                
        except Exception as e:
            self.fail(f"Ошибка проверки дашборда: {e}")
    
    def test_dockerfile_updated(self):
        """Тест: Dockerfile обновлен"""
        try:
            with open('Dockerfile.dashboard', 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Проверяем копирование новых файлов
            required_copies = [
                'COPY custom_dashboard_components.py .',
                'COPY custom_dashboard_framework.css .'
            ]
            
            for copy_cmd in required_copies:
                self.assertIn(copy_cmd, content, f"Отсутствует копирование: {copy_cmd}")
                
        except Exception as e:
            self.fail(f"Ошибка проверки Dockerfile: {e}")
    
    def test_css_variables_defined(self):
        """Тест: CSS переменные определены"""
        try:
            with open('custom_dashboard_framework.css', 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Проверяем наличие CSS переменных
            required_variables = [
                '--primary-bg:',
                '--secondary-bg:',
                '--primary-text:',
                '--accent-blue:',
                '--accent-green:',
                '--border-radius:',
                '--spacing-md:'
            ]
            
            for var in required_variables:
                self.assertIn(var, content, f"Отсутствует CSS переменная: {var}")
                
        except Exception as e:
            self.fail(f"Ошибка проверки CSS переменных: {e}")
    
    def test_responsive_design(self):
        """Тест: Адаптивный дизайн присутствует"""
        try:
            with open('custom_dashboard_framework.css', 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Проверяем медиа-запросы
            self.assertIn('@media (max-width:', content, 
                         "Отсутствуют медиа-запросы для адаптивности")
            
        except Exception as e:
            self.fail(f"Ошибка проверки адаптивности: {e}")
    
    def test_animations_defined(self):
        """Тест: Анимации определены"""
        try:
            with open('custom_dashboard_framework.css', 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Проверяем наличие анимаций
            self.assertIn('@keyframes fadeIn', content, 
                         "Отсутствуют анимации")
            self.assertIn('.custom-fade-in', content, 
                         "Отсутствуют классы анимаций")
            
        except Exception as e:
            self.fail(f"Ошибка проверки анимаций: {e}")

if __name__ == '__main__':
    unittest.main(verbosity=2)
