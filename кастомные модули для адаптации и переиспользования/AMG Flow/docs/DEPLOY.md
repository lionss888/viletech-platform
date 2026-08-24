# Развертывание

## Docker Compose (Рекомендуется)

### Быстрый старт

```bash
# Клонируйте репозиторий
git clone <repository-url>
cd ollama-bp-automation

# Настройте переменные окружения
cp env.example .env
# Отредактируйте .env файл

# Запустите все сервисы
docker compose up --build -d

# Проверьте статус
docker compose ps
```

## Внешний PostgreSQL (Docker-кластер)

### Подключение к внешнему кластеру PostgreSQL

#### Сценарий A: Кластер на том же хосте

```bash
# 1. Настройте подключение
cp env.customer.example .env.customer

# Отредактируйте .env.customer:
PG_DSN=postgresql+psycopg://APP_USER:STRONG_PASS@host.docker.internal:5432/APP_DB?sslmode=require&application_name=ollama-bp-api&connect_timeout=5

# 2. Проверьте подключение
make db-smoke

# 3. Запустите миграции
make db-migrate

# 4. Запустите сервисы
make customer-up

# 5. Проверьте здоровье
curl http://localhost:8000/health/db
```

#### Сценарий B: Кластер в другом Docker-хосте/VM

```bash
# 1. Настройте подключение
cp env.customer.example .env.customer

# Отредактируйте .env.customer:
PG_DSN=postgresql+psycopg://APP_USER:STRONG_PASS@postgres.example.com:5432/APP_DB?sslmode=require&application_name=ollama-bp-api&connect_timeout=5

# 2. Настройте Docker network (если нужно)
# Раскомментируйте в docker-compose.customer.yml:
# networks:
#   customer-pg-net:
#     external: true

# 3. Проверьте подключение
make db-smoke

# 4. Запустите миграции
make db-migrate

# 5. Запустите сервисы
make customer-up
```

### Быстрый чек-лист

1. ✅ Скопируйте `.env.customer.example` → `.env.customer` и заполните `PG_DSN`
2. ✅ (Если нужно) подключите внешний docker-network в `docker-compose.customer.yml`
3. ✅ Проверка доступа: `make db-smoke`
4. ✅ Миграции: `make db-migrate`
5. ✅ Запуск: `docker compose -f docker-compose.yml -f docker-compose.customer.yml up --build`
6. ✅ Проверка: `GET /health/db` должен вернуть `ok:true`

### Сервисы

- **API** - http://localhost:8000
- **Client** - http://localhost:5173 (dev) или http://localhost:3000 (prod)
- **Ollama** - http://localhost:11434
- **PostgreSQL** - localhost:5432

### Команды управления

```bash
# Запуск
docker compose up -d

# Остановка
docker compose down

# Перезапуск
docker compose restart

# Просмотр логов
docker compose logs -f

# Очистка
docker compose down -v --remove-orphans
```

## Docker (Отдельные контейнеры)

### Backend

```bash
# Сборка образа
docker build -t ollama-bp-api .

# Запуск с переменными окружения
docker run -d \
  --name ollama-bp-api \
  -p 8000:8000 \
  -e OLLAMA_HOST=http://ollama:11434 \
  -e PG_DSN=postgresql+psycopg://user:pass@db:5432/appdb \
  ollama-bp-api
```

### Frontend

```bash
# Сборка образа
cd client
docker build -t ollama-bp-client .

# Запуск
docker run -d \
  --name ollama-bp-client \
  -p 3000:80 \
  -e VITE_API_BASE_URL=http://localhost:8000 \
  ollama-bp-client
```

## 🔧 Blue-Green Deployment

### Архитектура

```
┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Client        │
│   (nginx)       │    │   (React)       │
│   Port: 8000    │    │   Port: 80      │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼───┐        ┌───▼───┐        ┌───▼───┐
│ Blue  │        │ Green │        │  DB   │
│ API   │        │ API   │        │       │
│ :8000 │        │ :8000 │        │ :5432 │
└───────┘        └───────┘        └───────┘
```

### Blue-Green команды

```bash
# Развертывание
make deploy-blue          # Развернуть синюю версию
make deploy-green         # Развернуть зеленую версию
make switch-green         # Переключиться на зеленую
make switch-blue          # Переключиться на синюю
make rollback             # Откат к предыдущей версии

# Мониторинг
make deploy-status        # Статус развертывания
make logs-api             # Логи API
make logs-client          # Логи клиента
make perf-test            # Тест производительности
```

### Оптимизированные команды для разработки

```bash
# Пересборка только измененных сервисов
make build-changed

# Перезапуск только API
make restart-api

# Перезапуск только клиента
make restart-client

# Быстрая проверка здоровья
make health-quick
```

## Kubernetes

### Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ollama-bp
```

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ollama-bp-config
  namespace: ollama-bp
data:
  APP_ENV: "prod"
  HOST: "0.0.0.0"
  PORT: "8000"
  OLLAMA_HOST: "http://ollama-service:11434"
  OLLAMA_MODEL: "llama3.1"
  DB_POOL_SIZE: "20"
  DB_POOL_TIMEOUT: "60"
  LOG_LEVEL: "INFO"
  REQUEST_ID_HEADER: "X-Request-ID"
```

### Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ollama-bp-secret
  namespace: ollama-bp
type: Opaque
data:
  # External PostgreSQL connection string (base64 encoded)
  PG_DSN: cG9zdGdyZXNxbCtwc3ljb3BnOi8vYXBwX3VzZXI6c3Ryb25nX3Bhc3NAcG9zdGdyZXMuZXhhbXBsZS5jb206NTQzMi9hcHBfZGI/c3NsbW9kZT1yZXF1aXJlJmFwcGxpY2F0aW9uX25hbWU9b2xsYW1hLWJwLWFwaSZjb25uZWN0X3RpbWVvdXQ9NQ==
  ENABLE_CORS: aHR0cHM6Ly95b3VyZG9tYWluLmNvbQ==  # base64 encoded
```

### External PostgreSQL with Custom CA

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-ca-cert
  namespace: ollama-bp
type: Opaque
data:
  ca.crt: LS0tLS1CRUdJTi...  # base64 encoded CA certificate
```

```yaml
# In deployment, mount the CA certificate
volumes:
- name: postgres-ca
  secret:
    secretName: postgres-ca-cert
    items:
    - key: ca.crt
      path: ca.crt

volumeMounts:
- name: postgres-ca
  mountPath: /etc/pg
  readOnly: true

# Use in environment
env:
- name: PG_DSN
  value: "postgresql+psycopg://user:pass@postgres.example.com:5432/db?sslmode=verify-full&sslrootcert=/etc/pg/ca.crt"
```

### PostgreSQL Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: ollama-bp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: appdb
        - name: POSTGRES_USER
          value: user
        - name: POSTGRES_PASSWORD
          value: pass
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: ollama-bp
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

### API Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ollama-bp-api
  namespace: ollama-bp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ollama-bp-api
  template:
    metadata:
      labels:
        app: ollama-bp-api
    spec:
      containers:
      - name: api
        image: ollama-bp-api:latest
        ports:
        - containerPort: 8000
        envFrom:
        - configMapRef:
            name: ollama-bp-config
        - secretRef:
            name: ollama-bp-secret
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: ollama-bp-api-service
  namespace: ollama-bp
spec:
  selector:
    app: ollama-bp-api
  ports:
  - port: 80
    targetPort: 8000
  type: LoadBalancer
```

### Client Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ollama-bp-client
  namespace: ollama-bp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ollama-bp-client
  template:
    metadata:
      labels:
        app: ollama-bp-client
    spec:
      containers:
      - name: client
        image: ollama-bp-client:latest
        ports:
        - containerPort: 80
        env:
        - name: VITE_API_BASE_URL
          value: "http://ollama-bp-api-service"
---
apiVersion: v1
kind: Service
metadata:
  name: ollama-bp-client-service
  namespace: ollama-bp
spec:
  selector:
    app: ollama-bp-client
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

### Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ollama-bp-ingress
  namespace: ollama-bp
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: yourdomain.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: ollama-bp-api-service
            port:
              number: 80
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ollama-bp-client-service
            port:
              number: 80
```

## Health Checks

### Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

## Мониторинг

### Prometheus Metrics

```yaml
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: ollama-bp-api
  namespace: ollama-bp
spec:
  selector:
    matchLabels:
      app: ollama-bp-api
  endpoints:
  - port: 8000
    path: /metrics
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Ollama BP Automation",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{endpoint}}"
          }
        ]
      }
    ]
  }
}
```

## Логирование

### Fluentd Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: ollama-bp
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/ollama-bp-api*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      format json
    </source>
    
    <match kubernetes.**>
      @type elasticsearch
      host elasticsearch.logging.svc.cluster.local
      port 9200
      index_name ollama-bp-logs
    </match>
```

## Безопасность

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ollama-bp-network-policy
  namespace: ollama-bp
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
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: ollama-bp
    ports:
    - protocol: TCP
      port: 5432
```

### Pod Security Policy

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: ollama-bp-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
  - ALL
  volumes:
  - 'configMap'
  - 'emptyDir'
  - 'projected'
  - 'secret'
  - 'downwardAPI'
  - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

## Масштабирование

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ollama-bp-api-hpa
  namespace: ollama-bp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ollama-bp-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Backup

### PostgreSQL Backup

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: ollama-bp
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: postgres-backup
            image: postgres:15-alpine
            command:
            - /bin/sh
            - -c
            - |
              pg_dump -h postgres-service -U user appdb > /backup/backup-$(date +%Y%m%d).sql
            env:
            - name: PGPASSWORD
              value: pass
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
```

## Troubleshooting

### Проверка статуса

```bash
# Проверка подов
kubectl get pods -n ollama-bp

# Проверка сервисов
kubectl get services -n ollama-bp

# Проверка логов
kubectl logs -f deployment/ollama-bp-api -n ollama-bp

# Проверка событий
kubectl get events -n ollama-bp --sort-by='.lastTimestamp'
```

### Отладка

```bash
# Подключение к поду
kubectl exec -it deployment/ollama-bp-api -n ollama-bp -- /bin/bash

# Проверка переменных окружения
kubectl exec deployment/ollama-bp-api -n ollama-bp -- env

# Проверка сетевого подключения
kubectl exec deployment/ollama-bp-api -n ollama-bp -- curl http://postgres-service:5432
```
