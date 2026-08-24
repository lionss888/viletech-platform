package processor

import (
	"database/sql"
	"fmt"
	"time"

	"amg-etl/internal/config"
	"amg-etl/pkg/postgres"

	"github.com/sirupsen/logrus"
)

type PostgresETLProcessor struct {
	config     *config.Config
	postgresDB *sql.DB
	logger     *logrus.Logger
}

func NewPostgresETLProcessor(cfg *config.Config) *PostgresETLProcessor {
	return &PostgresETLProcessor{
		config: cfg,
		logger: logrus.New(),
	}
}

func (p *PostgresETLProcessor) Initialize() error {
	p.logger.Info("Инициализация PostgreSQL ETL процессора...")

	// Подключение к PostgreSQL
	postgresDB, err := postgres.Connect(p.config.GetPostgresDSN())
	if err != nil {
		return fmt.Errorf("ошибка подключения к PostgreSQL: %w", err)
	}
	p.postgresDB = postgresDB

	p.logger.Info("PostgreSQL ETL процессор инициализирован успешно")
	return nil
}

func (p *PostgresETLProcessor) ProcessClientMart() error {
	p.logger.Info("Обработка клиентской витрины...")

	// Очистка старых данных
	_, err := p.postgresDB.Exec("DELETE FROM client_mart")
	if err != nil {
		return fmt.Errorf("ошибка очистки client_mart: %w", err)
	}

	query := `
		INSERT INTO client_mart (
			client_id, client_name, total_balance, account_count, 
			last_transaction_date, transaction_count_30d, avg_transaction_amount, updated_at
		)
		SELECT 
			c.id as client_id,
			c.first_name || ' ' || c.last_name as client_name,
			COALESCE(SUM(a.balance), 0) as total_balance,
			COUNT(a.id) as account_count,
			MAX(t.created_at::date) as last_transaction_date,
			COUNT(CASE WHEN t.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as transaction_count_30d,
			COALESCE(AVG(t.amount), 0) as avg_transaction_amount,
			NOW() as updated_at
		FROM clients c
		LEFT JOIN accounts a ON c.id = a.client_id
		LEFT JOIN transactions t ON (a.id = t.debit_account_id OR a.id = t.credit_account_id)
		GROUP BY c.id, c.first_name, c.last_name
	`

	_, err = p.postgresDB.Exec(query)
	if err != nil {
		return fmt.Errorf("ошибка вставки в client_mart: %w", err)
	}

	// Получаем количество обработанных записей
	var count int
	err = p.postgresDB.QueryRow("SELECT COUNT(*) FROM client_mart").Scan(&count)
	if err != nil {
		p.logger.Errorf("ошибка подсчета записей: %v", err)
	} else {
		p.logger.Infof("Клиентская витрина обработана: %d записей", count)
	}

	return nil
}

func (p *PostgresETLProcessor) ProcessTransactionMart() error {
	p.logger.Info("Обработка транзакционной витрины...")

	// Очистка старых данных
	_, err := p.postgresDB.Exec("DELETE FROM transaction_mart")
	if err != nil {
		return fmt.Errorf("ошибка очистки transaction_mart: %w", err)
	}

	query := `
		INSERT INTO transaction_mart (
			date, hour, currency, transaction_count, total_amount, 
			avg_amount, min_amount, max_amount, status, updated_at
		)
		SELECT 
			DATE(t.created_at) as date,
			EXTRACT(HOUR FROM t.created_at) as hour,
			t.currency,
			COUNT(*) as transaction_count,
			SUM(t.amount) as total_amount,
			AVG(t.amount) as avg_amount,
			MIN(t.amount) as min_amount,
			MAX(t.amount) as max_amount,
			t.status,
			NOW() as updated_at
		FROM transactions t
		WHERE t.created_at >= NOW() - INTERVAL '7 days'
		GROUP BY DATE(t.created_at), EXTRACT(HOUR FROM t.created_at), t.currency, t.status
	`

	_, err = p.postgresDB.Exec(query)
	if err != nil {
		return fmt.Errorf("ошибка вставки в transaction_mart: %w", err)
	}

	// Получаем количество обработанных записей
	var count int
	err = p.postgresDB.QueryRow("SELECT COUNT(*) FROM transaction_mart").Scan(&count)
	if err != nil {
		p.logger.Errorf("ошибка подсчета записей: %v", err)
	} else {
		p.logger.Infof("Транзакционная витрина обработана: %d записей", count)
	}

	return nil
}

func (p *PostgresETLProcessor) ProcessAccountMart() error {
	p.logger.Info("Обработка счетной витрины...")

	// Очистка старых данных
	_, err := p.postgresDB.Exec("DELETE FROM account_mart")
	if err != nil {
		return fmt.Errorf("ошибка очистки account_mart: %w", err)
	}

	query := `
		INSERT INTO account_mart (
			account_type, currency, total_balance, account_count, 
			avg_balance, active_accounts, inactive_accounts, updated_at
		)
		SELECT 
			a.type as account_type,
			a.currency,
			SUM(a.balance) as total_balance,
			COUNT(*) as account_count,
			AVG(a.balance) as avg_balance,
			COUNT(CASE WHEN a.is_active = true THEN 1 END) as active_accounts,
			COUNT(CASE WHEN a.is_active = false THEN 1 END) as inactive_accounts,
			NOW() as updated_at
		FROM accounts a
		GROUP BY a.type, a.currency
	`

	_, err = p.postgresDB.Exec(query)
	if err != nil {
		return fmt.Errorf("ошибка вставки в account_mart: %w", err)
	}

	// Получаем количество обработанных записей
	var count int
	err = p.postgresDB.QueryRow("SELECT COUNT(*) FROM account_mart").Scan(&count)
	if err != nil {
		p.logger.Errorf("ошибка подсчета записей: %v", err)
	} else {
		p.logger.Infof("Счетная витрина обработана: %d записей", count)
	}

	return nil
}

func (p *PostgresETLProcessor) Run() error {
	p.logger.Info("Запуск PostgreSQL ETL процесса...")

	// Обработка всех витрин
	if err := p.ProcessClientMart(); err != nil {
		p.logger.Errorf("Ошибка обработки клиентской витрины: %v", err)
	}

	if err := p.ProcessTransactionMart(); err != nil {
		p.logger.Errorf("Ошибка обработки транзакционной витрины: %v", err)
	}

	if err := p.ProcessAccountMart(); err != nil {
		p.logger.Errorf("Ошибка обработки счетной витрины: %v", err)
	}

	// Очистка старых данных
	if err := p.CleanupOldData(); err != nil {
		p.logger.Errorf("Ошибка очистки старых данных: %v", err)
	}

	p.logger.Info("PostgreSQL ETL процесс завершен")
	return nil
}

func (p *PostgresETLProcessor) CleanupOldData() error {
	p.logger.Info("Очистка старых данных...")

	_, err := p.postgresDB.Exec("SELECT cleanup_old_data()")
	if err != nil {
		return fmt.Errorf("ошибка очистки старых данных: %w", err)
	}

	p.logger.Info("Очистка старых данных завершена")
	return nil
}

func (p *PostgresETLProcessor) Close() error {
	if p.postgresDB != nil {
		return p.postgresDB.Close()
	}
	return nil
}
