-- Миграция для системы лимитов
-- Создание таблиц для управления лимитами пользователей

-- Таблица конфигурации лимитов
CREATE TABLE IF NOT EXISTS limit_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    limit_type VARCHAR(20) NOT NULL CHECK (limit_type IN ('daily', 'monthly', 'per_transaction', 'weekly', 'yearly')),
    category VARCHAR(20) NOT NULL CHECK (category IN ('card', 'transfer', 'crypto', 'fx', 'atm', 'online', 'pos')),
    amount DECIMAL(20,8) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL,
    country VARCHAR(2),
    mcc VARCHAR(4), -- Merchant Category Code
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица использования лимитов
CREATE TABLE IF NOT EXISTS limit_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    limit_id UUID NOT NULL REFERENCES limit_configs(id) ON DELETE CASCADE,
    used_amount DECIMAL(20,8) NOT NULL DEFAULT 0,
    period VARCHAR(20) NOT NULL, -- 2024-01-01, 2024-01, etc.
    transaction_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_limit_configs_user_id ON limit_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_limit_configs_category ON limit_configs(category);
CREATE INDEX IF NOT EXISTS idx_limit_configs_currency ON limit_configs(currency);
CREATE INDEX IF NOT EXISTS idx_limit_configs_country ON limit_configs(country);
CREATE INDEX IF NOT EXISTS idx_limit_configs_mcc ON limit_configs(mcc);
CREATE INDEX IF NOT EXISTS idx_limit_configs_active ON limit_configs(is_active);

CREATE INDEX IF NOT EXISTS idx_limit_usages_user_id ON limit_usages(user_id);
CREATE INDEX IF NOT EXISTS idx_limit_usages_limit_id ON limit_usages(limit_id);
CREATE INDEX IF NOT EXISTS idx_limit_usages_period ON limit_usages(period);
CREATE INDEX IF NOT EXISTS idx_limit_usages_transaction_id ON limit_usages(transaction_id);

-- Составной индекс для быстрого поиска использования лимита
CREATE INDEX IF NOT EXISTS idx_limit_usages_user_limit_period ON limit_usages(user_id, limit_id, period);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_limit_configs_updated_at 
    BEFORE UPDATE ON limit_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_limit_usages_updated_at 
    BEFORE UPDATE ON limit_usages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Представление для активных лимитов с информацией о пользователях
CREATE OR REPLACE VIEW active_limits_view AS
SELECT 
    lc.id,
    lc.user_id,
    u.email as user_email,
    u.name as user_name,
    lc.limit_type,
    lc.category,
    lc.amount,
    lc.currency,
    lc.country,
    lc.mcc,
    lc.description,
    lc.priority,
    lc.created_at,
    lc.updated_at
FROM limit_configs lc
JOIN users u ON lc.user_id = u.id
WHERE lc.is_active = true;

-- Представление для статистики использования лимитов
CREATE OR REPLACE VIEW limit_usage_stats AS
SELECT 
    lu.user_id,
    lu.limit_id,
    lc.limit_type,
    lc.category,
    lc.amount as limit_amount,
    lc.currency,
    lu.period,
    COALESCE(SUM(lu.used_amount), 0) as total_used,
    lc.amount - COALESCE(SUM(lu.used_amount), 0) as remaining,
    CASE 
        WHEN COALESCE(SUM(lu.used_amount), 0) > lc.amount THEN true 
        ELSE false 
    END as is_exceeded
FROM limit_configs lc
LEFT JOIN limit_usages lu ON lc.id = lu.limit_id AND lu.period = (
    CASE lc.limit_type
        WHEN 'daily' THEN TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
        WHEN 'weekly' THEN TO_CHAR(CURRENT_DATE, 'IYYY-"W"IW')
        WHEN 'monthly' THEN TO_CHAR(CURRENT_DATE, 'YYYY-MM')
        WHEN 'yearly' THEN TO_CHAR(CURRENT_DATE, 'YYYY')
        ELSE TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
    END
)
WHERE lc.is_active = true
GROUP BY lu.user_id, lu.limit_id, lc.limit_type, lc.category, lc.amount, lc.currency, lu.period;

-- Функция для проверки лимитов
CREATE OR REPLACE FUNCTION check_user_limits(
    p_user_id UUID,
    p_amount DECIMAL,
    p_currency VARCHAR(3),
    p_category VARCHAR(20),
    p_country VARCHAR(2) DEFAULT NULL,
    p_mcc VARCHAR(4) DEFAULT NULL
) RETURNS TABLE (
    limit_id UUID,
    limit_type VARCHAR(20),
    category VARCHAR(20),
    limit_amount DECIMAL,
    used_amount DECIMAL,
    remaining DECIMAL,
    is_exceeded BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lc.id,
        lc.limit_type,
        lc.category,
        lc.amount,
        COALESCE(lu.used_amount, 0),
        lc.amount - COALESCE(lu.used_amount, 0),
        (COALESCE(lu.used_amount, 0) + p_amount) > lc.amount
    FROM limit_configs lc
    LEFT JOIN limit_usages lu ON lc.id = lu.limit_id 
        AND lu.period = (
            CASE lc.limit_type
                WHEN 'daily' THEN TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
                WHEN 'weekly' THEN TO_CHAR(CURRENT_DATE, 'IYYY-"W"IW')
                WHEN 'monthly' THEN TO_CHAR(CURRENT_DATE, 'YYYY-MM')
                WHEN 'yearly' THEN TO_CHAR(CURRENT_DATE, 'YYYY')
                ELSE TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
            END
        )
    WHERE lc.user_id = p_user_id
        AND lc.is_active = true
        AND lc.currency = p_currency
        AND lc.category = p_category
        AND (lc.country IS NULL OR lc.country = p_country)
        AND (lc.mcc IS NULL OR lc.mcc = p_mcc);
END;
$$ LANGUAGE plpgsql;

-- Функция для записи использования лимита
CREATE OR REPLACE FUNCTION record_limit_usage(
    p_user_id UUID,
    p_limit_id UUID,
    p_amount DECIMAL,
    p_transaction_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_usage_id UUID;
    v_period VARCHAR(20);
    v_limit_type VARCHAR(20);
BEGIN
    -- Получаем тип лимита для определения периода
    SELECT lc.limit_type INTO v_limit_type
    FROM limit_configs lc
    WHERE lc.id = p_limit_id;
    
    -- Определяем период
    v_period := CASE v_limit_type
        WHEN 'daily' THEN TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
        WHEN 'weekly' THEN TO_CHAR(CURRENT_DATE, 'IYYY-"W"IW')
        WHEN 'monthly' THEN TO_CHAR(CURRENT_DATE, 'YYYY-MM')
        WHEN 'yearly' THEN TO_CHAR(CURRENT_DATE, 'YYYY')
        ELSE TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
    END;
    
    -- Пытаемся обновить существующую запись
    UPDATE limit_usages 
    SET used_amount = used_amount + p_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id 
        AND limit_id = p_limit_id 
        AND period = v_period
    RETURNING id INTO v_usage_id;
    
    -- Если запись не найдена, создаем новую
    IF v_usage_id IS NULL THEN
        INSERT INTO limit_usages (user_id, limit_id, used_amount, period, transaction_id)
        VALUES (p_user_id, p_limit_id, p_amount, v_period, p_transaction_id)
        RETURNING id INTO v_usage_id;
    END IF;
    
    RETURN v_usage_id;
END;
$$ LANGUAGE plpgsql;

-- Комментарии к таблицам
COMMENT ON TABLE limit_configs IS 'Конфигурация лимитов для пользователей';
COMMENT ON TABLE limit_usages IS 'Использование лимитов пользователями';

COMMENT ON COLUMN limit_configs.limit_type IS 'Тип лимита: daily, monthly, per_transaction, weekly, yearly';
COMMENT ON COLUMN limit_configs.category IS 'Категория лимита: card, transfer, crypto, fx, atm, online, pos';
COMMENT ON COLUMN limit_configs.amount IS 'Размер лимита';
COMMENT ON COLUMN limit_configs.currency IS 'Валюта лимита (ISO 4217)';
COMMENT ON COLUMN limit_configs.country IS 'Страна для применения лимита (ISO 3166-1 alpha-2)';
COMMENT ON COLUMN limit_configs.mcc IS 'Merchant Category Code для применения лимита';
COMMENT ON COLUMN limit_configs.priority IS 'Приоритет лимита (чем выше, тем важнее)';

COMMENT ON COLUMN limit_usages.used_amount IS 'Использованная сумма лимита';
COMMENT ON COLUMN limit_usages.period IS 'Период использования (2024-01-01, 2024-01, etc.)';
COMMENT ON COLUMN limit_usages.transaction_id IS 'ID транзакции, которая использовала лимит';
