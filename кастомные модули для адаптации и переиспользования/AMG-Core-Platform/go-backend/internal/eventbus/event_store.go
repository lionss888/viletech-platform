package eventbus

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"amg-flow-backend/pkg/logger"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// EventStoreImpl implements EventStore using GORM
type EventStoreImpl struct {
	db     *gorm.DB
	logger logger.Logger
}

// EventStoreEvent represents an event in the event store
type EventStoreEvent struct {
	ID            uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Type          string    `json:"type" gorm:"not null;index"`
	AggregateID   string    `json:"aggregate_id" gorm:"not null;index"`
	AggregateType string    `json:"aggregate_type" gorm:"not null;index"`
	Data          string    `json:"data" gorm:"type:jsonb;not null"`
	Metadata      string    `json:"metadata" gorm:"type:jsonb"`
	Version       int       `json:"version" gorm:"not null"`
	Timestamp     time.Time `json:"timestamp" gorm:"not null;index"`
	Source        string    `json:"source" gorm:"not null"`
	CorrelationID string    `json:"correlation_id" gorm:"index"`
	CausationID   string    `json:"causation_id" gorm:"index"`
	CreatedAt     time.Time `json:"created_at"`
}

// NewEventStore creates a new event store
func NewEventStore(db *gorm.DB, logger logger.Logger) *EventStoreImpl {
	return &EventStoreImpl{
		db:     db,
		logger: logger,
	}
}

// AppendEvent appends a single event to the store
func (s *EventStoreImpl) AppendEvent(ctx context.Context, event *Event) error {
	s.logger.Infof("Appending event to store: %s (type: %s)", event.ID, event.Type)

	// Serialize event data
	dataJSON, err := json.Marshal(event.Data)
	if err != nil {
		s.logger.Errorf("Failed to serialize event data: %v", err)
		return fmt.Errorf("failed to serialize event data: %w", err)
	}

	metadataJSON, err := json.Marshal(event.Metadata)
	if err != nil {
		s.logger.Errorf("Failed to serialize event metadata: %v", err)
		return fmt.Errorf("failed to serialize event metadata: %w", err)
	}

	// Create store event
	storeEvent := &EventStoreEvent{
		ID:            event.ID,
		Type:          event.Type,
		AggregateID:   event.AggregateID,
		AggregateType: event.AggregateType,
		Data:          string(dataJSON),
		Metadata:      string(metadataJSON),
		Version:       event.Version,
		Timestamp:     event.Timestamp,
		Source:        event.Source,
		CorrelationID: event.CorrelationID,
		CausationID:   event.CausationID,
		CreatedAt:     time.Now(),
	}

	// Save to database
	if err := s.db.WithContext(ctx).Create(storeEvent).Error; err != nil {
		s.logger.Errorf("Failed to append event to store: %v", err)
		return fmt.Errorf("failed to append event to store: %w", err)
	}

	s.logger.Infof("Event appended to store successfully: %s", event.ID)
	return nil
}

// AppendEvents appends multiple events to the store
func (s *EventStoreImpl) AppendEvents(ctx context.Context, events []*Event) error {
	s.logger.Infof("Appending %d events to store", len(events))

	for _, event := range events {
		if err := s.AppendEvent(ctx, event); err != nil {
			s.logger.Errorf("Failed to append event: %v", err)
			return fmt.Errorf("failed to append event: %w", err)
		}
	}

	s.logger.Infof("All events appended to store successfully")
	return nil
}

// GetEvents retrieves events for an aggregate
func (s *EventStoreImpl) GetEvents(ctx context.Context, aggregateID string, fromVersion int) ([]*Event, error) {
	s.logger.Infof("Getting events for aggregate: %s from version: %d", aggregateID, fromVersion)

	var storeEvents []*EventStoreEvent
	if err := s.db.WithContext(ctx).
		Where("aggregate_id = ? AND version >= ?", aggregateID, fromVersion).
		Order("version ASC").
		Find(&storeEvents).Error; err != nil {
		s.logger.Errorf("Failed to get events: %v", err)
		return nil, fmt.Errorf("failed to get events: %w", err)
	}

	// Convert to domain events
	events := make([]*Event, len(storeEvents))
	for i, storeEvent := range storeEvents {
		event, err := s.convertStoreEventToEvent(storeEvent)
		if err != nil {
			s.logger.Errorf("Failed to convert store event: %v", err)
			return nil, fmt.Errorf("failed to convert store event: %w", err)
		}
		events[i] = event
	}

	s.logger.Infof("Retrieved %d events for aggregate: %s", len(events), aggregateID)
	return events, nil
}

// GetEventsByType retrieves events by type
func (s *EventStoreImpl) GetEventsByType(ctx context.Context, eventType string, limit int) ([]*Event, error) {
	s.logger.Infof("Getting events by type: %s (limit: %d)", eventType, limit)

	var storeEvents []*EventStoreEvent
	query := s.db.WithContext(ctx).Where("type = ?", eventType).Order("timestamp DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&storeEvents).Error; err != nil {
		s.logger.Errorf("Failed to get events by type: %v", err)
		return nil, fmt.Errorf("failed to get events by type: %w", err)
	}

	// Convert to domain events
	events := make([]*Event, len(storeEvents))
	for i, storeEvent := range storeEvents {
		event, err := s.convertStoreEventToEvent(storeEvent)
		if err != nil {
			s.logger.Errorf("Failed to convert store event: %v", err)
			return nil, fmt.Errorf("failed to convert store event: %w", err)
		}
		events[i] = event
	}

	s.logger.Infof("Retrieved %d events of type: %s", len(events), eventType)
	return events, nil
}

// GetEventsByAggregateType retrieves events by aggregate type
func (s *EventStoreImpl) GetEventsByAggregateType(ctx context.Context, aggregateType string, limit int) ([]*Event, error) {
	s.logger.Infof("Getting events by aggregate type: %s (limit: %d)", aggregateType, limit)

	var storeEvents []*EventStoreEvent
	query := s.db.WithContext(ctx).Where("aggregate_type = ?", aggregateType).Order("timestamp DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&storeEvents).Error; err != nil {
		s.logger.Errorf("Failed to get events by aggregate type: %v", err)
		return nil, fmt.Errorf("failed to get events by aggregate type: %w", err)
	}

	// Convert to domain events
	events := make([]*Event, len(storeEvents))
	for i, storeEvent := range storeEvents {
		event, err := s.convertStoreEventToEvent(storeEvent)
		if err != nil {
			s.logger.Errorf("Failed to convert store event: %v", err)
			return nil, fmt.Errorf("failed to convert store event: %w", err)
		}
		events[i] = event
	}

	s.logger.Infof("Retrieved %d events of aggregate type: %s", len(events), aggregateType)
	return events, nil
}

// GetEventByID retrieves a specific event by ID
func (s *EventStoreImpl) GetEventByID(ctx context.Context, eventID uuid.UUID) (*Event, error) {
	s.logger.Infof("Getting event by ID: %s", eventID)

	var storeEvent EventStoreEvent
	if err := s.db.WithContext(ctx).Where("id = ?", eventID).First(&storeEvent).Error; err != nil {
		s.logger.Errorf("Failed to get event by ID: %v", err)
		return nil, fmt.Errorf("failed to get event by ID: %w", err)
	}

	event, err := s.convertStoreEventToEvent(&storeEvent)
	if err != nil {
		s.logger.Errorf("Failed to convert store event: %v", err)
		return nil, fmt.Errorf("failed to convert store event: %w", err)
	}

	s.logger.Infof("Retrieved event by ID: %s", eventID)
	return event, nil
}

// convertStoreEventToEvent converts a store event to a domain event
func (s *EventStoreImpl) convertStoreEventToEvent(storeEvent *EventStoreEvent) (*Event, error) {
	// Deserialize data
	var data map[string]interface{}
	if err := json.Unmarshal([]byte(storeEvent.Data), &data); err != nil {
		return nil, fmt.Errorf("failed to deserialize event data: %w", err)
	}

	// Deserialize metadata
	var metadata map[string]interface{}
	if err := json.Unmarshal([]byte(storeEvent.Metadata), &metadata); err != nil {
		return nil, fmt.Errorf("failed to deserialize event metadata: %w", err)
	}

	return &Event{
		ID:            storeEvent.ID,
		Type:          storeEvent.Type,
		AggregateID:   storeEvent.AggregateID,
		AggregateType: storeEvent.AggregateType,
		Data:          data,
		Metadata:      metadata,
		Version:       storeEvent.Version,
		Timestamp:     storeEvent.Timestamp,
		Source:        storeEvent.Source,
		CorrelationID: storeEvent.CorrelationID,
		CausationID:   storeEvent.CausationID,
	}, nil
}
