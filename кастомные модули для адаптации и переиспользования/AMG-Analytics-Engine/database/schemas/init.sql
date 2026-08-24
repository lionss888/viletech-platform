-- Автоматизированная банковская система (АБС) - Инициализация схемы БД
-- Создание таблиц для ядра АБС

-- Таблица клиентов
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    tax_id VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица счетов
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    balance NUMERIC(15,2) DEFAULT 0 CHECK (balance >= 0),
    opened_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Таблица транзакций
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    debit_account_id INTEGER REFERENCES accounts(id) ON DELETE RESTRICT,
    credit_account_id INTEGER REFERENCES accounts(id) ON DELETE RESTRICT,
    amount NUMERIC(15,2) CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP,
    CHECK (debit_account_id != credit_account_id)
);

-- Создание индексов для оптимизации производительности
CREATE INDEX idx_clients_tax_id ON clients(tax_id);
CREATE INDEX idx_accounts_client_id ON accounts(client_id);
CREATE INDEX idx_accounts_account_number ON accounts(account_number);
CREATE INDEX idx_accounts_is_active ON accounts(is_active);
CREATE INDEX idx_transactions_debit_account ON transactions(debit_account_id);
CREATE INDEX idx_transactions_credit_account ON transactions(credit_account_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- Создание представления для просмотра активных счетов с информацией о клиентах
CREATE VIEW active_accounts_view AS
SELECT 
    a.id,
    a.account_number,
    a.type,
    a.currency,
    a.balance,
    a.opened_date,
    c.first_name,
    c.last_name,
    c.tax_id
FROM accounts a
JOIN clients c ON a.client_id = c.id
WHERE a.is_active = true;

-- Создание представления для просмотра транзакций с детальной информацией
CREATE VIEW transactions_view AS
SELECT 
    t.id,
    t.amount,
    t.currency,
    t.description,
    t.status,
    t.created_at,
    t.executed_at,
    debit.account_number as debit_account,
    credit.account_number as credit_account,
    debit_client.first_name as debit_client_first_name,
    debit_client.last_name as debit_client_last_name,
    credit_client.first_name as credit_client_first_name,
    credit_client.last_name as credit_client_last_name
FROM transactions t
JOIN accounts debit ON t.debit_account_id = debit.id
JOIN accounts credit ON t.credit_account_id = credit.id
JOIN clients debit_client ON debit.client_id = debit_client.id
JOIN clients credit_client ON credit.client_id = credit_client.id;

-- Комментарии к таблицам
COMMENT ON TABLE clients IS 'Таблица клиентов банка';
COMMENT ON TABLE accounts IS 'Таблица банковских счетов';
COMMENT ON TABLE transactions IS 'Таблица банковских транзакций';

-- Успешное завершение инициализации
SELECT 'АБС схема БД успешно создана' as status;
