package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"

	"github.com/viletech/vdp/core/internal/repository"
)

// Open returns a Store. Default is postgres; set STORE_DRIVER=memory for in-process tests.
func Open(ctx context.Context, databaseURL string) (repository.Store, error) {
	driver := strings.ToLower(os.Getenv("STORE_DRIVER"))
	if driver == "" {
		driver = "postgres"
	}
	if driver == "memory" || databaseURL == "" || strings.HasPrefix(databaseURL, "memory://") {
		return repository.NewMemoryStore(), nil
	}
	db, err := OpenDB(ctx, databaseURL)
	if err != nil {
		return nil, err
	}
	return NewStore(db), nil
}

// OpenDB opens and pings a Postgres connection pool.
func OpenDB(ctx context.Context, databaseURL string) (*sql.DB, error) {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("open postgres: %w", err)
	}
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping postgres: %w", err)
	}
	return db, nil
}
