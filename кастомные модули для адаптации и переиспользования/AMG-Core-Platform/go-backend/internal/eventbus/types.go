package eventbus

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// EventBusStatus represents the status of the event bus
type EventBusStatus string

const (
	EventBusStatusConnected    EventBusStatus = "connected"
	EventBusStatusDisconnected EventBusStatus = "disconnected"
	EventBusStatusReconnecting EventBusStatus = "reconnecting"
	EventBusStatusError        EventBusStatus = "error"
)

// Event represents a domain event
type Event struct {
	ID            uuid.UUID              `json:"id"`
	Type          string                 `json:"type"`
	AggregateID   string                 `json:"aggregate_id"`
	AggregateType string                 `json:"aggregate_type"`
	Data          map[string]interface{} `json:"data"`
	Metadata      map[string]interface{} `json:"metadata"`
	Version       int                    `json:"version"`
	Timestamp     time.Time              `json:"timestamp"`
	Source        string                 `json:"source"`
	CorrelationID string                 `json:"correlation_id"`
	CausationID   string                 `json:"causation_id"`
}

// EventBus defines the interface for event bus operations
type EventBus interface {
	Publish(ctx context.Context, event *Event) error
	PublishBatch(ctx context.Context, events []*Event) error
	Subscribe(ctx context.Context, topic string, handler EventHandler) error
	Unsubscribe(ctx context.Context, topic string, handler EventHandler) error
	Close() error
	GetStatus() EventBusStatus
}

// EventHandler defines the interface for handling events
type EventHandler interface {
	Handle(ctx context.Context, event *Event) error
	GetEventType() string
	GetAggregateType() string
	GetTopic() string
}

// EventStore defines the interface for event sourcing
type EventStore interface {
	AppendEvent(ctx context.Context, event *Event) error
	AppendEvents(ctx context.Context, events []*Event) error
	GetEvents(ctx context.Context, aggregateID string, fromVersion int) ([]*Event, error)
	GetEventsByType(ctx context.Context, eventType string, limit int) ([]*Event, error)
	GetEventsByAggregateType(ctx context.Context, aggregateType string, limit int) ([]*Event, error)
	GetEventByID(ctx context.Context, eventID uuid.UUID) (*Event, error)
}

// EventProjection defines the interface for event projections
type EventProjection interface {
	Project(ctx context.Context, event *Event) error
	GetProjectionName() string
	GetEventTypes() []string
	GetAggregateTypes() []string
}

// EventBusConfig represents configuration for the event bus
type EventBusConfig struct {
	BrokerURL     string `json:"broker_url"`
	BrokerType    string `json:"broker_type"` // kafka, rabbitmq, redis, nats
	TopicPrefix   string `json:"topic_prefix"`
	ConsumerGroup string `json:"consumer_group"`
	MaxRetries    int    `json:"max_retries"`
	RetryDelay    int    `json:"retry_delay"` // in milliseconds
	BatchSize     int    `json:"batch_size"`
	FlushInterval int    `json:"flush_interval"` // in milliseconds
	EnableTracing bool   `json:"enable_tracing"`
	EnableMetrics bool   `json:"enable_metrics"`
}

// EventBusMetrics represents metrics for the event bus
type EventBusMetrics struct {
	EventsPublished   int64 `json:"events_published"`
	EventsConsumed    int64 `json:"events_consumed"`
	EventsFailed      int64 `json:"events_failed"`
	EventsRetried     int64 `json:"events_retried"`
	PublishLatency    int64 `json:"publish_latency"` // in milliseconds
	ConsumeLatency    int64 `json:"consume_latency"` // in milliseconds
	ActiveConnections int   `json:"active_connections"`
	QueueDepth        int   `json:"queue_depth"`
}

// EventBusHealth represents health status of the event bus
type EventBusHealth struct {
	Status      EventBusStatus `json:"status"`
	LastError   string         `json:"last_error"`
	LastPing    time.Time      `json:"last_ping"`
	Uptime      time.Duration  `json:"uptime"`
	Connections int            `json:"connections"`
	Topics      []string       `json:"topics"`
}
