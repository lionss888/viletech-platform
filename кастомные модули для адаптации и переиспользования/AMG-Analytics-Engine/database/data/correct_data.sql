-- Корректное заполнение данными с учетом ограничений
INSERT INTO clients (first_name, last_name, tax_id) VALUES 
('Александр', 'Иванов', 'INN0000000001'),
('Мария', 'Петрова', 'INN0000000002'),
('Дмитрий', 'Сидоров', 'INN0000000003'),
('Анна', 'Козлова', 'INN0000000004'),
('Сергей', 'Смирнов', 'INN0000000005');

INSERT INTO accounts (account_number, client_id, type, currency, balance, opened_date, is_active) VALUES 
('ACC00000001', 1, 'Расчетный', 'RUB', 150000.50, '2023-01-15', true),
('ACC00000002', 1, 'Депозитный', 'USD', 5000.00, '2023-02-20', true),
('ACC00000003', 2, 'Расчетный', 'RUB', 75000.25, '2023-03-10', true),
('ACC00000004', 3, 'Кредитный', 'RUB', 0.00, '2023-04-05', true),
('ACC00000005', 4, 'Сберегательный', 'EUR', 3000.75, '2023-05-12', true);

INSERT INTO transactions (debit_account_id, credit_account_id, amount, currency, description, status) VALUES 
(1, 3, 10000.00, 'RUB', 'Перевод средств', 'completed'),
(2, 5, 500.00, 'USD', 'Оплата услуг', 'completed'),
(3, 1, 5000.00, 'RUB', 'Пополнение счета', 'completed'),
(4, 3, 15000.00, 'RUB', 'Оплата кредита', 'pending'),
(5, 2, 200.00, 'EUR', 'Перевод между счетами', 'completed');

SELECT 'ДАННЫЕ СОЗДАНЫ КОРРЕКТНО' as status;
