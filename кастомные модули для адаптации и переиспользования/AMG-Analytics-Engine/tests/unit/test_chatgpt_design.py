#!/usr/bin/env python3
"""
Базовые тесты для ChatGPT дизайна AMG Dashboard
"""

import unittest
import os
import sys
import tempfile
import shutil

# Добавляем корневую папку проекта в путь
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
project_root = os.path.join(os.path.dirname(__file__), '..', '..')
os.chdir(project_root)

class TestChatGPTDesign(unittest.TestCase):
    """Тесты для ChatGPT дизайна"""
    
    def setUp(self):
        """Подготовка к тестам"""
        self.test_dir = tempfile.mkdtemp()
        
    def tearDown(self):
        """Очистка после тестов"""
        shutil.rmtree(self.test_dir)
    
    def test_css_file_exists(self):
        """Тест: CSS файл существует"""
        self.assertTrue(os.path.exists('chatgpt_style.css'), 
                       "chatgpt_style.css должен существовать")
    
    def test_css_file_readable(self):
        """Тест: CSS файл читается"""
        try:
            with open('chatgpt_style.css', 'r', encoding='utf-8') as f:
                content = f.read()
            self.assertIsInstance(content, str)
            self.assertGreater(len(content), 0)
        except Exception as e:
            self.fail(f"Не удалось прочитать CSS файл: {e}")
    
    def test_css_contains_chatgpt_variables(self):
        """Тест: CSS содержит переменные ChatGPT"""
        with open('chatgpt_style.css', 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_vars = [
            '--chatgpt-bg-primary',
            '--chatgpt-text-primary', 
            '--chatgpt-accent-blue',
            '--chatgpt-font'
        ]
        
        for var in required_vars:
            self.assertIn(var, content, f"CSS должен содержать переменную {var}")
    
    def test_components_file_exists(self):
        """Тест: Файл компонентов существует"""
        self.assertTrue(os.path.exists('chatgpt_components.py'),
                       "chatgpt_components.py должен существовать")
    
    def test_components_file_readable(self):
        """Тест: Файл компонентов читается"""
        try:
            with open('chatgpt_components.py', 'r', encoding='utf-8') as f:
                content = f.read()
            self.assertIsInstance(content, str)
            self.assertGreater(len(content), 0)
        except Exception as e:
            self.fail(f"Не удалось прочитать файл компонентов: {e}")
    
    def test_components_contain_functions(self):
        """Тест: Файл компонентов содержит нужные функции"""
        with open('chatgpt_components.py', 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_functions = [
            'def chatgpt_navigation',
            'def chatgpt_card',
            'def chatgpt_button',
            'def chatgpt_title',
            'def chatgpt_container'
        ]
        
        for func in required_functions:
            self.assertIn(func, content, f"Файл должен содержать функцию {func}")
    
    def test_dashboard_imports_components(self):
        """Тест: Dashboard импортирует ChatGPT компоненты"""
        with open('amg_dashboard.py', 'r', encoding='utf-8') as f:
            content = f.read()
        
        self.assertIn('from chatgpt_components import', content,
                     "Dashboard должен импортировать ChatGPT компоненты")
    
    def test_dashboard_uses_components(self):
        """Тест: Dashboard использует ChatGPT компоненты"""
        with open('amg_dashboard.py', 'r', encoding='utf-8') as f:
            content = f.read()
        
        required_usage = [
            'chatgpt_container()',
            'chatgpt_navigation()',
            'chatgpt_hero_section(',
            'chatgpt_card(',
            'chatgpt_grid('
        ]
        
        for usage in required_usage:
            self.assertIn(usage, content, f"Dashboard должен использовать {usage}")
    
    def test_dashboard_loads_css(self):
        """Тест: Dashboard загружает CSS"""
        with open('amg_dashboard.py', 'r', encoding='utf-8') as f:
            content = f.read()
        
        self.assertIn('chatgpt_style.css', content,
                     "Dashboard должен загружать CSS файл")
        self.assertIn('st.markdown', content,
                     "Dashboard должен использовать st.markdown для CSS")
    
    def test_css_syntax_valid(self):
        """Тест: CSS синтаксис корректен"""
        with open('chatgpt_style.css', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Проверяем базовую структуру CSS
        self.assertIn(':root {', content, "CSS должен содержать :root блок")
        self.assertIn('}', content, "CSS должен содержать закрывающие скобки")
        
        # Проверяем наличие основных селекторов
        required_selectors = [
            '.chatgpt-container',
            '.chatgpt-nav',
            '.chatgpt-card',
            '.chatgpt-btn'
        ]
        
        for selector in required_selectors:
            self.assertIn(selector, content, f"CSS должен содержать селектор {selector}")
    
    def test_components_syntax_valid(self):
        """Тест: Синтаксис компонентов корректен"""
        # Проверяем синтаксис без импорта streamlit
        try:
            with open('chatgpt_components.py', 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Компилируем для проверки синтаксиса
            compile(content, 'chatgpt_components.py', 'exec')
            self.assertTrue(True, "Файл компонентов компилируется без ошибок")
        except Exception as e:
            self.fail(f"Ошибка синтаксиса компонентов: {e}")

class TestDashboardIntegration(unittest.TestCase):
    """Тесты интеграции dashboard"""
    
    def test_dashboard_syntax_valid(self):
        """Тест: Синтаксис dashboard корректен"""
        try:
            # Проверяем синтаксис без запуска
            with open('amg_dashboard.py', 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Компилируем для проверки синтаксиса
            compile(content, 'amg_dashboard.py', 'exec')
            self.assertTrue(True, "Dashboard компилируется без ошибок")
        except Exception as e:
            self.fail(f"Ошибка синтаксиса dashboard: {e}")
    
    def test_required_files_exist(self):
        """Тест: Все необходимые файлы существуют"""
        required_files = [
            'amg_dashboard.py',
            'chatgpt_components.py', 
            'chatgpt_style.css',
            'auth_components.py',
            'auth_module.py',
            'requirements.txt'
        ]
        
        for file in required_files:
            self.assertTrue(os.path.exists(file), f"Файл {file} должен существовать")

def run_tests():
    """Запуск всех тестов"""
    print("🧪 Запуск тестов ChatGPT дизайна...")
    
    # Создаем test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Добавляем тесты
    suite.addTests(loader.loadTestsFromTestCase(TestChatGPTDesign))
    suite.addTests(loader.loadTestsFromTestCase(TestDashboardIntegration))
    
    # Запускаем тесты
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Выводим результат
    print(f"\n📊 Результаты тестов:")
    print(f"✅ Успешно: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"❌ Ошибки: {len(result.errors)}")
    print(f"⚠️  Провалы: {len(result.failures)}")
    
    if result.wasSuccessful():
        print("🎉 Все тесты прошли успешно!")
        return True
    else:
        print("💥 Некоторые тесты не прошли!")
        return False

if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
