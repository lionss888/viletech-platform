package processor

import (
	"database/sql"
	"fmt"
	"time"

	"amg-etl/internal/config"
	"amg-etl/pkg/clickhouse"
	"amg-etl/pkg/postgres"

	"github.com/sirupsen/logrus"
)

type ETLProcessor struct {
	config        *config.Config
	postgresDB    *sql.DB
	clickhouseDB  *clickhouse.ClickHouseDB
	logger        *logrus.Logger
}

func NewETLProcessor(cfg *config.Config) *ETLProcessor {
	return &ETLProcessor{
		config: cfg,
		logger: logrus.New(),
	}
}

func (p *ETLProcessor) Initialize() error {
	p.logger.Info("Инициализация ETL процессора...")

	// Подключение к PostgreSQL
	postgresDB, err := postgres.Connect(p.config.GetPostgresDSN())
	if err != nil {
		return fmt.Errorf("ошибка подключения к PostgreSQL: %w", err)
	}
	p.postgresDB = postgresDB

	// Подключение к ClickHouse
	clickhouseDB, err := clickhouse.Connect(p.config.GetClickHouseDSN())
	if err != nil {
		return fmt.Errorf("ошибка подключения к ClickHouse: %w", err)
	}
	p.clickhouseDB = clickhouseDB

	p.logger.Info("ETL процессор инициализирован успешно")
	return nil
}

func (p *ETLProcessor) ProcessClientMart() error {
	p.logger.Info("Обработка клиентской витрины...")

	query := `
		SELECT 
			c.id as client_id,
			c.first_name || ' ' || c.last_name as client_name,
			COALESCE(SUM(a.balance), 0) as total_balance,
			COUNT(a.id) as account_count,
			MAX(t.created_at::date) as last_transaction_date,
			COUNT(CASE WHEN t.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as transaction_count_30d,
			COALESCE(AVG(t.amount), 0) as avg_transaction_amount
		FROM clients c
		LEFT JOIN accounts a ON c.id = a.client_id
		LEFT JOIN transactions t ON (a.id = t.debit_account_id OR a.id = t.credit_account_id)
		GROUP BY c.id, c.first_name, c.last_name
	`

	rows, err := p.postgresDB.Query(query)
	if err != nil {
		return fmt.Errorf("ошибка запроса к PostgreSQL: %w", err)
	}
	defer rows.Close()

	var clients []ClientData
	for rows.Next() {
		var client ClientData
		err := rows.Scan(
			&client.ClientID,
			&client.ClientName,
			&client.TotalBalance,
			&client.AccountCount,
			&client.LastTransactionDate,
			&client.TransactionCount30d,
			&client.AvgTransactionAmount,
		)
		if err != nil {
			p.logger.Errorf("ошибка сканирования строки: %v", err)
			continue
		}
		client.UpdatedAt = time.Now()
		clients = append(clients, client)
	}

	// Загрузка в ClickHouse
	err = p.clickhouseDB.InsertClientMart(clients)
	if err != nil {
		return fmt.Errorf("ошибка загрузки в ClickHouse: %w", err)
	}

	p.logger.Infof("Клиентская витрина обработана: %d записей", len(clients))
	return nil
}

func (p *ETLProcessor) ProcessTransactionMart() error {
	p.logger.Info("Обработка транзакционной витрины...")

	query := `
		SELECT 
			DATE(t.created_at) as date,
			EXTRACT(HOUR FROM t.created_at) as hour,
			t.currency,
			COUNT(*) as transaction_count,
			SUM(t.amount) as total_amount,
			AVG(t.amount) as avg_amount,
			MIN(t.amount) as min_amount,
			MAX(t.amount) as max_amount,
			t.status
		FROM transactions t
		WHERE t.created_at >= NOW() - INTERVAL '7 days'
		GROUP BY DATE(t.created_at), EXTRACT(HOUR FROM t.created_at), t.currency, t.status
	`

	rows, err := p.postgresDB.Query(query)
	if err != nil {
		return fmt.Errorf("ошибка запроса к PostgreSQL: %w", err)
	}
	defer rows.Close()

	var transactions []TransactionData
	for rows.Next() {
		var tx TransactionData
		err := rows.Scan(
			&tx.Date,
			&tx.Hour,
			&tx.Currency,
			&tx.TransactionCount,
			&tx.TotalAmount,
			&tx.AvgAmount,
			&tx.MinAmount,
			&tx.MaxAmount,
			&tx.Status,
		)
		if err != nil {
			p.logger.Errorf("ошибка сканирования строки: %v", err)
			continue
		}
		tx.UpdatedAt = time.Now()
		transactions = append(transactions, tx)
	}

	// Загрузка в ClickHouse
	err = p.clickhouseDB.InsertTransactionMart(transactions)
	if err != nil {
		return fmt.Errorf("ошибка загрузки в ClickHouse: %w", err)
	}

	p.logger.Infof("Транзакционная витрина обработана: %d записей", len(transactions))
	return nil
}

func (p *ETLProcessor) ProcessAccountMart() error {
	p.logger.Info("Обработка счетной витрины...")

	query := `
		SELECT 
			a.type as account_type,
			a.currency,
			SUM(a.balance) as total_balance,
			COUNT(*) as account_count,
			AVG(a.balance) as avg_balance,
			COUNT(CASE WHEN a.is_active = true THEN 1 END) as active_accounts,
			COUNT(CASE WHEN a.is_active = false THEN 1 END) as inactive_accounts
		FROM accounts a
		GROUP BY a.type, a.currency
	`

	rows, err := p.postgresDB.Query(query)
	if err != nil {
		return fmt.Errorf("ошибка запроса к PostgreSQL: %w", err)
	}
	defer rows.Close()

	var accounts []AccountData
	for rows.Next() {
		var acc AccountData
		err := rows.Scan(
			&acc.AccountType,
			&acc.Currency,
			&acc.TotalBalance,
			&acc.AccountCount,
			&acc.AvgBalance,
			&acc.ActiveAccounts,
			&acc.InactiveAccounts,
		)
		if err != nil {
			p.logger.Errorf("ошибка сканирования строки: %v", err)
			continue
		}
		acc.UpdatedAt = time.Now()
		accounts = append(accounts, acc)
	}

	// Загрузка в ClickHouse
	err = p.clickhouseDB.InsertAccountMart(accounts)
	if err != nil {
		return fmt.Errorf("ошибка загрузки в ClickHouse: %w", err)
	}

	p.logger.Infof("Счетная витрина обработана: %d записей", len(accounts))
	return nil
}

func (p *ETLProcessor) Run() error {
	p.logger.Info("Запуск ETL процесса...")

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

	p.logger.Info("ETL процесс завершен")
	return nil
}

func (p *ETLProcessor) Close() error {
	if p.postgresDB != nil {
		p.postgresDB.Close()
	}
	if p.clickhouseDB != nil {
		p.clickhouseDB.Close()
	}
	return nil
}

// Структуры данных
type ClientData struct {
	ClientID              int32
	ClientName            string
	TotalBalance          float64
	AccountCount          int16
	LastTransactionDate   *time.Time
	TransactionCount30d   int32
	AvgTransactionAmount  float64
	UpdatedAt             time.Time
}

type TransactionData struct {
	Date             time.Time
	Hour             int8
	Currency         string
	TransactionCount int32
	TotalAmount      float64
	AvgAmount        float64
	MinAmount        float64
	MaxAmount        float64
	Status           string
	UpdatedAt        time.Time
}

type AccountData struct {
	AccountType      string
	Currency         string
	TotalBalance     float64
	AccountCount     int32
	AvgBalance       float64
	ActiveAccounts   int32
	InactiveAccounts int32
	UpdatedAt        time.Time
}
