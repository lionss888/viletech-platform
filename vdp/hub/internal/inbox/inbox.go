package inbox

import (
	"context"
	"sync"

	"github.com/viletech/vdp/shared/events"
)

type Record struct {
	EventID   string
	Processed bool
	Result    map[string]any
}

// Store is the idempotent inbox boundary for hub event processing.
type Store interface {
	AlreadyProcessed(ctx context.Context, eventID string) (Record, bool)
	MarkProcessed(ctx context.Context, env events.Envelope, result map[string]any) error
}

// MemoryStore is an in-process Store used for tests and STORE_DRIVER=memory.
type MemoryStore struct {
	mu      sync.Mutex
	records map[string]Record
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{records: map[string]Record{}}
}

// NewStore keeps backward-compatible constructor for tests.
func NewStore() *MemoryStore { return NewMemoryStore() }

func (s *MemoryStore) AlreadyProcessed(_ context.Context, eventID string) (Record, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rec, ok := s.records[eventID]
	return rec, ok && rec.Processed
}

func (s *MemoryStore) MarkProcessed(_ context.Context, env events.Envelope, result map[string]any) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.records[env.EventID] = Record{EventID: env.EventID, Processed: true, Result: result}
	return nil
}
