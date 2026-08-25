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

type Store struct {
	mu      sync.Mutex
	records map[string]Record
}

func NewStore() *Store {
	return &Store{records: map[string]Record{}}
}

func (s *Store) AlreadyProcessed(_ context.Context, eventID string) (Record, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rec, ok := s.records[eventID]
	return rec, ok && rec.Processed
}

func (s *Store) MarkProcessed(_ context.Context, env events.Envelope, result map[string]any) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.records[env.EventID] = Record{EventID: env.EventID, Processed: true, Result: result}
}
