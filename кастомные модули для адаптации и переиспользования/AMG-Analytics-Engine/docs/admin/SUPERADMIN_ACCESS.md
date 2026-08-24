# Доступ суперадминистратора к АБС

## Учетные данные владельца системы

### Подключение через psql
```bash
psql -h localhost -p 5432 -U lionss -d abs_core
```
Пароль: `lionss2025`

### Подключение через pgAdmin
1. Откройте http://localhost:5050
2. Войдите в pgAdmin (email и пароль из .env файла)
3. Добавьте новое подключение:
   - **General → Name:** ABS Superadmin Connection
   - **Connection → Host:** postgres
   - **Connection → Port:** 5432
   - **Connection → Database:** abs_core
   - **Connection → Username:** lionss
   - **Connection → Password:** lionss2025

## Ваши эксклюзивные права

### 1. Полный контроль над данными
- CREATE, READ, UPDATE, DELETE на все таблицы
- Создание и удаление таблиц, схем, индексов
- Изменение структуры БД

### 2. Управление пользователями
```sql
-- Просмотр всех пользователей системы
SELECT * FROM security_management.system_users;

-- Создание нового администратора (уровень прав 6-9)
CREATE ROLE new_admin WITH LOGIN PASSWORD 'SecurePassword123!';
INSERT INTO security_management.system_users (username, role_name, permissions_level)
VALUES ('new_admin', 'ADMIN', 6);

-- Деактивация пользователя
UPDATE security_management.system_users 
SET is_active = false 
WHERE username = 'username_to_disable';
```

### 3. Просмотр журнала аудита
```sql
-- Просмотр всех операций
SELECT * FROM security_management.audit_log ORDER BY operation_time DESC;

-- Очистка журнала (только вы можете это делать)
TRUNCATE security_management.audit_log;
```

### 4. Управление правами доступа
```sql
-- Предоставление прав
GRANT SELECT, INSERT ON table_name TO role_name;

-- Отзыв прав
REVOKE DELETE ON table_name FROM role_name;

-- Изменение владельца объекта
ALTER TABLE table_name OWNER TO lionss;
```

## Важные команды

### Смена пароля суперадминистратора
```sql
ALTER ROLE lionss WITH PASSWORD 'YourNewSecurePassword!';
```

### Резервное копирование БД
```bash
pg_dump -h localhost -p 5432 -U lionss -d abs_core > backup.sql
```

### Восстановление БД
```bash
psql -h localhost -p 5432 -U lionss -d abs_core < backup.sql
```

## Безопасность

1. **Немедленно смените пароль** после первого входа
2. **Не делитесь** учетными данными суперадминистратора
3. **Используйте** эту учетную запись только для критических операций
4. **Создайте** отдельные учетные записи для повседневной работы

## Защитные механизмы

- Ваша учетная запись защищена от удаления на уровне БД
- Только вы можете создавать пользователей с высоким уровнем прав (> 5)
- Только вы имеете право удалять данные из основных таблиц
- Все критические операции автоматически логируются

## Поддержка

При возникновении проблем проверьте:
1. Статус контейнера: `docker-compose ps`
2. Логи PostgreSQL: `docker-compose logs postgres`
3. Подключение к БД: `docker exec -it abs_postgres psql -U lionss -d abs_core`

---
**Этот файл содержит конфиденциальную информацию. Храните его в безопасном месте!**
