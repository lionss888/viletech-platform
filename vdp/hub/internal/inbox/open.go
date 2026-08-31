package inbox

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// Open returns an inbox Store. Default driver is postgres; set STORE_DRIVER=memory for tests.
func Open(ctx context.Context, databaseURL string) (Store, error) {
	driver := strings.ToLower(os.Getenv("STORE_DRIVER"))
	if driver == "" {
		driver = "postgres"
	}
	if driver == "memory" || databaseURL == "" || strings.HasPrefix(databaseURL, "memory://") {
		return NewMemoryStore(), nil
	}
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("open inbox postgres: %w", err)
	}
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping inbox postgres: %w", err)
	}
	return NewPostgresStore(db), nil
}
