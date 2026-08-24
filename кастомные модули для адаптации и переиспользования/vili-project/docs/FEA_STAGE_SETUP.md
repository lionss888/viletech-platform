# Настройка интеграции с fea-stage

## Проблема: "Не удалось подключиться к fea-stage"

Если вы видите ошибку подключения к fea-stage, это означает, что сервер fea-stage не запущен или недоступен по указанному адресу.

## Текущая конфигурация

По умолчанию VILI настроен на подключение к fea-stage по адресу:
- **URL:** `http://host.docker.internal:30000/api/1.0`
- **Порт:** 30000

## Решение

### Вариант 1: Запуск сервера fea-stage локально

Если у вас есть сервер fea-stage, запустите его на порту 30000:

```bash
# Пример (зависит от вашей установки fea-stage)
# Запустите сервер fea-stage на localhost:30000
```

### Вариант 2: Изменение адреса в конфигурации

Если ваш сервер fea-stage работает на другом адресе, обновите конфигурацию:

#### В docker-compose.yml:

```yaml
services:
  backend:
    environment:
      - FEA_STAGE_API_URL=http://your-fea-stage-host:port/api/1.0
      - FEA_STAGE_API_KEY=your-api-key  # или
      - FEA_STAGE_EMAIL=your-email
      - FEA_STAGE_PASSWORD=your-password
```

#### Или через переменные окружения:

```bash
export FEA_STAGE_API_URL=http://localhost:30000/api/1.0
export FEA_STAGE_API_KEY=your-api-key
# или
export FEA_STAGE_EMAIL=admin@vili.local
export FEA_STAGE_PASSWORD=your-password
```

### Вариант 3: Проверка доступности

Проверьте доступность сервера:

```bash
# С хоста
curl http://localhost:30000/api/1.0/health

# Из Docker контейнера
docker-compose exec backend curl http://host.docker.internal:30000/api/1.0/health
```

## Диагностика

Для диагностики проблем используйте скрипт проверки:

```bash
# Из контейнера backend
docker-compose exec backend python -c "
import asyncio
import httpx
from app.core.config import settings

async def check():
    if not settings.FEA_STAGE_API_URL:
        print('❌ FEA_STAGE_API_URL не установлен')
        return
    
    base_url = settings.FEA_STAGE_API_URL.rstrip('/')
    print(f'Проверка: {base_url}')
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f'{base_url}/health', timeout=5.0)
            print(f'✅ Сервер доступен: {response.status_code}')
    except Exception as e:
        print(f'❌ Ошибка: {e}')

asyncio.run(check())
"
```

## Требования к пользователю в fea-stage

### Где создается пользователь?

Пользователь должен быть создан **в базе данных fea-stage**, а не в базе данных VILI. VILI использует API fea-stage для аутентификации, поэтому пользователь должен существовать в системе fea-stage.

### Какая роль должна быть у пользователя?

На основе используемых эндпоинтов VILI, пользователь должен иметь права на:

**Операции чтения:**
- Просмотр заявок на платежи (`GET /form-payment`)
- Просмотр контрагентов (`GET /counterparty/list`, `GET /counterparty/{id}`)
- Просмотр контрактов (`GET /contract`, `GET /contract/{id}`)
- Просмотр курсов валют (`GET /currency`, `GET /currency/dashboard-rate`)
- Просмотр статистики операторов (`GET /api/operators/{id}/statistics`)

**Операции создания:**
- Создание заявок на платежи (`POST /form-payment`)

**Рекомендуемые роли:**
- **Оператор (Operator)** - минимально необходимая роль для работы с заявками
- **Менеджер (Manager)** - расширенные права на просмотр всех данных
- **Администратор (Admin)** - полные права (рекомендуется для интеграции)

### Как создать пользователя?

#### Вариант 1: Через веб-интерфейс fea-stage

1. Войдите в веб-интерфейс fea-stage как администратор
2. Перейдите в раздел управления пользователями
3. Создайте нового пользователя с:
   - **Email:** `admin@vili.local` (или другой email)
   - **Пароль:** `ViliAdmin2024!` (или другой безопасный пароль)
   - **Роль:** `admin` или `operator` (в зависимости от вашей конфигурации)

#### Вариант 2: Через API fea-stage (если доступен)

```bash
curl -X POST http://localhost:30000/api/1.0/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "email": "admin@vili.local",
    "password": "ViliAdmin2024!",
    "role": "admin"
  }'
```

#### Вариант 3: Напрямую в базе данных fea-stage

Если у вас есть доступ к базе данных fea-stage, вы можете создать пользователя напрямую. Структура зависит от используемой БД (MongoDB, PostgreSQL и т.д.).

**Пример для MongoDB:**
```javascript
db.users.insertOne({
  email: "admin@vili.local",
  password: "<hashed_password>", // Используйте bcrypt или аналогичный алгоритм
  role: "admin",
  createdAt: new Date(),
  active: true
})
```

**Пример для PostgreSQL:**
```sql
INSERT INTO users (email, password_hash, role, created_at, active)
VALUES (
  'admin@vili.local',
  '<hashed_password>', -- Используйте bcrypt или аналогичный алгоритм
  'admin',
  NOW(),
  true
);
```

### Альтернатива: Использование API ключа

Если fea-stage поддерживает API ключи, вы можете использовать их вместо email/password:

1. Создайте API ключ в системе fea-stage (обычно через веб-интерфейс или API)
2. Установите переменную окружения:
   ```bash
   export FEA_STAGE_API_KEY=your-api-key-here
   ```
3. Убедитесь, что `FEA_STAGE_EMAIL` и `FEA_STAGE_PASSWORD` не установлены (или пустые)

### Проверка создания пользователя

После создания пользователя проверьте аутентификацию:

```bash
docker-compose exec backend python -c "
import asyncio
from app.integrations.fea_stage_client import FeaStageClient

async def test():
    client = FeaStageClient()
    try:
        token = await client._authenticate()
        print(f'✅ Аутентификация успешна!')
        print(f'Токен получен (длина: {len(token)})')
    except Exception as e:
        print(f'❌ Ошибка: {e}')

asyncio.run(test())
"
```

## Примечания

- `host.docker.internal` используется для доступа к localhost из Docker контейнера
- Если fea-stage запущен в другом Docker контейнере, используйте имя сервиса вместо `host.docker.internal`
- Убедитесь, что порт 30000 не занят другим приложением
- Пользователь должен быть активен (не заблокирован) в системе fea-stage
- Если используется хеширование паролей, убедитесь, что пароль хешируется тем же алгоритмом, что использует fea-stage