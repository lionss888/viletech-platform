-- Заполнение таблиц АБС тестовыми данными
-- Создание 100 уникальных записей для демонстрации функциональности

-- Очистка существующих данных (если есть)
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE accounts CASCADE;
TRUNCATE TABLE clients CASCADE;

-- Сброс последовательностей
ALTER SEQUENCE clients_id_seq RESTART WITH 1;
ALTER SEQUENCE accounts_id_seq RESTART WITH 1;
ALTER SEQUENCE transactions_id_seq RESTART WITH 1;

-- Массивы для генерации данных
DO $$
DECLARE
    first_names TEXT[] := ARRAY['Александр', 'Мария', 'Дмитрий', 'Анна', 'Сергей', 'Елена', 'Андрей', 'Ольга', 'Михаил', 'Татьяна', 'Владимир', 'Наталья', 'Игорь', 'Ирина', 'Павел', 'Светлана', 'Николай', 'Юлия', 'Алексей', 'Марина'];
    last_names TEXT[] := ARRAY['Иванов', 'Петрова', 'Сидоров', 'Козлова', 'Смирнов', 'Новикова', 'Попов', 'Морозова', 'Васильев', 'Волкова', 'Зайцев', 'Алексеева', 'Лебедев', 'Лебедева', 'Соколов', 'Козлова', 'Новиков', 'Морозов', 'Петров', 'Соколова'];
    account_types TEXT[] := ARRAY['Расчетный', 'Депозитный', 'Кредитный', 'Сберегательный', 'Корпоративный'];
    currencies TEXT[] := ARRAY['RUB', 'USD', 'EUR', 'CNY'];
    transaction_statuses TEXT[] := ARRAY['completed', 'pending', 'failed', 'cancelled'];
    descriptions TEXT[] := ARRAY['Перевод средств', 'Оплата услуг', 'Пополнение счета', 'Снятие наличных', 'Перевод между счетами', 'Оплата кредита', 'Пополнение депозита', 'Комиссия', 'Возврат средств', 'Зарплата'];
    
    i INTEGER;
    client_id INTEGER;
    account_id INTEGER;
    debit_account_id INTEGER;
    credit_account_id INTEGER;
    random_amount NUMERIC;
    random_date DATE;
    random_timestamp TIMESTAMP;
BEGIN
    -- Создание 50 клиентов
    FOR i IN 1..50 LOOP
        INSERT INTO clients (first_name, last_name, tax_id, created_at)
        VALUES (
            first_names[1 + (i-1) % array_length(first_names, 1)],
            last_names[1 + (i-1) % array_length(last_names, 1)],
            'INN' || LPAD(i::TEXT, 10, '0'),
            CURRENT_TIMESTAMP - INTERVAL '1 day' * (random() * 365)::INTEGER
        );
    END LOOP;
    
    -- Создание 100 счетов (по 2 счета на клиента)
    FOR i IN 1..100 LOOP
        client_id := 1 + (i-1) % 50;
        random_amount := (random() * 1000000)::NUMERIC(15,2);
        random_date := CURRENT_DATE - INTERVAL '1 day' * (random() * 730)::INTEGER;
        
        INSERT INTO accounts (account_number, client_id, type, currency, balance, opened_date, is_active)
        VALUES (
            'ACC' || LPAD(i::TEXT, 8, '0'),
            client_id,
            account_types[1 + (i-1) % array_length(account_types, 1)],
            currencies[1 + (i-1) % array_length(currencies, 1)],
            random_amount,
            random_date,
            CASE WHEN random() > 0.1 THEN true ELSE false END
        );
    END LOOP;
    
    -- Создание 100 транзакций
    FOR i IN 1..100 LOOP
        -- Выбираем случайные активные счета для дебета и кредита
        SELECT id INTO debit_account_id 
        FROM accounts 
        WHERE is_active = true 
        ORDER BY random() 
        LIMIT 1;
        
        SELECT id INTO credit_account_id 
        FROM accounts 
        WHERE is_active = true AND id != debit_account_id 
        ORDER BY random() 
        LIMIT 1;
        
        random_amount := (random() * 50000 + 100)::NUMERIC(15,2);
        random_timestamp := CURRENT_TIMESTAMP - INTERVAL '1 hour' * (random() * 8760)::INTEGER;
        
        INSERT INTO transactions (
            debit_account_id, 
            credit_account_id, 
            amount, 
            currency, 
            description, 
            status, 
            created_at, 
            executed_at
        )
        VALUES (
            debit_account_id,
            credit_account_id,
            random_amount,
            currencies[1 + (i-1) % array_length(currencies, 1)],
            descriptions[1 + (i-1) % array_length(descriptions, 1)],
            transaction_statuses[1 + (i-1) % array_length(transaction_statuses, 1)],
            random_timestamp,
            CASE 
                WHEN transaction_statuses[1 + (i-1) % array_length(transaction_statuses, 1)] = 'completed' 
                THEN random_timestamp + INTERVAL '1 minute' * (random() * 60)::INTEGER
                ELSE NULL
            END
        );
    END LOOP;
    
    -- Обновление балансов счетов на основе транзакций
    UPDATE accounts SET balance = (
        SELECT COALESCE(SUM(
            CASE 
                WHEN t.debit_account_id = a.id THEN -t.amount
                WHEN t.credit_account_id = a.id THEN t.amount
                ELSE 0
            END
        ), 0)
        FROM transactions t
        WHERE t.status = 'completed' 
        AND (t.debit_account_id = a.id OR t.credit_account_id = a.id)
    ) + (random() * 100000)::NUMERIC(15,2);
    
END $$;

-- Проверка созданных данных
SELECT 
    'КЛИЕНТЫ' as table_name,
    COUNT(*) as record_count
FROM clients
UNION ALL
SELECT 
    'СЧЕТА' as table_name,
    COUNT(*) as record_count
FROM accounts
UNION ALL
SELECT 
    'ТРАНЗАКЦИИ' as table_name,
    COUNT(*) as record_count
FROM transactions;

-- Статистика по валютам
SELECT 
    currency,
    COUNT(*) as accounts_count,
    SUM(balance) as total_balance
FROM accounts 
WHERE is_active = true
GROUP BY currency
ORDER BY total_balance DESC;

-- Статистика по типам счетов
SELECT 
    type,
    COUNT(*) as accounts_count,
    AVG(balance) as avg_balance
FROM accounts 
WHERE is_active = true
GROUP BY type
ORDER BY accounts_count DESC;

-- Статистика по статусам транзакций
SELECT 
    status,
    COUNT(*) as transactions_count,
    SUM(amount) as total_amount
FROM transactions
GROUP BY status
ORDER BY transactions_count DESC;

-- Топ-10 клиентов по балансу
SELECT 
    c.first_name,
    c.last_name,
    c.tax_id,
    COUNT(a.id) as accounts_count,
    SUM(a.balance) as total_balance
FROM clients c
JOIN accounts a ON c.id = a.client_id
WHERE a.is_active = true
GROUP BY c.id, c.first_name, c.last_name, c.tax_id
ORDER BY total_balance DESC
LIMIT 10;

SELECT 'ДАННЫЕ УСПЕШНО СОЗДАНЫ!' as status;
