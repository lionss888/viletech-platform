-- +goose Up
-- SQL in this section is executed when the migration is applied.

-- Таблица правил фрод-контроля
CREATE TABLE IF NOT EXISTS fraud_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL, -- velocity, amount, location, time, device, behavior, merchant, country, ip, pattern
    conditions JSONB NOT NULL, -- JSON с условиями правила
    action VARCHAR(20) NOT NULL, -- block, review, alert, monitor, allow
    risk_level VARCHAR(20) NOT NULL, -- low, medium, high, critical
    priority INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fraud_rules_type ON fraud_rules (rule_type);
CREATE INDEX IF NOT EXISTS idx_fraud_rules_active ON fraud_rules (is_active);
CREATE INDEX IF NOT EXISTS idx_fraud_rules_priority ON fraud_rules (priority);

-- Таблица проверок фрод-контроля
CREATE TABLE IF NOT EXISTS fraud_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    transaction_id UUID,
    rule_id UUID NOT NULL,
    risk_score INT NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    status VARCHAR(20) NOT NULL, -- pending, approved, rejected, review, blocked
    details JSONB, -- JSON с деталями проверки
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_fraud_checks_user
        FOREIGN KEY(user_id)
            REFERENCES users(id)
            ON DELETE CASCADE,
    CONSTRAINT fk_fraud_checks_rule
        FOREIGN KEY(rule_id)
            REFERENCES fraud_rules(id)
            ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fraud_checks_user_id ON fraud_checks (user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_checks_transaction_id ON fraud_checks (transaction_id);
CREATE INDEX IF NOT EXISTS idx_fraud_checks_rule_id ON fraud_checks (rule_id);
CREATE INDEX IF NOT EXISTS idx_fraud_checks_status ON fraud_checks (status);
CREATE INDEX IF NOT EXISTS idx_fraud_checks_risk_score ON fraud_checks (risk_score);

-- Таблица событий фрод-контроля
CREATE TABLE IF NOT EXISTS fraud_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- transaction, login, card_usage, transfer, etc.
    event_data JSONB, -- JSON с данными события
    risk_score INT NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    status VARCHAR(20) NOT NULL, -- pending, approved, rejected, review, blocked
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_fraud_events_user
        FOREIGN KEY(user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fraud_events_user_id ON fraud_events (user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_events_type ON fraud_events (event_type);
CREATE INDEX IF NOT EXISTS idx_fraud_events_status ON fraud_events (status);
CREATE INDEX IF NOT EXISTS idx_fraud_events_risk_score ON fraud_events (risk_score);
CREATE INDEX IF NOT EXISTS idx_fraud_events_created_at ON fraud_events (created_at);

-- Таблица алертов фрод-контроля
CREATE TABLE IF NOT EXISTS fraud_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    title VARCHAR(255) NOT NULL,
    description TEXT,
    data JSONB, -- JSON с данными алерта
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_fraud_alerts_user
        FOREIGN KEY(user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user_id ON fraud_alerts (user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_type ON fraud_alerts (alert_type);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_severity ON fraud_alerts (severity);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_resolved ON fraud_alerts (is_resolved);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_created_at ON fraud_alerts (created_at);

-- Представление для статистики фрод-контроля
CREATE OR REPLACE VIEW fraud_stats_view AS
SELECT 
    user_id,
    COUNT(*) as total_checks,
    COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked_checks,
    COUNT(CASE WHEN status = 'review' THEN 1 END) as review_checks,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_checks,
    AVG(risk_score) as average_risk_score,
    COUNT(CASE WHEN risk_score >= 70 THEN 1 END) as high_risk_events,
    COUNT(CASE WHEN is_resolved = false THEN 1 END) as active_alerts,
    MAX(created_at) as last_updated
FROM fraud_checks fc
LEFT JOIN fraud_alerts fa ON fc.user_id = fa.user_id
GROUP BY user_id;

-- Функция для проверки правил фрод-контроля
CREATE OR REPLACE FUNCTION check_fraud_rules(
    p_user_id UUID,
    p_event_type VARCHAR(50),
    p_amount NUMERIC DEFAULT NULL,
    p_currency VARCHAR(10) DEFAULT NULL,
    p_country VARCHAR(100) DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_device_id VARCHAR(255) DEFAULT NULL,
    p_merchant_id VARCHAR(255) DEFAULT NULL,
    p_mcc VARCHAR(10) DEFAULT NULL,
    p_latitude DOUBLE PRECISION DEFAULT NULL,
    p_longitude DOUBLE PRECISION DEFAULT NULL
) RETURNS TABLE(
    rule_id UUID,
    rule_name VARCHAR(255),
    rule_type VARCHAR(50),
    risk_level VARCHAR(20),
    score INT,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fr.id,
        fr.name,
        fr.rule_type,
        fr.risk_level,
        CASE 
            WHEN fr.rule_type = 'velocity' THEN 30
            WHEN fr.rule_type = 'amount' AND p_amount > 10000 THEN 50
            WHEN fr.rule_type = 'location' AND p_country NOT IN ('US', 'CA', 'GB', 'DE', 'FR') THEN 40
            WHEN fr.rule_type = 'time' AND EXTRACT(HOUR FROM NOW()) NOT BETWEEN 6 AND 22 THEN 35
            WHEN fr.rule_type = 'device' AND p_device_id IS NULL THEN 45
            WHEN fr.rule_type = 'merchant' AND p_mcc IN ('7995', '7996', '7997') THEN 60
            WHEN fr.rule_type = 'country' AND p_country IN ('AF', 'IR', 'KP', 'SY') THEN 80
            WHEN fr.rule_type = 'ip' AND p_ip_address IS NULL THEN 25
            ELSE 10
        END as score,
        fr.description
    FROM fraud_rules fr
    WHERE fr.is_active = true
    AND (
        fr.rule_type = 'velocity' OR
        (fr.rule_type = 'amount' AND p_amount IS NOT NULL) OR
        (fr.rule_type = 'location' AND p_country IS NOT NULL) OR
        (fr.rule_type = 'time') OR
        (fr.rule_type = 'device' AND p_device_id IS NOT NULL) OR
        (fr.rule_type = 'merchant' AND p_merchant_id IS NOT NULL) OR
        (fr.rule_type = 'country' AND p_country IS NOT NULL) OR
        (fr.rule_type = 'ip' AND p_ip_address IS NOT NULL)
    )
    ORDER BY fr.priority DESC, fr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения статистики фрод-контроля пользователя
CREATE OR REPLACE FUNCTION get_user_fraud_stats(p_user_id UUID)
RETURNS TABLE(
    total_checks BIGINT,
    blocked_checks BIGINT,
    review_checks BIGINT,
    approved_checks BIGINT,
    average_risk_score NUMERIC,
    high_risk_events BIGINT,
    active_alerts BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(fc.id) as total_checks,
        COUNT(CASE WHEN fc.status = 'blocked' THEN 1 END) as blocked_checks,
        COUNT(CASE WHEN fc.status = 'review' THEN 1 END) as review_checks,
        COUNT(CASE WHEN fc.status = 'approved' THEN 1 END) as approved_checks,
        AVG(fc.risk_score) as average_risk_score,
        COUNT(CASE WHEN fc.risk_score >= 70 THEN 1 END) as high_risk_events,
        COUNT(CASE WHEN fa.is_resolved = false THEN 1 END) as active_alerts
    FROM fraud_checks fc
    LEFT JOIN fraud_alerts fa ON fc.user_id = fa.user_id
    WHERE fc.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения активных алертов
CREATE OR REPLACE FUNCTION get_active_fraud_alerts(p_limit INT DEFAULT 100, p_offset INT DEFAULT 0)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    alert_type VARCHAR(50),
    severity VARCHAR(20),
    title VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fa.id,
        fa.user_id,
        fa.alert_type,
        fa.severity,
        fa.title,
        fa.description,
        fa.created_at
    FROM fraud_alerts fa
    WHERE fa.is_resolved = false
    ORDER BY fa.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_fraud_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fraud_rules_updated_at
    BEFORE UPDATE ON fraud_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_fraud_updated_at();

CREATE TRIGGER trigger_fraud_checks_updated_at
    BEFORE UPDATE ON fraud_checks
    FOR EACH ROW
    EXECUTE FUNCTION update_fraud_updated_at();

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP TRIGGER IF EXISTS trigger_fraud_checks_updated_at ON fraud_checks;
DROP TRIGGER IF EXISTS trigger_fraud_rules_updated_at ON fraud_rules;
DROP FUNCTION IF EXISTS get_active_fraud_alerts(INT, INT);
DROP FUNCTION IF EXISTS get_user_fraud_stats(UUID);
DROP FUNCTION IF EXISTS check_fraud_rules(UUID, VARCHAR, NUMERIC, VARCHAR, VARCHAR, INET, VARCHAR, VARCHAR, VARCHAR, DOUBLE PRECISION, DOUBLE PRECISION);
DROP VIEW IF EXISTS fraud_stats_view;
DROP TABLE IF EXISTS fraud_alerts;
DROP TABLE IF EXISTS fraud_events;
DROP TABLE IF EXISTS fraud_checks;
DROP TABLE IF EXISTS fraud_rules;
