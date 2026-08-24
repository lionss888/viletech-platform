# Безопасность

## Обзор

Этот документ описывает меры безопасности, реализованные в Ollama BP Automation, и рекомендации по безопасному развертыванию.

## Текущие меры безопасности

### 1. Контейнеризация

- **Non-root пользователь**: Приложение запускается от непривилегированного пользователя
- **Минимальный образ**: Используется slim-образ Python для уменьшения поверхности атаки
- **Multi-stage build**: Разделение сборки и продакшн образов

### 2. Сетевая безопасность

- **CORS**: Настраиваемые разрешенные домены
- **Request ID**: Уникальная идентификация запросов для аудита
- **Таймауты**: Настроенные таймауты для HTTP запросов

### 3. Обработка данных

- **Валидация входных данных**: Pydantic схемы для всех API endpoints
- **SQL Injection защита**: Использование SQLAlchemy ORM
- **Логирование**: Структурированное логирование с Request ID

## Рекомендации по безопасности

### 1. Аутентификация и авторизация

**Статус**: ❌ Не реализовано

**Планируемые меры**:
- API ключи для аутентификации
- JWT токены для сессий
- RBAC (Role-Based Access Control)
- OAuth 2.0 интеграция

**Пример реализации**:
```python
# app/auth/jwt_handler.py
from jose import JWTError, jwt
from datetime import datetime, timedelta

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
```

### 2. Rate Limiting

**Статус**: ❌ Не реализовано

**Планируемые меры**:
- Ограничение запросов по IP
- Ограничение запросов по пользователю
- Защита от DDoS атак

**Пример реализации**:
```python
# app/middleware/rate_limit.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/v1/ask")
@limiter.limit("10/minute")
async def ask_question(request: Request, ...):
    # endpoint logic
```

### 3. Шифрование

**Статус**: ⚠️ Частично реализовано

**Текущее состояние**:
- HTTPS в продакшне (рекомендуется)
- Шифрование паролей БД

**Планируемые меры**:
- Шифрование чувствительных данных в БД
- Шифрование логов
- End-to-end шифрование для критических данных

### 4. Мониторинг и аудит

**Статус**: ⚠️ Частично реализовано

**Текущее состояние**:
- Request ID для трассировки
- Структурированное логирование

**Планируемые меры**:
- Централизованное логирование (ELK Stack)
- Мониторинг безопасности (SIEM)
- Алерты на подозрительную активность
- Аудит доступа к данным

### 5. Защита от атак

**Статус**: ⚠️ Частично реализовано

**Текущие меры**:
- Валидация входных данных
- Защита от SQL injection

**Планируемые меры**:
- CSRF защита
- XSS защита
- Защита от SSRF
- Input sanitization

## Конфигурация безопасности

### 1. Переменные окружения

```bash
# Безопасные настройки
APP_ENV=prod
LOG_LEVEL=INFO
ENABLE_CORS=https://yourdomain.com,https://api.yourdomain.com

# Секреты (используйте внешние системы управления секретами)
PG_DSN=postgresql+psycopg://user:strong_password@db:5432/appdb
JWT_SECRET_KEY=your-super-secret-jwt-key
ENCRYPTION_KEY=your-encryption-key
```

### 2. Docker Security

```dockerfile
# Использование non-root пользователя
USER appuser

# Минимальные права доступа
RUN chmod 755 /app
RUN chown -R appuser:appuser /app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1
```

### 3. Kubernetes Security

```yaml
# Pod Security Policy
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: ollama-bp-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
  - ALL
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'

# Network Policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ollama-bp-network-policy
spec:
  podSelector:
    matchLabels:
      app: ollama-bp-api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ollama-bp
    ports:
    - protocol: TCP
      port: 8000
```

## Управление секретами

### 1. Docker Secrets

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    image: ollama-bp-api
    secrets:
      - db_password
      - jwt_secret
    environment:
      - PG_DSN_FILE=/run/secrets/db_password
      - JWT_SECRET_FILE=/run/secrets/jwt_secret

secrets:
  db_password:
    external: true
  jwt_secret:
    external: true
```

### 2. Kubernetes Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ollama-bp-secrets
type: Opaque
data:
  db-password: c3Ryb25nLXBhc3N3b3Jk  # base64 encoded
  jwt-secret: eW91ci1zdXBlci1zZWNyZXQ=  # base64 encoded
```

### 3. External Secret Management

**HashiCorp Vault**:
```python
# app/secrets/vault.py
import hvac

client = hvac.Client(url='https://vault.example.com')
client.token = os.getenv('VAULT_TOKEN')

def get_secret(path, key):
    secret = client.secrets.kv.v2.read_secret_version(path=path)
    return secret['data']['data'][key]
```

**AWS Secrets Manager**:
```python
# app/secrets/aws.py
import boto3

client = boto3.client('secretsmanager')

def get_secret(secret_name):
    response = client.get_secret_value(SecretId=secret_name)
    return response['SecretString']
```

## Мониторинг безопасности

### 1. Логирование

```python
# app/utils/security_logging.py
import logging
from datetime import datetime

security_logger = logging.getLogger('security')

def log_security_event(event_type, user_id, details):
    security_logger.warning({
        'timestamp': datetime.utcnow().isoformat(),
        'event_type': event_type,
        'user_id': user_id,
        'details': details,
        'request_id': get_request_id()
    })

# Использование
log_security_event('failed_login', user_id, {'ip': request.client.host})
log_security_event('suspicious_request', user_id, {'endpoint': request.url})
```

### 2. Алерты

```yaml
# prometheus-rules.yml
groups:
- name: ollama-bp-security
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High error rate detected"
      
  - alert: SuspiciousActivity
    expr: rate(http_requests_total{endpoint="/v1/ask"}[1m]) > 100
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Suspicious activity detected"
```

## Compliance

### 1. GDPR

**Меры**:
- Логирование обработки персональных данных
- Возможность удаления данных пользователя
- Шифрование персональных данных
- Согласие на обработку данных

### 2. SOC 2

**Меры**:
- Контроль доступа
- Мониторинг безопасности
- Резервное копирование
- Аудит изменений

### 3. ISO 27001

**Меры**:
- Политика информационной безопасности
- Управление рисками
- Обучение персонала
- Регулярные аудиты

## План действий по безопасности

### Краткосрочные (1-3 месяца)

- [ ] Реализовать API ключи
- [ ] Добавить rate limiting
- [ ] Настроить HTTPS в продакшне
- [ ] Реализовать базовое логирование безопасности

### Среднесрочные (3-6 месяцев)

- [ ] JWT аутентификация
- [ ] RBAC система
- [ ] Шифрование чувствительных данных
- [ ] Централизованное логирование

### Долгосрочные (6-12 месяцев)

- [ ] OAuth 2.0 интеграция
- [ ] SIEM интеграция
- [ ] Автоматическое обнаружение угроз
- [ ] Compliance аудит

## Контакты по безопасности

- **Security Team**: security@yourcompany.com
- **Incident Response**: incident@yourcompany.com
- **Bug Bounty**: security@yourcompany.com

## Отчеты об уязвимостях

Если вы обнаружили уязвимость безопасности, пожалуйста:

1. НЕ создавайте публичный issue
2. Отправьте email на security@yourcompany.com
3. Включите подробное описание уязвимости
4. Укажите шаги для воспроизведения
5. Ожидайте ответа в течение 48 часов

## Обновления безопасности

Регулярно обновляйте:
- Зависимости Python
- Docker образы
- Kubernetes кластер
- Операционную систему

```bash
# Проверка уязвимостей в зависимостях
pip install safety
safety check

# Обновление зависимостей
pip install --upgrade -r requirements.txt
```
