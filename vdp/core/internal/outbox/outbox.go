package outbox

import (
	"context"
	"sync"
	"time"

	"github.com/viletech/vdp/shared/events"
)

type Event struct {
	ID            string
	AggregateID   string
	AggregateType string
	EventType     string
	FormPaymentID string
	Payload       map[string]any
	Status        string
	RetryCount    int
	MaxRetries    int
	CreatedAt     time.Time
}

type Store interface {
	Enqueue(ctx context.Context, event Event) error
	Pending(ctx context.Context, limit int) ([]Event, error)
	MarkPublished(ctx context.Context, id string) error
	MarkFailed(ctx context.Context, id string, err error) error
}

type MemoryStore struct {
	mu     sync.Mutex
	events []Event
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{events: make([]Event, 0)}
}

func (s *MemoryStore) Enqueue(_ context.Context, event Event) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if event.Status == "" {
		event.Status = "pending"
	}
	if event.MaxRetries == 0 {
		event.MaxRetries = 3
	}
	s.events = append(s.events, event)
	return nil
}

func (s *MemoryStore) Pending(_ context.Context, limit int) ([]Event, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]Event, 0)
	for _, event := range s.events {
		if event.Status == "pending" && event.RetryCount < event.MaxRetries {
			out = append(out, event)
			if len(out) >= limit {
				break
			}
		}
	}
	return out, nil
}

func (s *MemoryStore) MarkPublished(_ context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.events {
		if s.events[i].ID == id {
			s.events[i].Status = "published"
		}
	}
	return nil
}

func (s *MemoryStore) MarkFailed(_ context.Context, id string, _ error) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.events {
		if s.events[i].ID == id {
			s.events[i].RetryCount++
			if s.events[i].RetryCount >= s.events[i].MaxRetries {
				s.events[i].Status = "failed"
			}
		}
	}
	return nil
}

func ToEnvelope(event Event) events.Envelope {
	return events.Envelope{
		EventID:       event.ID,
		EventType:     event.EventType,
		AggregateID:   event.AggregateID,
		AggregateType: event.AggregateType,
		FormPaymentID: event.FormPaymentID,
		Payload:       event.Payload,
	}
}
