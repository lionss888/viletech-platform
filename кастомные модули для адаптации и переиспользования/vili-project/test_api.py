#!/usr/bin/env python3
"""
Простой тестовый скрипт для проверки API endpoints
"""

import requests
import json
from uuid import uuid4

# Базовый URL API
BASE_URL = "http://localhost:8000"

def print_response(name: str, response):
    """Печатает ответ API"""
    print(f"\n{'='*60}")
    print(f"Test: {name}")
    print(f"Status: {response.status_code}")
    try:
        print(f"Response:\n{json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    except:
        print(f"Response: {response.text}")
    print(f"{'='*60}\n")


def test_health():
    """Тест health check"""
    response = requests.get(f"{BASE_URL}/api/v1/health")
    print_response("Health Check", response)
    return response.status_code == 200


def test_root():
    """Тест корневого endpoint"""
    response = requests.get(f"{BASE_URL}/")
    print_response("Root Endpoint", response)
    return response.status_code == 200


def test_documents_list():
    """Тест списка документов"""
    response = requests.get(f"{BASE_URL}/api/v1/documents/")
    print_response("List Documents", response)
    return response.status_code == 200


def test_knowledge_sources():
    """Тест источников знаний"""
    response = requests.get(f"{BASE_URL}/api/v1/knowledge-sources/")
    print_response("List Knowledge Sources", response)
    return response.status_code == 200


def test_compliance_statistics():
    """Тест статистики compliance"""
    response = requests.get(f"{BASE_URL}/api/v1/compliance/statistics")
    print_response("Compliance Statistics", response)
    return response.status_code == 200


def test_risk_statistics():
    """Тест статистики рисков"""
    response = requests.get(f"{BASE_URL}/api/v1/risk/statistics")
    print_response("Risk Statistics", response)
    return response.status_code == 200


def test_upload_document():
    """Тест загрузки документа"""
    # Создаем тестовый файл
    test_content = """
    SWIFT MESSAGE MT103
    :20:REFERENCE123
    :32A:240101USD1000.00
    :50:Test Sender
    :59:Test Receiver
    """
    
    files = {
        'file': ('test_payment.txt', test_content.encode(), 'text/plain')
    }
    
    customer_id = str(uuid4())
    
    response = requests.post(
        f"{BASE_URL}/api/v1/documents/upload",
        files=files,
        params={
            'document_type': 'traditional',
            'customer_id': customer_id
        }
    )
    
    print_response("Upload Document", response)
    
    if response.status_code == 200:
        return response.json().get('document_id')
    return None


def test_analyze_document(document_id: str):
    """Тест анализа документа"""
    if not document_id:
        print("Skipping analyze test - no document_id")
        return False
    
    response = requests.post(
        f"{BASE_URL}/api/v1/documents/{document_id}/analyze",
        json={
            "document_type": "traditional",
            "include_compliance": False,
            "include_risk": False,
            "use_rag": True
        }
    )
    
    print_response("Analyze Document", response)
    return response.status_code == 200


def test_compliance_check(document_id: str):
    """Тест compliance проверки"""
    if not document_id:
        print("Skipping compliance test - no document_id")
        return False
    
    response = requests.post(
        f"{BASE_URL}/api/v1/compliance/check",
        json={
            "document_id": document_id,
            "check_types": ["sanctions", "kyc", "aml"],
            "use_rag": True
        }
    )
    
    print_response("Compliance Check", response)
    return response.status_code == 200


def test_risk_assessment(document_id: str):
    """Тест оценки рисков"""
    if not document_id:
        print("Skipping risk test - no document_id")
        return False
    
    response = requests.post(
        f"{BASE_URL}/api/v1/risk/assess",
        json={
            "document_id": document_id,
            "include_economic_indices": True,
            "use_rag": True,
            "country_codes": ["USA", "RUS"]
        }
    )
    
    print_response("Risk Assessment", response)
    return response.status_code == 200


def main():
    """Запуск всех тестов"""
    print("\n" + "="*60)
    print("VILI API Testing")
    print("="*60)
    
    results = {}
    
    # Базовые тесты
    print("\n### БАЗОВЫЕ ENDPOINTS ###")
    results['root'] = test_root()
    results['health'] = test_health()
    
    # Тесты списков
    print("\n### СПИСКИ ###")
    results['documents_list'] = test_documents_list()
    results['knowledge_sources'] = test_knowledge_sources()
    results['compliance_stats'] = test_compliance_statistics()
    results['risk_stats'] = test_risk_statistics()
    
    # Тесты с документом
    print("\n### РАБОТА С ДОКУМЕНТАМИ ###")
    document_id = test_upload_document()
    
    if document_id:
        results['upload'] = True
        results['analyze'] = test_analyze_document(document_id)
        results['compliance'] = test_compliance_check(document_id)
        results['risk'] = test_risk_assessment(document_id)
    else:
        results['upload'] = False
        results['analyze'] = False
        results['compliance'] = False
        results['risk'] = False
    
    # Итоги
    print("\n" + "="*60)
    print("РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ")
    print("="*60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, passed_test in results.items():
        status = "✓ PASSED" if passed_test else "✗ FAILED"
        print(f"{test_name:20s} : {status}")
    
    print(f"\nИТОГО: {passed}/{total} тестов пройдено")
    print("="*60 + "\n")
    
    return passed == total


if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
