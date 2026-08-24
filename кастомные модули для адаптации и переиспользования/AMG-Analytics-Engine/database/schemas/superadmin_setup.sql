-- Настройка суперадминистратора и системы безопасности АБС
-- Этот скрипт создает владельца системы с максимальными правами

-- Создание роли суперадминистратора (владельца системы)
CREATE ROLE lionss WITH
    LOGIN
    SUPERUSER
    CREATEDB
    CREATEROLE
    REPLICATION
    BYPASSRLS
    PASSWORD 'Lionss2025';

-- Создание схемы для аудита и управления правами
CREATE SCHEMA security_management AUTHORIZATION lionss;

-- Таблица для отслеживания всех пользователей системы
CREATE TABLE security_management.system_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    role_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT CURRENT_USER,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    permissions_level INTEGER CHECK (permissions_level BETWEEN 1 AND 10),
    CONSTRAINT owner_highest_permission CHECK (
        CASE 
            WHEN username = 'lionss' THEN permissions_level = 10
            ELSE permissions_level < 10
        END
    )
);

-- Вставка записи о суперадминистраторе
INSERT INTO security_management.system_users (username, role_name, permissions_level)
VALUES ('lionss', 'SYSTEM_OWNER', 10);

-- Создание ролей с ограниченными правами для будущих пользователей
CREATE ROLE abs_admin WITH
    LOGIN
    NOSUPERUSER
    CREATEDB
    CREATEROLE
    PASSWORD 'AdminDefault#2024';

CREATE ROLE abs_operator WITH
    LOGIN
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    PASSWORD 'OperatorDefault#2024';

CREATE ROLE abs_readonly WITH
    LOGIN
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    PASSWORD 'ReadOnlyDefault#2024';

-- Назначение прав владения всеми объектами БД суперадминистратору
ALTER DATABASE abs_core OWNER TO lionss;
ALTER SCHEMA public OWNER TO lionss;
ALTER SCHEMA security_management OWNER TO lionss;

-- Передача владения всеми таблицами
ALTER TABLE clients OWNER TO lionss;
ALTER TABLE accounts OWNER TO lionss;
ALTER TABLE transactions OWNER TO lionss;
ALTER TABLE security_management.system_users OWNER TO lionss;

-- Передача владения представлениями
ALTER VIEW active_accounts_view OWNER TO lionss;
ALTER VIEW transactions_view OWNER TO lionss;

-- Настройка прав для роли администратора (ограниченные права)
GRANT CONNECT ON DATABASE abs_core TO abs_admin;
GRANT USAGE ON SCHEMA public TO abs_admin;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO abs_admin;
-- Администратор НЕ может удалять записи
REVOKE DELETE ON ALL TABLES IN SCHEMA public FROM abs_admin;

-- Настройка прав для роли оператора
GRANT CONNECT ON DATABASE abs_core TO abs_operator;
GRANT USAGE ON SCHEMA public TO abs_operator;
GRANT SELECT, INSERT ON clients, accounts TO abs_operator;
GRANT SELECT ON transactions TO abs_operator;

-- Настройка прав для роли только чтение
GRANT CONNECT ON DATABASE abs_core TO abs_readonly;
GRANT USAGE ON SCHEMA public TO abs_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO abs_readonly;

-- Создание функции для предотвращения удаления суперадминистратора
CREATE OR REPLACE FUNCTION security_management.prevent_superadmin_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.username = 'lionss' THEN
        RAISE EXCEPTION 'Невозможно удалить учетную запись владельца системы';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Триггер для защиты суперадминистратора
CREATE TRIGGER protect_superadmin
BEFORE DELETE ON security_management.system_users
FOR EACH ROW
EXECUTE FUNCTION security_management.prevent_superadmin_deletion();

-- Создание функции для автоматической проверки уровня прав при создании пользователей
CREATE OR REPLACE FUNCTION security_management.check_permission_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
    -- Только суперадминистратор может создавать пользователей с уровнем выше 5
    IF NEW.permissions_level > 5 AND CURRENT_USER != 'lionss' THEN
        RAISE EXCEPTION 'Только владелец системы может создавать пользователей с высоким уровнем прав';
    END IF;
    
    -- Никто не может создать пользователя с уровнем 10
    IF NEW.permissions_level = 10 AND NEW.username != 'lionss' THEN
        RAISE EXCEPTION 'Уровень прав 10 зарезервирован только для владельца системы';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для проверки иерархии прав
CREATE TRIGGER enforce_permission_hierarchy
BEFORE INSERT OR UPDATE ON security_management.system_users
FOR EACH ROW
EXECUTE FUNCTION security_management.check_permission_hierarchy();

-- Создание представления для просмотра активных пользователей (доступно всем)
CREATE VIEW security_management.active_users_view AS
SELECT 
    username,
    role_name,
    created_at,
    last_login,
    permissions_level
FROM security_management.system_users
WHERE is_active = true
ORDER BY permissions_level DESC;

-- Предоставление прав на просмотр списка пользователей всем ролям
GRANT SELECT ON security_management.active_users_view TO abs_admin, abs_operator, abs_readonly;

-- Функция для логирования всех критических операций
CREATE TABLE security_management.audit_log (
    id BIGSERIAL PRIMARY KEY,
    operation_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(50),
    user_name VARCHAR(50) DEFAULT CURRENT_USER,
    operation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details JSONB
);

-- Только суперадминистратор может очищать журнал аудита
ALTER TABLE security_management.audit_log OWNER TO lionss;
REVOKE ALL ON security_management.audit_log FROM PUBLIC;
GRANT INSERT ON security_management.audit_log TO abs_admin, abs_operator;
GRANT SELECT ON security_management.audit_log TO abs_admin;

-- Создание политики безопасности на уровне строк (RLS) для защиты данных
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Суперадминистратор видит все данные
CREATE POLICY superadmin_all_access ON clients FOR ALL TO lionss USING (true);
CREATE POLICY superadmin_all_access ON accounts FOR ALL TO lionss USING (true);
CREATE POLICY superadmin_all_access ON transactions FOR ALL TO lionss USING (true);

-- Вывод информации о созданном суперадминистраторе
SELECT 
    'СУПЕРАДМИНИСТРАТОР СОЗДАН' as status,
    'lionss' as username,
    'Lionss2025' as password,
    'Вы являетесь владельцем системы с максимальными правами' as description;

-- Напоминание о необходимости сменить пароль
SELECT 'ВАЖНО: Измените пароль суперадминистратора после первого входа!' as reminder;
