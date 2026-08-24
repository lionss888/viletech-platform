# Развертывание VILI

Руководство по развертыванию VILI Payment Assistant.

## Требования

### Системные требования

- **CPU**: 4+ ядер (8+ для production)
- **RAM**: 16GB минимум (32GB+ для LLM)
- **Disk**: 100GB+ SSD
- **GPU**: NVIDIA с 8GB+ VRAM (для локальных LLM)

### Программное обеспечение

- Docker 24.0+
- Docker Compose 2.20+
- Python 3.11+
- PostgreSQL 15+ с pgvector
- NVIDIA Driver 535+ (для GPU)

## Быстрый старт

### 1. Клонирование репозитория

```bash
git clone https://github.com/your-org/vili-project.git
cd vili-project
```

### 2. Настройка окружения

```bash
cp .env.example .env
# Отредактируйте .env с вашими настройками
```

### 3. Запуск с Docker Compose

```bash
docker-compose up -d
```

### 4. Проверка статуса

```bash
curl http://localhost:8000/api/v1/health/detailed
```

## Конфигурация

### Переменные окружения

```env
# Приложение
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=your-super-secret-key-min-32-chars
API_KEY=your-api-key-for-clients

# База данных
DATABASE_URL=postgresql://vili:password@postgres:5432/vili_db
POSTGRES_USER=vili
POSTGRES_PASSWORD=secure-password
POSTGRES_DB=vili_db

# Redis
REDIS_URL=redis://redis:6379/0

# LLM сервисы
LITELLM_URL=http://litellm:4000
OLLAMA_URL=http://ollama:11434
TGI_URL=http://tgi:8080

# Модели
DEFAULT_MODEL=local-llama
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_DIMENSION=768

# RAG
RAG_TOP_K=5
RAG_MIN_SIMILARITY=0.7

# Логирование
LOG_LEVEL=INFO
LOG_FORMAT=json

# CORS
CORS_ORIGINS=["https://your-domain.com"]
```

## Docker Compose

### Структура сервисов

```yaml
services:
  # Backend API
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
      - litellm
    environment:
      - DATABASE_URL=postgresql://...
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # PostgreSQL с pgvector
  postgres:
    image: pgvector/pgvector:pg15
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/init.sql:/docker-entrypoint-initdb.d/init.sql
    environment:
      - POSTGRES_USER=vili
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=vili_db

  # Redis
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  # LiteLLM Proxy
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    volumes:
      - ./litellm_config.yaml:/app/config.yaml
    command: --config /app/config.yaml
    ports:
      - "4000:4000"

  # Ollama (локальные LLM)
  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  # TGI для FinGPT
  tgi:
    image: ghcr.io/huggingface/text-generation-inference:latest
    volumes:
      - tgi_data:/data
    environment:
      - MODEL_ID=FinGPT/fingpt-sentiment_llama2-13b_lora
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

## Production Deployment

### Nginx Reverse Proxy

```nginx
upstream vili_backend {
    server backend:8000;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://vili_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts для LLM запросов
        proxy_read_timeout 300s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://vili_backend;
    }
}
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vili-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vili-backend
  template:
    metadata:
      labels:
        app: vili-backend
    spec:
      containers:
      - name: backend
        image: your-registry/vili-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: vili-secrets
              key: database-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /api/v1/health/liveness
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/v1/health/readiness
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: vili-backend
spec:
  selector:
    app: vili-backend
  ports:
  - port: 80
    targetPort: 8000
  type: ClusterIP
```

## Мониторинг

### Prometheus метрики

Метрики доступны по адресу: `http://localhost:8000/metrics`

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'vili-backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: /metrics
```

### Grafana Dashboard

Импортируйте dashboard из `monitoring/grafana/vili-dashboard.json`

Ключевые метрики:
- `http_requests_total` - общее количество запросов
- `http_request_duration_seconds` - время ответа
- `llm_requests_total` - запросы к LLM
- `document_processing_total` - обработанные документы
- `compliance_checks_total` - compliance проверки

### Health Checks

```bash
# Базовая проверка
curl http://localhost:8000/api/v1/health

# Детальная проверка
curl http://localhost:8000/api/v1/health/detailed

# Readiness (для Kubernetes)
curl http://localhost:8000/api/v1/health/readiness

# Liveness (для Kubernetes)
curl http://localhost:8000/api/v1/health/liveness
```

## Резервное копирование

### PostgreSQL

```bash
# Backup
docker exec postgres pg_dump -U vili vili_db > backup_$(date +%Y%m%d).sql

# Restore
cat backup.sql | docker exec -i postgres psql -U vili vili_db
```

### Автоматический backup

```bash
# crontab -e
0 2 * * * /opt/vili/scripts/backup.sh >> /var/log/vili-backup.log 2>&1
```

## Обновление

### Rolling Update

```bash
# Pull новые образы
docker-compose pull

# Обновление с нулевым downtime
docker-compose up -d --no-deps --build backend

# Проверка
curl http://localhost:8000/api/v1/health
```

### Database Migrations

```bash
# Применить миграции
docker-compose exec backend alembic upgrade head

# Откат
docker-compose exec backend alembic downgrade -1
```

## Troubleshooting

### Логи

```bash
# Все логи
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f backend

# Последние 100 строк
docker-compose logs --tail=100 backend
```

### Частые проблемы

**Postgres не запускается:**
```bash
docker-compose logs postgres
# Проверьте права на volume
```

**Ollama OOM:**
```bash
# Уменьшите размер модели или добавьте VRAM
docker-compose exec ollama ollama list
```

**LiteLLM не отвечает:**
```bash
curl http://localhost:4000/health
docker-compose restart litellm
```

## Security Checklist

- [ ] Изменены все дефолтные пароли
- [ ] Настроен HTTPS/TLS
- [ ] Включен rate limiting
- [ ] Настроен firewall
- [ ] Ограничен доступ к admin endpoints
- [ ] Настроены backup'ы
- [ ] Включено логирование
- [ ] Настроен мониторинг
- [ ] Проверены security headers
