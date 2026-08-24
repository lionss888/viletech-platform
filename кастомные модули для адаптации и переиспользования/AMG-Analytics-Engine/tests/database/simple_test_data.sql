-- Упрощенные тестовые данные для АБС
-- Демонстрация всех возможностей дашборда

-- Очистка существующих данных
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE accounts CASCADE;
TRUNCATE TABLE clients CASCADE;

-- Сброс последовательностей
ALTER SEQUENCE clients_id_seq RESTART WITH 1;
ALTER SEQUENCE accounts_id_seq RESTART WITH 1;
ALTER SEQUENCE transactions_id_seq RESTART WITH 1;

-- Создание клиентов
INSERT INTO clients (first_name, last_name, tax_id, created_at) VALUES
('Александр', 'Иванов', 'INN0000000001', CURRENT_TIMESTAMP - INTERVAL '2 years'),
('Мария', 'Петрова', 'INN0000000002', CURRENT_TIMESTAMP - INTERVAL '1 year 6 months'),
('Дмитрий', 'Сидоров', 'INN0000000003', CURRENT_TIMESTAMP - INTERVAL '1 year'),
('Анна', 'Козлова', 'INN0000000004', CURRENT_TIMESTAMP - INTERVAL '8 months'),
('Сергей', 'Смирнов', 'INN0000000005', CURRENT_TIMESTAMP - INTERVAL '6 months'),
('Елена', 'Новикова', 'INN0000000006', CURRENT_TIMESTAMP - INTERVAL '4 months'),
('Андрей', 'Попов', 'INN0000000007', CURRENT_TIMESTAMP - INTERVAL '3 months'),
('Ольга', 'Морозова', 'INN0000000008', CURRENT_TIMESTAMP - INTERVAL '2 months'),
('Михаил', 'Васильев', 'INN0000000009', CURRENT_TIMESTAMP - INTERVAL '1 month'),
('Татьяна', 'Волкова', 'INN0000000010', CURRENT_TIMESTAMP - INTERVAL '3 weeks'),
('Владимир', 'Зайцев', 'INN0000000011', CURRENT_TIMESTAMP - INTERVAL '2 weeks'),
('Наталья', 'Алексеева', 'INN0000000012', CURRENT_TIMESTAMP - INTERVAL '1 week'),
('Игорь', 'Лебедев', 'INN0000000013', CURRENT_TIMESTAMP - INTERVAL '5 days'),
('Ирина', 'Лебедева', 'INN0000000014', CURRENT_TIMESTAMP - INTERVAL '3 days'),
('Павел', 'Соколов', 'INN0000000015', CURRENT_TIMESTAMP - INTERVAL '1 day'),
('Светлана', 'Козлова', 'INN0000000016', CURRENT_TIMESTAMP - INTERVAL '12 hours'),
('Николай', 'Новиков', 'INN0000000017', CURRENT_TIMESTAMP - INTERVAL '6 hours'),
('Юлия', 'Морозова', 'INN0000000018', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
('Алексей', 'Петров', 'INN0000000019', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
('Марина', 'Соколова', 'INN0000000020', CURRENT_TIMESTAMP - INTERVAL '30 minutes');

-- Создание счетов
INSERT INTO accounts (account_number, client_id, type, currency, balance, opened_date, is_active) VALUES
-- Расчетные счета (RUB)
('ACC00000001', 1, 'Расчетный', 'RUB', 1250000.50, CURRENT_DATE - INTERVAL '2 years', true),
('ACC00000002', 2, 'Расчетный', 'RUB', 890000.75, CURRENT_DATE - INTERVAL '1 year 6 months', true),
('ACC00000003', 3, 'Расчетный', 'RUB', 2100000.00, CURRENT_DATE - INTERVAL '1 year', true),
('ACC00000004', 4, 'Расчетный', 'RUB', 450000.25, CURRENT_DATE - INTERVAL '8 months', true),
('ACC00000005', 5, 'Расчетный', 'RUB', 1750000.80, CURRENT_DATE - INTERVAL '6 months', true),

-- Депозитные счета (USD)
('ACC00000006', 1, 'Депозитный', 'USD', 50000.00, CURRENT_DATE - INTERVAL '2 years', true),
('ACC00000007', 2, 'Депозитный', 'USD', 75000.00, CURRENT_DATE - INTERVAL '1 year 6 months', true),
('ACC00000008', 3, 'Депозитный', 'USD', 100000.00, CURRENT_DATE - INTERVAL '1 year', true),
('ACC00000009', 4, 'Депозитный', 'USD', 25000.00, CURRENT_DATE - INTERVAL '8 months', true),
('ACC00000010', 5, 'Депозитный', 'USD', 125000.00, CURRENT_DATE - INTERVAL '6 months', true),

-- Кредитные счета (RUB)
('ACC00000011', 6, 'Кредитный', 'RUB', -500000.00, CURRENT_DATE - INTERVAL '4 months', true),
('ACC00000012', 7, 'Кредитный', 'RUB', -750000.00, CURRENT_DATE - INTERVAL '3 months', true),
('ACC00000013', 8, 'Кредитный', 'RUB', -300000.00, CURRENT_DATE - INTERVAL '2 months', true),
('ACC00000014', 9, 'Кредитный', 'RUB', -1200000.00, CURRENT_DATE - INTERVAL '1 month', true),
('ACC00000015', 10, 'Кредитный', 'RUB', -600000.00, CURRENT_DATE - INTERVAL '3 weeks', true),

-- Сберегательные счета (EUR)
('ACC00000016', 11, 'Сберегательный', 'EUR', 15000.00, CURRENT_DATE - INTERVAL '2 weeks', true),
('ACC00000017', 12, 'Сберегательный', 'EUR', 25000.00, CURRENT_DATE - INTERVAL '1 week', true),
('ACC00000018', 13, 'Сберегательный', 'EUR', 35000.00, CURRENT_DATE - INTERVAL '5 days', true),
('ACC00000019', 14, 'Сберегательный', 'EUR', 45000.00, CURRENT_DATE - INTERVAL '3 days', true),
('ACC00000020', 15, 'Сберегательный', 'EUR', 55000.00, CURRENT_DATE - INTERVAL '1 day', true),

-- Корпоративные счета (CNY)
('ACC00000021', 16, 'Корпоративный', 'CNY', 500000.00, CURRENT_DATE - INTERVAL '12 hours', true),
('ACC00000022', 17, 'Корпоративный', 'CNY', 750000.00, CURRENT_DATE - INTERVAL '6 hours', true),
('ACC00000023', 18, 'Корпоративный', 'CNY', 1000000.00, CURRENT_DATE - INTERVAL '3 hours', true),
('ACC00000024', 19, 'Корпоративный', 'CNY', 1250000.00, CURRENT_DATE - INTERVAL '1 hour', true),
('ACC00000025', 20, 'Корпоративный', 'CNY', 1500000.00, CURRENT_DATE - INTERVAL '30 minutes', true),

-- Неактивные счета
('ACC00000026', 1, 'Расчетный', 'RUB', 0.00, CURRENT_DATE - INTERVAL '1 year', false),
('ACC00000027', 2, 'Депозитный', 'USD', 0.00, CURRENT_DATE - INTERVAL '6 months', false),
('ACC00000028', 3, 'Кредитный', 'RUB', 0.00, CURRENT_DATE - INTERVAL '3 months', false);

-- Создание транзакций
INSERT INTO transactions (debit_account_id, credit_account_id, amount, currency, description, status, created_at, executed_at) VALUES
-- Завершенные транзакции
(1, 6, 50000.00, 'RUB', 'Перевод средств', 'completed', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '1 minute'),
(2, 7, 75000.00, 'RUB', 'Оплата услуг', 'completed', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '2 minutes'),
(3, 8, 100000.00, 'RUB', 'Пополнение счета', 'completed', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '1 minute'),
(4, 9, 25000.00, 'RUB', 'Снятие наличных', 'completed', CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '4 days' + INTERVAL '3 minutes'),
(5, 10, 125000.00, 'RUB', 'Перевод между счетами', 'completed', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days' + INTERVAL '1 minute'),

-- Валютные транзакции
(6, 16, 10000.00, 'USD', 'Конвертация валют', 'completed', CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_TIMESTAMP - INTERVAL '6 days' + INTERVAL '5 minutes'),
(7, 17, 15000.00, 'USD', 'Международный перевод', 'completed', CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '2 minutes'),
(8, 18, 20000.00, 'USD', 'Пополнение депозита', 'completed', CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP - INTERVAL '8 days' + INTERVAL '1 minute'),
(9, 19, 5000.00, 'USD', 'Оплата кредита', 'completed', CURRENT_TIMESTAMP - INTERVAL '9 days', CURRENT_TIMESTAMP - INTERVAL '9 days' + INTERVAL '4 minutes'),
(10, 20, 25000.00, 'USD', 'Возврат средств', 'completed', CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '10 days' + INTERVAL '2 minutes'),

-- Евро транзакции
(16, 21, 5000.00, 'EUR', 'Европейский перевод', 'completed', CURRENT_TIMESTAMP - INTERVAL '11 days', CURRENT_TIMESTAMP - INTERVAL '11 days' + INTERVAL '3 minutes'),
(17, 22, 7500.00, 'EUR', 'Пополнение сбережений', 'completed', CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP - INTERVAL '12 days' + INTERVAL '1 minute'),
(18, 23, 10000.00, 'EUR', 'Корпоративный платеж', 'completed', CURRENT_TIMESTAMP - INTERVAL '13 days', CURRENT_TIMESTAMP - INTERVAL '13 days' + INTERVAL '2 minutes'),
(19, 24, 12500.00, 'EUR', 'Инвестиционный взнос', 'completed', CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '14 days' + INTERVAL '1 minute'),
(20, 25, 15000.00, 'EUR', 'Зарплата', 'completed', CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '15 days' + INTERVAL '3 minutes'),

-- Юань транзакции
(21, 1, 100000.00, 'CNY', 'Китайский перевод', 'completed', CURRENT_TIMESTAMP - INTERVAL '16 days', CURRENT_TIMESTAMP - INTERVAL '16 days' + INTERVAL '5 minutes'),
(22, 2, 150000.00, 'CNY', 'Торговый платеж', 'completed', CURRENT_TIMESTAMP - INTERVAL '17 days', CURRENT_TIMESTAMP - INTERVAL '17 days' + INTERVAL '2 minutes'),
(23, 3, 200000.00, 'CNY', 'Импортная операция', 'completed', CURRENT_TIMESTAMP - INTERVAL '18 days', CURRENT_TIMESTAMP - INTERVAL '18 days' + INTERVAL '4 minutes'),
(24, 4, 250000.00, 'CNY', 'Экспортная выручка', 'completed', CURRENT_TIMESTAMP - INTERVAL '19 days', CURRENT_TIMESTAMP - INTERVAL '19 days' + INTERVAL '1 minute'),
(25, 5, 300000.00, 'CNY', 'Международная торговля', 'completed', CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP - INTERVAL '20 days' + INTERVAL '3 minutes'),

-- Ожидающие транзакции
(1, 6, 30000.00, 'RUB', 'Перевод в обработке', 'pending', CURRENT_TIMESTAMP - INTERVAL '1 hour', NULL),
(2, 7, 45000.00, 'RUB', 'Платеж на проверке', 'pending', CURRENT_TIMESTAMP - INTERVAL '2 hours', NULL),
(3, 8, 60000.00, 'RUB', 'Ожидание подтверждения', 'pending', CURRENT_TIMESTAMP - INTERVAL '3 hours', NULL),
(4, 9, 35000.00, 'RUB', 'Валидация данных', 'pending', CURRENT_TIMESTAMP - INTERVAL '4 hours', NULL),
(5, 10, 80000.00, 'RUB', 'Проверка лимитов', 'pending', CURRENT_TIMESTAMP - INTERVAL '5 hours', NULL),

-- Неудачные транзакции
(6, 16, 5000.00, 'USD', 'Недостаточно средств', 'failed', CURRENT_TIMESTAMP - INTERVAL '6 hours', NULL),
(7, 17, 7500.00, 'USD', 'Превышен лимит', 'failed', CURRENT_TIMESTAMP - INTERVAL '7 hours', NULL),
(8, 18, 10000.00, 'USD', 'Ошибка валидации', 'failed', CURRENT_TIMESTAMP - INTERVAL '8 hours', NULL),
(9, 19, 2500.00, 'USD', 'Техническая ошибка', 'failed', CURRENT_TIMESTAMP - INTERVAL '9 hours', NULL),
(10, 20, 12500.00, 'USD', 'Счет заблокирован', 'failed', CURRENT_TIMESTAMP - INTERVAL '10 hours', NULL),

-- Отмененные транзакции
(16, 21, 3000.00, 'EUR', 'Отменено клиентом', 'cancelled', CURRENT_TIMESTAMP - INTERVAL '11 hours', NULL),
(17, 22, 4500.00, 'EUR', 'Отменено банком', 'cancelled', CURRENT_TIMESTAMP - INTERVAL '12 hours', NULL),
(18, 23, 6000.00, 'EUR', 'Дублированная операция', 'cancelled', CURRENT_TIMESTAMP - INTERVAL '13 hours', NULL),
(19, 24, 7500.00, 'EUR', 'Истекло время', 'cancelled', CURRENT_TIMESTAMP - INTERVAL '14 hours', NULL),
(20, 25, 9000.00, 'EUR', 'Изменены условия', 'cancelled', CURRENT_TIMESTAMP - INTERVAL '15 hours', NULL),

-- Крупные транзакции
(1, 6, 500000.00, 'RUB', 'Крупный перевод', 'completed', CURRENT_TIMESTAMP - INTERVAL '1 week', CURRENT_TIMESTAMP - INTERVAL '1 week' + INTERVAL '10 minutes'),
(2, 7, 750000.00, 'RUB', 'Корпоративный платеж', 'completed', CURRENT_TIMESTAMP - INTERVAL '2 weeks', CURRENT_TIMESTAMP - INTERVAL '2 weeks' + INTERVAL '15 minutes'),
(3, 8, 1000000.00, 'RUB', 'Инвестиционный взнос', 'completed', CURRENT_TIMESTAMP - INTERVAL '3 weeks', CURRENT_TIMESTAMP - INTERVAL '3 weeks' + INTERVAL '20 minutes'),
(4, 9, 250000.00, 'RUB', 'Недвижимость', 'completed', CURRENT_TIMESTAMP - INTERVAL '4 weeks', CURRENT_TIMESTAMP - INTERVAL '4 weeks' + INTERVAL '25 minutes'),
(5, 10, 1250000.00, 'RUB', 'Бизнес-проект', 'completed', CURRENT_TIMESTAMP - INTERVAL '5 weeks', CURRENT_TIMESTAMP - INTERVAL '5 weeks' + INTERVAL '30 minutes);

-- Финальная проверка
SELECT 'SUCCESS' as status;
