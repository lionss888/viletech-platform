# Руководство по интеграции Вили в приложение заказчика

## Обзор

Данный документ описывает различные способы интеграции Вили в существующее веб-приложение заказчика без зависимости от технологического стека заказчика.

**Дата создания:** 2025-01-27  
**Версия:** 1.0

---

## Варианты интеграции

### Вариант 1: JavaScript SDK + Widget (Рекомендуется)

**Преимущества:**
- ✅ Простая интеграция (один script tag)
- ✅ Полный контроль над UI компонентами
- ✅ Работает в любом веб-приложении
- ✅ Изолированные стили

**Недостатки:**
- ⚠️ Требует JavaScript в браузере
- ⚠️ Зависит от доступности CDN

---

### Вариант 2: Web Components

**Преимущества:**
- ✅ Стандарт веб-платформы
- ✅ Работает в любом фреймворке
- ✅ Инкапсуляция стилей и логики

**Недостатки:**
- ⚠️ Требует поддержку Custom Elements
- ⚠️ Может потребоваться polyfill для старых браузеров

---

### Вариант 3: REST API (Direct)

**Преимущества:**
- ✅ Максимальная гибкость
- ✅ Работает с любыми языками программирования
- ✅ Полный контроль над UI

**Недостатки:**
- ⚠️ Требует разработку собственного UI
- ⚠️ Больше работы по интеграции

---

## JavaScript SDK - Детальное руководство

### Установка

#### Способ 1: CDN (Рекомендуется)

```html
<!-- В <head> или перед закрывающим </body> -->
<script src="https://cdn.vili.ai/sdk/v1/vili-sdk.js"></script>
<link rel="stylesheet" href="https://cdn.vili.ai/sdk/v1/vili-sdk.css">
```

#### Способ 2: NPM

```bash
npm install @vili/sdk
```

```javascript
import { VILI } from '@vili/sdk';
import '@vili/sdk/dist/vili-sdk.css';
```

---

### Базовая интеграция

#### HTML приложение

```html
<!DOCTYPE html>
<html>
<head>
    <title>Мое приложение</title>
    <!-- VILI SDK -->
    <script src="https://cdn.vili.ai/sdk/v1/vili-sdk.js"></script>
    <link rel="stylesheet" href="https://cdn.vili.ai/sdk/v1/vili-sdk.css">
</head>
<body>
    <h1>Мое приложение</h1>
    
    <!-- Контейнер для VILI widget -->
    <div id="vili-assistant"></div>
    
    <script>
        // Инициализация VILI
        const vili = new VILI({
            apiUrl: 'https://api.vili.ai',
            apiKey: 'YOUR_API_KEY',
            theme: 'light',
            position: 'bottom-right',
            container: '#vili-assistant'
        });
        
        // Инициализация widget
        vili.init();
    </script>
</body>
</html>
```

---

### Конфигурация

#### Параметры конфигурации

```javascript
const config = {
    // Обязательные параметры
    apiKey: 'YOUR_API_KEY',           // API ключ для аутентификации
    apiUrl: 'https://api.vili.ai',    // URL API сервера
    
    // Опциональные параметры
    theme: 'light',                    // 'light' | 'dark' | 'auto'
    position: 'bottom-right',         // Позиция widget
    container: '#vili-assistant',     // Селектор контейнера
    language: 'ru',                    // Язык интерфейса
    autoInit: true,                    // Автоматическая инициализация
    
    // Настройки UI
    showWidget: true,                  // Показывать widget
    showChat: true,                    // Показывать chat интерфейс
    compactMode: false,                // Компактный режим
    
    // Callbacks
    onAnalysisComplete: (result) => {
        console.log('Анализ завершен:', result);
    },
    onError: (error) => {
        console.error('Ошибка:', error);
    }
};

const vili = new VILI(config);
```

---

### API методы

#### Анализ документа

```javascript
// Анализ документа из файла
const fileInput = document.getElementById('file-input');
const file = fileInput.files[0];

const result = await vili.analyzeDocument({
    file: file,
    type: 'traditional' // или 'crypto'
});

console.log('Результат анализа:', result);
```

```javascript
// Анализ документа из данных
const documentData = {
    type: 'SWIFT',
    data: 'MT103 message content...'
};

const result = await vili.analyzeDocument(documentData);
```

#### Проверка Compliance

```javascript
const complianceResult = await vili.checkCompliance({
    sender: {
        name: 'John Doe',
        account: '1234567890',
        country: 'US'
    },
    receiver: {
        name: 'Jane Smith',
        account: '0987654321',
        country: 'GB'
    },
    amount: 50000,
    currency: 'USD'
});

console.log('Compliance проверка:', complianceResult);
```

#### Оценка рисков

```javascript
const riskAssessment = await vili.assessRisk({
    documentId: 'doc-123',
    includeEconomicIndices: true,
    includeHistoricalData: true
});

console.log('Оценка рисков:', riskAssessment);
```

#### Генерация отчета

```javascript
const report = await vili.generateReport({
    documentId: 'doc-123',
    format: 'pdf', // 'pdf' | 'excel' | 'json'
    includeDetails: true
});

// Скачивание отчета
vili.downloadReport(report.id, report.format);
```

---

### События

#### Подписка на события

```javascript
// Анализ завершен
vili.on('analysis:complete', (result) => {
    console.log('Анализ завершен:', result);
    // Обновление UI приложения
    updateUI(result);
});

// Ошибка
vili.on('error', (error) => {
    console.error('Ошибка:', error);
    showError(error.message);
});

// Compliance проверка завершена
vili.on('compliance:complete', (result) => {
    console.log('Compliance:', result);
});

// Оценка рисков завершена
vili.on('risk:complete', (result) => {
    console.log('Риски:', result);
});

// Отписка от события
vili.off('analysis:complete', handler);
```

#### Кастомные события

```javascript
// Отправка события в VILI
vili.emit('custom:event', { data: 'value' });
```

---

### Интеграция с формами

#### Пример: Форма платежа

```html
<form id="payment-form">
    <input type="file" id="document-input" accept=".pdf,.xml,.txt">
    <button type="button" onclick="analyzeDocument()">Анализировать</button>
    <div id="analysis-result"></div>
</form>

<script>
async function analyzeDocument() {
    const fileInput = document.getElementById('document-input');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Выберите файл');
        return;
    }
    
    try {
        // Показ индикатора загрузки
        vili.showLoading();
        
        // Анализ документа
        const result = await vili.analyzeDocument({
            file: file,
            type: 'traditional'
        });
        
        // Отображение результата
        displayResult(result);
        
    } catch (error) {
        console.error('Ошибка анализа:', error);
        alert('Ошибка при анализе документа');
    } finally {
        vili.hideLoading();
    }
}

function displayResult(result) {
    const resultDiv = document.getElementById('analysis-result');
    resultDiv.innerHTML = `
        <h3>Результаты анализа</h3>
        <p>Статус: ${result.status}</p>
        <p>Риск: ${result.riskLevel}</p>
        <p>Рекомендация: ${result.recommendation}</p>
        <pre>${JSON.stringify(result.details, null, 2)}</pre>
    `;
}
</script>
```

---

## Web Components - Детальное руководство

### Установка

```html
<script type="module" src="https://cdn.vili.ai/components/v1/vili-assistant.js"></script>
```

---

### Использование

#### Базовое использование

```html
<vili-assistant 
    api-key="YOUR_API_KEY"
    api-url="https://api.vili.ai"
    theme="light"
></vili-assistant>
```

#### С событиями

```html
<vili-assistant 
    api-key="YOUR_API_KEY"
    id="vili-component"
></vili-assistant>

<script>
const component = document.getElementById('vili-component');

component.addEventListener('analysis-complete', (event) => {
    console.log('Анализ завершен:', event.detail);
});

component.addEventListener('error', (event) => {
    console.error('Ошибка:', event.detail);
});
</script>
```

---

### Интеграция в React

```jsx
import { useEffect, useRef } from 'react';

function PaymentForm() {
    const viliRef = useRef(null);
    
    useEffect(() => {
        // Загрузка Web Component
        const script = document.createElement('script');
        script.src = 'https://cdn.vili.ai/components/v1/vili-assistant.js';
        script.type = 'module';
        document.head.appendChild(script);
        
        return () => {
            document.head.removeChild(script);
        };
    }, []);
    
    const handleAnalyze = async () => {
        if (viliRef.current) {
            const result = await viliRef.current.analyzeDocument(documentData);
            console.log('Результат:', result);
        }
    };
    
    return (
        <div>
            <button onClick={handleAnalyze}>Анализировать</button>
            <vili-assistant
                ref={viliRef}
                api-key={process.env.REACT_APP_VILI_API_KEY}
                theme="light"
            />
        </div>
    );
}
```

---

### Интеграция в Vue.js

```vue
<template>
    <div>
        <button @click="analyzeDocument">Анализировать</button>
        <vili-assistant
            ref="vili"
            :api-key="apiKey"
            theme="light"
            @analysis-complete="handleAnalysis"
        />
    </div>
</template>

<script>
export default {
    data() {
        return {
            apiKey: process.env.VUE_APP_VILI_API_KEY
        };
    },
    mounted() {
        // Загрузка Web Component
        const script = document.createElement('script');
        script.src = 'https://cdn.vili.ai/components/v1/vili-assistant.js';
        script.type = 'module';
        document.head.appendChild(script);
    },
    methods: {
        async analyzeDocument() {
            const result = await this.$refs.vili.analyzeDocument(this.documentData);
            this.handleAnalysis(result);
        },
        handleAnalysis(result) {
            console.log('Результат анализа:', result);
        }
    }
};
</script>
```

---

### Интеграция в Angular

```typescript
import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
    selector: 'app-payment',
    template: `
        <button (click)="analyze()">Анализировать</button>
        <vili-assistant
            [api-key]="apiKey"
            theme="light"
            (analysis-complete)="handleAnalysis($event)"
        ></vili-assistant>
    `,
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PaymentComponent implements OnInit {
    apiKey = environment.viliApiKey;
    
    ngOnInit() {
        // Загрузка Web Component
        const script = document.createElement('script');
        script.src = 'https://cdn.vili.ai/components/v1/vili-assistant.js';
        script.type = 'module';
        document.head.appendChild(script);
    }
    
    async analyze() {
        // Использование через @ViewChild или события
    }
    
    handleAnalysis(event: CustomEvent) {
        console.log('Результат:', event.detail);
    }
}
```

---

## REST API - Детальное руководство

### Аутентификация

Все запросы к API требуют аутентификации через API Key:

```http
Authorization: Bearer YOUR_API_KEY
```

---

### Endpoints

#### Анализ документа

```http
POST /api/v1/documents/analyze
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
    "document": {
        "type": "SWIFT",
        "data": "MT103 message..."
    },
    "options": {
        "includeCompliance": true,
        "includeRiskAssessment": true
    }
}
```

**Ответ:**

```json
{
    "id": "doc-123",
    "status": "completed",
    "analysis": {
        "extractedData": {
            "amount": 50000,
            "currency": "USD",
            "sender": "John Doe",
            "receiver": "Jane Smith"
        },
        "sentiment": "neutral",
        "entities": [...]
    },
    "compliance": {
        "sanctionsCheck": "passed",
        "kycCheck": "passed",
        "amlCheck": "warning"
    },
    "riskAssessment": {
        "score": 0.35,
        "level": "medium",
        "recommendation": "review"
    }
}
```

#### Проверка Compliance

```http
POST /api/v1/compliance/check
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
    "sender": {
        "name": "John Doe",
        "account": "1234567890",
        "country": "US"
    },
    "receiver": {
        "name": "Jane Smith",
        "account": "0987654321",
        "country": "GB"
    },
    "amount": 50000,
    "currency": "USD"
}
```

#### Оценка рисков

```http
POST /api/v1/risk/assess
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
    "documentId": "doc-123",
    "includeEconomicIndices": true,
    "includeHistoricalData": true
}
```

#### Генерация отчета

```http
POST /api/v1/reports/generate
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
    "documentId": "doc-123",
    "format": "pdf",
    "includeDetails": true
}
```

---

### Примеры интеграции

#### Python

```python
import requests

class VILIAPIClient:
    def __init__(self, api_key, api_url='https://api.vili.ai'):
        self.api_key = api_key
        self.api_url = api_url
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    
    def analyze_document(self, document_data):
        response = requests.post(
            f'{self.api_url}/api/v1/documents/analyze',
            headers=self.headers,
            json={'document': document_data}
        )
        response.raise_for_status()
        return response.json()
    
    def check_compliance(self, payment_data):
        response = requests.post(
            f'{self.api_url}/api/v1/compliance/check',
            headers=self.headers,
            json=payment_data
        )
        response.raise_for_status()
        return response.json()

# Использование
client = VILIAPIClient('YOUR_API_KEY')
result = client.analyze_document({
    'type': 'SWIFT',
    'data': 'MT103 message...'
})
```

#### JavaScript/TypeScript

```typescript
class VILIAPIClient {
    constructor(private apiKey: string, private apiUrl: string = 'https://api.vili.ai') {}
    
    private async request(endpoint: string, data: any) {
        const response = await fetch(`${this.apiUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        
        return response.json();
    }
    
    async analyzeDocument(documentData: any) {
        return this.request('/api/v1/documents/analyze', { document: documentData });
    }
    
    async checkCompliance(paymentData: any) {
        return this.request('/api/v1/compliance/check', paymentData);
    }
}

// Использование
const client = new VILIAPIClient('YOUR_API_KEY');
const result = await client.analyzeDocument({
    type: 'SWIFT',
    data: 'MT103 message...'
});
```

---

## Безопасность

### API Keys

- Храните API ключи в переменных окружения
- Не коммитьте ключи в репозиторий
- Используйте разные ключи для разных окружений

### CORS

API поддерживает CORS для указанных доменов. Укажите домены при регистрации.

### Rate Limiting

API имеет ограничения по количеству запросов:
- Free tier: 100 запросов/час
- Pro tier: 1000 запросов/час
- Enterprise: без ограничений

---

## Обработка ошибок

### Коды ошибок

- `400` - Неверный запрос
- `401` - Не авторизован
- `403` - Доступ запрещен
- `404` - Не найдено
- `429` - Слишком много запросов
- `500` - Внутренняя ошибка сервера

### Пример обработки

```javascript
try {
    const result = await vili.analyzeDocument(documentData);
} catch (error) {
    if (error.status === 401) {
        // Неверный API ключ
        console.error('Проверьте API ключ');
    } else if (error.status === 429) {
        // Превышен лимит запросов
        console.error('Превышен лимит запросов');
    } else {
        // Другая ошибка
        console.error('Ошибка:', error.message);
    }
}
```

---

## Тестирование интеграции

### Тестовый API ключ

Для тестирования используйте тестовый API ключ:
```
test_api_key_12345
```

Тестовый ключ работает с тестовыми данными и не списывает лимиты.

### Примеры тестовых данных

```javascript
const testDocument = {
    type: 'SWIFT',
    data: 'MT103 test message...'
};

const result = await vili.analyzeDocument(testDocument);
```

---

## Поддержка

### Документация

- Полная документация API: https://docs.vili.ai
- Примеры интеграции: https://github.com/vili/examples
- FAQ: https://docs.vili.ai/faq

### Контакты

- Email: support@vili.ai
- Slack: #vili-support
- GitHub Issues: https://github.com/vili/issues

---

## Заключение

Вили предоставляет несколько способов интеграции:

1. **JavaScript SDK** - для быстрой интеграции с готовым UI
2. **Web Components** - для современных фреймворков
3. **REST API** - для полного контроля над интеграцией

Выберите наиболее подходящий вариант для вашего приложения.
