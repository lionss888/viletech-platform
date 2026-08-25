package outbox

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"
)

// PostgresStore persists outbox events in the core outbox_events table.
type PostgresStore struct {
	db *sql.DB
}

func NewPostgresStore(db *sql.DB) *PostgresStore {
	return &PostgresStore{db: db}
}

type eventData struct {
	FormPaymentID string         `json:"form_payment_id"`
	Payload       map[string]any `json:"payload"`
}

func (s *PostgresStore) Enqueue(ctx context.Context, event Event) error {
	if event.Status == "" {
		event.Status = "pending"
	}
	if event.MaxRetries == 0 {
		event.MaxRetries = 3
	}
	if event.CreatedAt.IsZero() {
		event.CreatedAt = time.Now().UTC()
	}
	raw, err := json.Marshal(eventData{FormPaymentID: event.FormPaymentID, Payload: event.Payload})
	if err != nil {
		return fmt.Errorf("marshal outbox payload: %w", err)
	}
	id := normalizeUUID(event.ID)
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO outbox_events (
			id, aggregate_id, aggregate_type, event_type, event_data, status, retry_count, max_retries, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
		ON CONFLICT (id) DO NOTHING`,
		id, event.AggregateID, event.AggregateType, event.EventType, raw, event.Status, event.RetryCount, event.MaxRetries, event.CreatedAt)
	if err != nil {
		return fmt.Errorf("enqueue outbox: %w", err)
	}
	return nil
}

func (s *PostgresStore) Pending(ctx context.Context, limit int) ([]Event, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT id::text, aggregate_id, aggregate_type, event_type, event_data, status, retry_count, max_retries, created_at
		FROM outbox_events
		WHERE status = 'pending' AND retry_count < max_retries
		ORDER BY created_at ASC
		LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]Event, 0)
	for rows.Next() {
		var event Event
		var raw []byte
		if err := rows.Scan(
			&event.ID, &event.AggregateID, &event.AggregateType, &event.EventType, &raw,
			&event.Status, &event.RetryCount, &event.MaxRetries, &event.CreatedAt,
		); err != nil {
			return nil, err
		}
		var data eventData
		_ = json.Unmarshal(raw, &data)
		event.FormPaymentID = data.FormPaymentID
		event.Payload = data.Payload
		if event.FormPaymentID == "" {
			event.FormPaymentID = event.AggregateID
		}
		out = append(out, event)
	}
	return out, rows.Err()
}

func (s *PostgresStore) MarkPublished(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE outbox_events
		SET status = 'published', published_at = NOW(), updated_at = NOW()
		WHERE id = $1::uuid`, normalizeUUID(id))
	return err
}

func (s *PostgresStore) MarkFailed(ctx context.Context, id string, failErr error) error {
	msg := ""
	if failErr != nil {
		msg = failErr.Error()
	}
	_, err := s.db.ExecContext(ctx, `
		UPDATE outbox_events
		SET retry_count = retry_count + 1,
			last_error = $2,
			updated_at = NOW(),
			status = CASE WHEN retry_count + 1 >= max_retries THEN 'failed' ELSE status END
		WHERE id = $1::uuid`, normalizeUUID(id), msg)
	return err
}

func normalizeUUID(id string) string {
	if len(id) == 32 {
		return id[0:8] + "-" + id[8:12] + "-" + id[12:16] + "-" + id[16:20] + "-" + id[20:32]
	}
	return id
}
