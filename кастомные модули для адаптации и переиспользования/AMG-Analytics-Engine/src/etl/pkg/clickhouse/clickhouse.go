package clickhouse

import (
	"context"
	"fmt"
	"time"

	"amg-etl/internal/processor"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

type ClickHouseDB struct {
	conn driver.Conn
}

func Connect(dsn string) (*ClickHouseDB, error) {
	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{"localhost:9000"},
		Auth: clickhouse.Auth{
			Database: "abs_analytics",
			Username: "default",
			Password: "",
		},
		Settings: clickhouse.Settings{
			"max_execution_time": 60,
		},
		Debug: false,
	})
	if err != nil {
		return nil, fmt.Errorf("ошибка подключения к ClickHouse: %w", err)
	}

	if err := conn.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("ошибка ping ClickHouse: %w", err)
	}

	return &ClickHouseDB{conn: conn}, nil
}

func (c *ClickHouseDB) InsertClientMart(clients []processor.ClientData) error {
	if len(clients) == 0 {
		return nil
	}

	batch, err := c.conn.PrepareBatch(context.Background(), "INSERT INTO client_mart")
	if err != nil {
		return fmt.Errorf("ошибка подготовки batch: %w", err)
	}

	for _, client := range clients {
		err := batch.Append(
			client.ClientID,
			client.ClientName,
			client.TotalBalance,
			client.AccountCount,
			client.LastTransactionDate,
			client.TransactionCount30d,
			client.AvgTransactionAmount,
			client.UpdatedAt,
		)
		if err != nil {
			return fmt.Errorf("ошибка добавления в batch: %w", err)
		}
	}

	if err := batch.Send(); err != nil {
		return fmt.Errorf("ошибка отправки batch: %w", err)
	}

	return nil
}

func (c *ClickHouseDB) InsertTransactionMart(transactions []processor.TransactionData) error {
	if len(transactions) == 0 {
		return nil
	}

	batch, err := c.conn.PrepareBatch(context.Background(), "INSERT INTO transaction_mart")
	if err != nil {
		return fmt.Errorf("ошибка подготовки batch: %w", err)
	}

	for _, tx := range transactions {
		err := batch.Append(
			tx.Date,
			tx.Hour,
			tx.Currency,
			tx.TransactionCount,
			tx.TotalAmount,
			tx.AvgAmount,
			tx.MinAmount,
			tx.MaxAmount,
			tx.Status,
			tx.UpdatedAt,
		)
		if err != nil {
			return fmt.Errorf("ошибка добавления в batch: %w", err)
		}
	}

	if err := batch.Send(); err != nil {
		return fmt.Errorf("ошибка отправки batch: %w", err)
	}

	return nil
}

func (c *ClickHouseDB) InsertAccountMart(accounts []processor.AccountData) error {
	if len(accounts) == 0 {
		return nil
	}

	batch, err := c.conn.PrepareBatch(context.Background(), "INSERT INTO account_mart")
	if err != nil {
		return fmt.Errorf("ошибка подготовки batch: %w", err)
	}

	for _, acc := range accounts {
		err := batch.Append(
			acc.AccountType,
			acc.Currency,
			acc.TotalBalance,
			acc.AccountCount,
			acc.AvgBalance,
			acc.ActiveAccounts,
			acc.InactiveAccounts,
			acc.UpdatedAt,
		)
		if err != nil {
			return fmt.Errorf("ошибка добавления в batch: %w", err)
		}
	}

	if err := batch.Send(); err != nil {
		return fmt.Errorf("ошибка отправки batch: %w", err)
	}

	return nil
}

func (c *ClickHouseDB) Close() error {
	return c.conn.Close()
}
