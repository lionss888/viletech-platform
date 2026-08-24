-- +goose Up
-- SQL in this section is executed when the migration is applied.

-- Таблица конфигураций комиссий
CREATE TABLE IF NOT EXISTS fee_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    fee_type VARCHAR(50) NOT NULL, -- fixed, percentage, tiered, volume, time_based, country_based
    category VARCHAR(50) NOT NULL, -- card, transfer, crypto, fx, atm, online, pos, withdrawal, deposit, maintenance
    amount NUMERIC(18,4) NOT NULL,
    percentage NUMERIC(5,4), -- До 4 знаков после запятой
    min_amount NUMERIC(18,4),
    max_amount NUMERIC(18,4),
    currency VARCHAR(10) NOT NULL,
    country VARCHAR(100),
    mcc VARCHAR(10), -- Merchant Category Code
    user_tier VARCHAR(50), -- VIP, Premium, Standard
    is_active BOOLEAN DEFAULT TRUE,
    priority INT DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fee_configs_category ON fee_configs (category);
CREATE INDEX IF NOT EXISTS idx_fee_configs_currency ON fee_configs (currency);
CREATE INDEX IF NOT EXISTS idx_fee_configs_active ON fee_configs (is_active);
CREATE INDEX IF NOT EXISTS idx_fee_configs_priority ON fee_configs (priority);
CREATE INDEX IF NOT EXISTS idx_fee_configs_valid_period ON fee_configs (valid_from, valid_to);

-- Таблица уровней комиссий
CREATE TABLE IF NOT EXISTS fee_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_config_id UUID NOT NULL,
    min_amount NUMERIC(18,4) NOT NULL,
    max_amount NUMERIC(18,4),
    amount NUMERIC(18,4) NOT NULL,
    percentage NUMERIC(5,4),
    priority INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_fee_tiers_config
        FOREIGN KEY(fee_config_id)
            REFERENCES fee_configs(id)
            ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fee_tiers_config_id ON fee_tiers (fee_config_id);
CREATE INDEX IF NOT EXISTS idx_fee_tiers_priority ON fee_tiers (priority);
CREATE INDEX IF NOT EXISTS idx_fee_tiers_amount_range ON fee_tiers (min_amount, max_amount);

-- Таблица расчетов комиссий
CREATE TABLE IF NOT EXISTS fee_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    transaction_id UUID,
    fee_config_id UUID NOT NULL,
    amount NUMERIC(18,4) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    fee_amount NUMERIC(18,4) NOT NULL,
    fee_percentage NUMERIC(5,4),
    applied_tier UUID,
    calculation JSONB, -- JSON с деталями расчета
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_fee_calculations_user
        FOREIGN KEY(user_id)
            REFERENCES users(id)
            ON DELETE CASCADE,
    CONSTRAINT fk_fee_calculations_config
        FOREIGN KEY(fee_config_id)
            REFERENCES fee_configs(id)
            ON DELETE CASCADE,
    CONSTRAINT fk_fee_calculations_tier
        FOREIGN KEY(applied_tier)
            REFERENCES fee_tiers(id)
            ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_fee_calculations_user_id ON fee_calculations (user_id);
CREATE INDEX IF NOT EXISTS idx_fee_calculations_transaction_id ON fee_calculations (transaction_id);
CREATE INDEX IF NOT EXISTS idx_fee_calculations_config_id ON fee_calculations (fee_config_id);
CREATE INDEX IF NOT EXISTS idx_fee_calculations_created_at ON fee_calculations (created_at);

-- Таблица конфигураций спредов
CREATE TABLE IF NOT EXISTS spread_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    from_currency VARCHAR(10) NOT NULL,
    to_currency VARCHAR(10) NOT NULL,
    spread NUMERIC(5,4) NOT NULL, -- Спред в процентах
    min_spread NUMERIC(5,4),
    max_spread NUMERIC(5,4),
    country VARCHAR(100),
    user_tier VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    priority INT DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spread_configs_currencies ON spread_configs (from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_spread_configs_active ON spread_configs (is_active);
CREATE INDEX IF NOT EXISTS idx_spread_configs_priority ON spread_configs (priority);
CREATE INDEX IF NOT EXISTS idx_spread_configs_valid_period ON spread_configs (valid_from, valid_to);

-- Таблица расчетов спредов
CREATE TABLE IF NOT EXISTS spread_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    transaction_id UUID,
    spread_config_id UUID NOT NULL,
    from_currency VARCHAR(10) NOT NULL,
    to_currency VARCHAR(10) NOT NULL,
    amount NUMERIC(18,4) NOT NULL,
    exchange_rate NUMERIC(18,8) NOT NULL,
    spread NUMERIC(5,4) NOT NULL,
    spread_amount NUMERIC(18,4) NOT NULL,
    final_amount NUMERIC(18,4) NOT NULL,
    calculation JSONB, -- JSON с деталями расчета
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_spread_calculations_user
        FOREIGN KEY(user_id)
            REFERENCES users(id)
            ON DELETE CASCADE,
    CONSTRAINT fk_spread_calculations_config
        FOREIGN KEY(spread_config_id)
            REFERENCES spread_configs(id)
            ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_spread_calculations_user_id ON spread_calculations (user_id);
CREATE INDEX IF NOT EXISTS idx_spread_calculations_transaction_id ON spread_calculations (transaction_id);
CREATE INDEX IF NOT EXISTS idx_spread_calculations_config_id ON spread_calculations (spread_config_id);
CREATE INDEX IF NOT EXISTS idx_spread_calculations_created_at ON spread_calculations (created_at);

-- Представление для статистики комиссий
CREATE OR REPLACE VIEW fee_stats_view AS
SELECT 
    user_id,
    COUNT(*) as total_calculations,
    SUM(fee_amount) as total_fees,
    AVG(fee_amount) as average_fee,
    COUNT(DISTINCT currency) as currencies_count,
    COUNT(DISTINCT fee_config_id) as configs_used,
    MAX(created_at) as last_calculation
FROM fee_calculations
GROUP BY user_id;

-- Функция для расчета комиссии
CREATE OR REPLACE FUNCTION calculate_fee(
    p_user_id UUID,
    p_category VARCHAR(50),
    p_amount NUMERIC(18,4),
    p_currency VARCHAR(10),
    p_country VARCHAR(100) DEFAULT NULL,
    p_mcc VARCHAR(10) DEFAULT NULL,
    p_user_tier VARCHAR(50) DEFAULT NULL
) RETURNS TABLE(
    config_id UUID,
    fee_amount NUMERIC(18,4),
    fee_percentage NUMERIC(5,4),
    total_amount NUMERIC(18,4)
) AS $$
DECLARE
    config_record RECORD;
    calculated_fee NUMERIC(18,4);
    fee_percentage NUMERIC(5,4);
BEGIN
    -- Ищем подходящую конфигурацию
    SELECT fc.* INTO config_record
    FROM fee_configs fc
    WHERE fc.category = p_category
    AND fc.currency = p_currency
    AND fc.is_active = true
    AND (fc.country IS NULL OR fc.country = p_country)
    AND (fc.mcc IS NULL OR fc.mcc = p_mcc)
    AND (fc.user_tier IS NULL OR fc.user_tier = p_user_tier)
    AND fc.valid_from <= NOW()
    AND (fc.valid_to IS NULL OR fc.valid_to >= NOW())
    ORDER BY fc.priority DESC, fc.created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        -- Возвращаем нулевую комиссию, если конфигурация не найдена
        config_id := NULL;
        fee_amount := 0;
        fee_percentage := 0;
        total_amount := p_amount;
        RETURN NEXT;
        RETURN;
    END IF;

    -- Рассчитываем комиссию в зависимости от типа
    CASE config_record.fee_type
        WHEN 'fixed' THEN
            calculated_fee := config_record.amount;
        WHEN 'percentage' THEN
            calculated_fee := p_amount * config_record.percentage / 100;
            -- Применяем минимальную и максимальную суммы
            IF config_record.min_amount > 0 AND calculated_fee < config_record.min_amount THEN
                calculated_fee := config_record.min_amount;
            END IF;
            IF config_record.max_amount > 0 AND calculated_fee > config_record.max_amount THEN
                calculated_fee := config_record.max_amount;
            END IF;
        ELSE
            calculated_fee := 0;
    END CASE;

    -- Рассчитываем процент
    IF p_amount > 0 THEN
        fee_percentage := (calculated_fee / p_amount) * 100;
    ELSE
        fee_percentage := 0;
    END IF;

    config_id := config_record.id;
    fee_amount := calculated_fee;
    total_amount := p_amount + calculated_fee;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Функция для расчета спреда
CREATE OR REPLACE FUNCTION calculate_spread(
    p_user_id UUID,
    p_from_currency VARCHAR(10),
    p_to_currency VARCHAR(10),
    p_amount NUMERIC(18,4),
    p_country VARCHAR(100) DEFAULT NULL,
    p_user_tier VARCHAR(50) DEFAULT NULL
) RETURNS TABLE(
    config_id UUID,
    exchange_rate NUMERIC(18,8),
    spread NUMERIC(5,4),
    spread_amount NUMERIC(18,4),
    final_amount NUMERIC(18,4)
) AS $$
DECLARE
    config_record RECORD;
    base_rate NUMERIC(18,8);
    calculated_spread NUMERIC(5,4);
    spread_amount NUMERIC(18,4);
    final_amount NUMERIC(18,4);
BEGIN
    -- Ищем подходящую конфигурацию спреда
    SELECT sc.* INTO config_record
    FROM spread_configs sc
    WHERE sc.from_currency = p_from_currency
    AND sc.to_currency = p_to_currency
    AND sc.is_active = true
    AND (sc.country IS NULL OR sc.country = p_country)
    AND (sc.user_tier IS NULL OR sc.user_tier = p_user_tier)
    AND sc.valid_from <= NOW()
    AND (sc.valid_to IS NULL OR sc.valid_to >= NOW())
    ORDER BY sc.priority DESC, sc.created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        -- Возвращаем нулевой спред, если конфигурация не найдена
        config_id := NULL;
        exchange_rate := 0;
        spread := 0;
        spread_amount := 0;
        final_amount := p_amount;
        RETURN NEXT;
        RETURN;
    END IF;

    -- Получаем базовый курс (здесь должна быть интеграция с внешним API)
    -- Пока используем фиксированные курсы
    IF p_from_currency = 'USD' AND p_to_currency = 'EUR' THEN
        base_rate := 0.85;
    ELSIF p_from_currency = 'EUR' AND p_to_currency = 'USD' THEN
        base_rate := 1.18;
    ELSE
        base_rate := 1.0;
    END IF;

    -- Рассчитываем спред
    calculated_spread := config_record.spread;
    spread_amount := p_amount * calculated_spread / 100;
    final_amount := p_amount - spread_amount;
    
    -- Применяем курс обмена
    exchange_rate := base_rate * (1 - calculated_spread / 100);

    config_id := config_record.id;
    spread := calculated_spread;
    final_amount := final_amount * exchange_rate;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения статистики комиссий пользователя
CREATE OR REPLACE FUNCTION get_user_fee_stats(p_user_id UUID)
RETURNS TABLE(
    total_fees NUMERIC(18,4),
    total_transactions BIGINT,
    average_fee NUMERIC(18,4),
    currencies_count BIGINT,
    configs_used BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(fc.fee_amount), 0) as total_fees,
        COUNT(fc.id) as total_transactions,
        CASE 
            WHEN COUNT(fc.id) > 0 THEN SUM(fc.fee_amount) / COUNT(fc.id)
            ELSE 0
        END as average_fee,
        COUNT(DISTINCT fc.currency) as currencies_count,
        COUNT(DISTINCT fc.fee_config_id) as configs_used
    FROM fee_calculations fc
    WHERE fc.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_fees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fee_configs_updated_at
    BEFORE UPDATE ON fee_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_fees_updated_at();

CREATE TRIGGER trigger_spread_configs_updated_at
    BEFORE UPDATE ON spread_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_fees_updated_at();

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TRIGGER IF EXISTS trigger_spread_configs_updated_at ON spread_configs;
DROP TRIGGER IF EXISTS trigger_fee_configs_updated_at ON fee_configs;
DROP FUNCTION IF EXISTS get_user_fee_stats(UUID);
DROP FUNCTION IF EXISTS calculate_spread(UUID, VARCHAR, VARCHAR, NUMERIC, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS calculate_fee(UUID, VARCHAR, NUMERIC, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP VIEW IF EXISTS fee_stats_view;
DROP TABLE IF EXISTS spread_calculations;
DROP TABLE IF EXISTS spread_configs;
DROP TABLE IF EXISTS fee_calculations;
DROP TABLE IF EXISTS fee_tiers;
DROP TABLE IF EXISTS fee_configs;
