package outbox

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// EventStatus represents the status of an outbox event
type EventStatus string

const (
	EventStatusPending    EventStatus = "pending"
	EventStatusProcessing EventStatus = "processing"
	EventStatusPublished  EventStatus = "published"
	EventStatusFailed     EventStatus = "failed"
	EventStatusRetrying   EventStatus = "retrying"
)

// OutboxEvent represents an event in the outbox table
type OutboxEvent struct {
	ID            uuid.UUID   `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	AggregateID   string      `json:"aggregate_id" gorm:"not null;index"`
	AggregateType string      `json:"aggregate_type" gorm:"not null;index"`
	EventType     string      `json:"event_type" gorm:"not null;index"`
	EventData     string      `json:"event_data" gorm:"type:jsonb;not null"`
	Status        EventStatus `json:"status" gorm:"default:'pending'"`
	RetryCount    int         `json:"retry_count" gorm:"default:0"`
	MaxRetries    int         `json:"max_retries" gorm:"default:3"`
	LastError     string      `json:"last_error"`
	PublishedAt   *time.Time  `json:"published_at"`
	CreatedAt     time.Time   `json:"created_at"`
	UpdatedAt     time.Time   `json:"updated_at"`
}

// InboxEvent represents an event in the inbox table
type InboxEvent struct {
	ID            uuid.UUID   `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	AggregateID   string      `json:"aggregate_id" gorm:"not null;index"`
	AggregateType string      `json:"aggregate_type" gorm:"not null;index"`
	EventType     string      `json:"event_type" gorm:"not null;index"`
	EventData     string      `json:"event_data" gorm:"type:jsonb;not null"`
	Status        EventStatus `json:"status" gorm:"default:'pending'"`
	ProcessedAt   *time.Time  `json:"processed_at"`
	CreatedAt     time.Time   `json:"created_at"`
	UpdatedAt     time.Time   `json:"updated_at"`
}

// EventPublisher defines the interface for publishing events
type EventPublisher interface {
	PublishEvent(ctx context.Context, event *OutboxEvent) error
	PublishEvents(ctx context.Context, events []*OutboxEvent) error
}

// EventProcessor defines the interface for processing inbox events
type EventProcessor interface {
	ProcessEvent(ctx context.Context, event *InboxEvent) error
	ProcessEvents(ctx context.Context, events []*InboxEvent) error
	RegisterHandler(handler EventHandler) error
}

// OutboxRepository defines the interface for outbox persistence
type OutboxRepository interface {
	CreateEvent(ctx context.Context, event *OutboxEvent) error
	UpdateEvent(ctx context.Context, event *OutboxEvent) error
	GetPendingEvents(ctx context.Context, limit int) ([]*OutboxEvent, error)
	GetEventByID(ctx context.Context, eventID uuid.UUID) (*OutboxEvent, error)
	DeleteEvent(ctx context.Context, eventID uuid.UUID) error
	GetFailedEvents(ctx context.Context, limit int) ([]*OutboxEvent, error)
	GetEventsByStatus(ctx context.Context, status EventStatus, limit int) ([]*OutboxEvent, error)
}

// InboxRepository defines the interface for inbox persistence
type InboxRepository interface {
	CreateEvent(ctx context.Context, event *InboxEvent) error
	UpdateEvent(ctx context.Context, event *InboxEvent) error
	GetPendingEvents(ctx context.Context, limit int) ([]*InboxEvent, error)
	GetEventByID(ctx context.Context, eventID uuid.UUID) (*InboxEvent, error)
	DeleteEvent(ctx context.Context, eventID uuid.UUID) error
	GetEventsByStatus(ctx context.Context, status EventStatus, limit int) ([]*InboxEvent, error)
}

// EventHandler defines the interface for handling specific event types
type EventHandler interface {
	HandleEvent(ctx context.Context, event *InboxEvent) error
	GetEventType() string
	GetAggregateType() string
}

// OutboxService provides high-level outbox operations
type OutboxService interface {
	PublishEvent(ctx context.Context, aggregateID, aggregateType, eventType string, eventData interface{}) error
	ProcessPendingEvents(ctx context.Context) error
	RetryFailedEvents(ctx context.Context) error
	GetEventStatus(ctx context.Context, eventID uuid.UUID) (*OutboxEvent, error)
}

// InboxService provides high-level inbox operations
type InboxService interface {
	ProcessInboxEvents(ctx context.Context) error
	RegisterHandler(handler EventHandler) error
	GetEventStatus(ctx context.Context, eventID uuid.UUID) (*InboxEvent, error)
}
