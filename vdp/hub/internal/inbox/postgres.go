package inbox

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/viletech/vdp/shared/events"
)

// PostgresStore persists processed inbox events for idempotent hub dispatch.
type PostgresStore struct {
	db *sql.DB
}

func NewPostgresStore(db *sql.DB) *PostgresStore {
	return &PostgresStore{db: db}
}

type storedResult struct {
	Result map[string]any `json:"result"`
}

func (s *PostgresStore) AlreadyProcessed(ctx context.Context, eventID string) (Record, bool) {
	var status string
	var raw []byte
	err := s.db.QueryRowContext(ctx, `
		SELECT status, event_data
		FROM inbox_events
		WHERE event_id = $1 OR id::text = $1
		LIMIT 1`, eventID).Scan(&status, &raw)
	if err == sql.ErrNoRows {
		return Record{}, false
	}
	if err != nil {
		return Record{}, false
	}
	if status != "processed" {
		return Record{}, false
	}
	var data storedResult
	_ = json.Unmarshal(raw, &data)
	return Record{EventID: eventID, Processed: true, Result: data.Result}, true
}

func (s *PostgresStore) MarkProcessed(ctx context.Context, env events.Envelope, result map[string]any) error {
	raw, err := json.Marshal(storedResult{Result: result})
	if err != nil {
		return fmt.Errorf("marshal inbox result: %w", err)
	}
	id := normalizeUUID(env.EventID)
	now := time.Now().UTC()
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO inbox_events (
			id, event_id, aggregate_id, aggregate_type, event_type, event_data, status, processed_at, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,'processed',$7,$7,$7)
		ON CONFLICT (event_id) DO UPDATE SET
			status = 'processed',
			event_data = EXCLUDED.event_data,
			processed_at = EXCLUDED.processed_at,
			updated_at = EXCLUDED.updated_at`,
		id, env.EventID, nullOr(env.AggregateID, env.FormPaymentID), nullOr(env.AggregateType, "form_payment"),
		env.EventType, raw, now)
	if err != nil {
		return fmt.Errorf("mark inbox processed: %w", err)
	}
	return nil
}

func nullOr(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}

// normalizeUUID turns a 32-char hex id into dashed UUID form for Postgres uuid columns.
func normalizeUUID(id string) string {
	if len(id) == 32 {
		return id[0:8] + "-" + id[8:12] + "-" + id[12:16] + "-" + id[16:20] + "-" + id[20:32]
	}
	return id
}
