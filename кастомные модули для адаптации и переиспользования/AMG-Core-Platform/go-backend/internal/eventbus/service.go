package eventbus

import (
	"context"
	"fmt"
	"time"

	"amg-flow-backend/pkg/logger"

	"github.com/google/uuid"
)

// EventBusService provides a unified service for event bus operations
type EventBusService struct {
	eventBus    EventBus
	eventStore  EventStore
	projections []EventProjection
	logger      logger.Logger
}

// NewEventBusService creates a new event bus service
func NewEventBusService(eventBus EventBus, eventStore EventStore, logger logger.Logger) *EventBusService {
	return &EventBusService{
		eventBus:    eventBus,
		eventStore:  eventStore,
		projections: make([]EventProjection, 0),
		logger:      logger,
	}
}

// RegisterProjection registers an event projection
func (s *EventBusService) RegisterProjection(projection EventProjection) {
	s.logger.Infof("Registering projection: %s", projection.GetProjectionName())
	s.projections = append(s.projections, projection)
}

// PublishEvent publishes a single event
func (s *EventBusService) PublishEvent(ctx context.Context, event *Event) error {
	s.logger.Infof("Publishing event: %s (type: %s)", event.ID, event.Type)

	// Store event in event store
	if err := s.eventStore.AppendEvent(ctx, event); err != nil {
		s.logger.Errorf("Failed to store event: %v", err)
		return fmt.Errorf("failed to store event: %w", err)
	}

	// Publish event to event bus
	if err := s.eventBus.Publish(ctx, event); err != nil {
		s.logger.Errorf("Failed to publish event: %v", err)
		return fmt.Errorf("failed to publish event: %w", err)
	}

	// Project event to read models
	if err := s.projectEvent(ctx, event); err != nil {
		s.logger.Errorf("Failed to project event: %v", err)
		return fmt.Errorf("failed to project event: %w", err)
	}

	s.logger.Infof("Event published successfully: %s", event.ID)
	return nil
}

// PublishEvents publishes multiple events
func (s *EventBusService) PublishEvents(ctx context.Context, events []*Event) error {
	s.logger.Infof("Publishing %d events", len(events))

	// Store events in event store
	if err := s.eventStore.AppendEvents(ctx, events); err != nil {
		s.logger.Errorf("Failed to store events: %v", err)
		return fmt.Errorf("failed to store events: %w", err)
	}

	// Publish events to event bus
	if err := s.eventBus.PublishBatch(ctx, events); err != nil {
		s.logger.Errorf("Failed to publish events: %v", err)
		return fmt.Errorf("failed to publish events: %w", err)
	}

	// Project events to read models
	for _, event := range events {
		if err := s.projectEvent(ctx, event); err != nil {
			s.logger.Errorf("Failed to project event: %v", err)
			return fmt.Errorf("failed to project event: %w", err)
		}
	}

	s.logger.Infof("All events published successfully: %d events", len(events))
	return nil
}

// SubscribeToTopic subscribes to a topic with a handler
func (s *EventBusService) SubscribeToTopic(ctx context.Context, topic string, handler EventHandler) error {
	s.logger.Infof("Subscribing to topic: %s", topic)

	if err := s.eventBus.Subscribe(ctx, topic, handler); err != nil {
		s.logger.Errorf("Failed to subscribe to topic: %v", err)
		return fmt.Errorf("failed to subscribe to topic: %w", err)
	}

	s.logger.Infof("Subscribed to topic successfully: %s", topic)
	return nil
}

// UnsubscribeFromTopic unsubscribes from a topic
func (s *EventBusService) UnsubscribeFromTopic(ctx context.Context, topic string, handler EventHandler) error {
	s.logger.Infof("Unsubscribing from topic: %s", topic)

	if err := s.eventBus.Unsubscribe(ctx, topic, handler); err != nil {
		s.logger.Errorf("Failed to unsubscribe from topic: %v", err)
		return fmt.Errorf("failed to unsubscribe from topic: %w", err)
	}

	s.logger.Infof("Unsubscribed from topic successfully: %s", topic)
	return nil
}

// GetEvents retrieves events for an aggregate
func (s *EventBusService) GetEvents(ctx context.Context, aggregateID string, fromVersion int) ([]*Event, error) {
	s.logger.Infof("Getting events for aggregate: %s from version: %d", aggregateID, fromVersion)

	events, err := s.eventStore.GetEvents(ctx, aggregateID, fromVersion)
	if err != nil {
		s.logger.Errorf("Failed to get events: %v", err)
		return nil, fmt.Errorf("failed to get events: %w", err)
	}

	s.logger.Infof("Retrieved %d events for aggregate: %s", len(events), aggregateID)
	return events, nil
}

// GetEventsByType retrieves events by type
func (s *EventBusService) GetEventsByType(ctx context.Context, eventType string, limit int) ([]*Event, error) {
	s.logger.Infof("Getting events by type: %s (limit: %d)", eventType, limit)

	events, err := s.eventStore.GetEventsByType(ctx, eventType, limit)
	if err != nil {
		s.logger.Errorf("Failed to get events by type: %v", err)
		return nil, fmt.Errorf("failed to get events by type: %w", err)
	}

	s.logger.Infof("Retrieved %d events of type: %s", len(events), eventType)
	return events, nil
}

// GetEventsByAggregateType retrieves events by aggregate type
func (s *EventBusService) GetEventsByAggregateType(ctx context.Context, aggregateType string, limit int) ([]*Event, error) {
	s.logger.Infof("Getting events by aggregate type: %s (limit: %d)", aggregateType, limit)

	events, err := s.eventStore.GetEventsByAggregateType(ctx, aggregateType, limit)
	if err != nil {
		s.logger.Errorf("Failed to get events by aggregate type: %v", err)
		return nil, fmt.Errorf("failed to get events by aggregate type: %w", err)
	}

	s.logger.Infof("Retrieved %d events of aggregate type: %s", len(events), aggregateType)
	return events, nil
}

// GetEventByID retrieves a specific event by ID
func (s *EventBusService) GetEventByID(ctx context.Context, eventID uuid.UUID) (*Event, error) {
	s.logger.Infof("Getting event by ID: %s", eventID)

	event, err := s.eventStore.GetEventByID(ctx, eventID)
	if err != nil {
		s.logger.Errorf("Failed to get event by ID: %v", err)
		return nil, fmt.Errorf("failed to get event by ID: %w", err)
	}

	s.logger.Infof("Retrieved event by ID: %s", eventID)
	return event, nil
}

// Close closes the event bus service
func (s *EventBusService) Close() error {
	s.logger.Info("Closing event bus service")

	if err := s.eventBus.Close(); err != nil {
		s.logger.Errorf("Failed to close event bus: %v", err)
		return fmt.Errorf("failed to close event bus: %w", err)
	}

	s.logger.Info("Event bus service closed")
	return nil
}

// GetStatus returns the current status of the event bus
func (s *EventBusService) GetStatus() EventBusStatus {
	return s.eventBus.GetStatus()
}

// projectEvent projects an event to read models
func (s *EventBusService) projectEvent(ctx context.Context, event *Event) error {
	s.logger.Infof("Projecting event: %s (type: %s)", event.ID, event.Type)

	for _, projection := range s.projections {
		// Check if projection handles this event type
		eventTypes := projection.GetEventTypes()
		handlesEvent := false
		for _, eventType := range eventTypes {
			if eventType == event.Type {
				handlesEvent = true
				break
			}
		}

		if !handlesEvent {
			continue
		}

		// Check if projection handles this aggregate type
		aggregateTypes := projection.GetAggregateTypes()
		handlesAggregate := false
		for _, aggregateType := range aggregateTypes {
			if aggregateType == event.AggregateType {
				handlesAggregate = true
				break
			}
		}

		if !handlesAggregate {
			continue
		}

		// Project the event
		if err := projection.Project(ctx, event); err != nil {
			s.logger.Errorf("Failed to project event with projection %s: %v", projection.GetProjectionName(), err)
			return fmt.Errorf("failed to project event with projection %s: %w", projection.GetProjectionName(), err)
		}
	}

	s.logger.Infof("Event projected successfully: %s", event.ID)
	return nil
}

// CreateEvent creates a new event with proper metadata
func (s *EventBusService) CreateEvent(eventType, aggregateID, aggregateType, source string, data map[string]interface{}) *Event {
	return &Event{
		ID:            uuid.New(),
		Type:          eventType,
		AggregateID:   aggregateID,
		AggregateType: aggregateType,
		Data:          data,
		Metadata:      make(map[string]interface{}),
		Version:       1,
		Timestamp:     time.Now(),
		Source:        source,
		CorrelationID: uuid.New().String(),
		CausationID:   uuid.New().String(),
	}
}

// CreateEventWithCorrelation creates a new event with correlation and causation IDs
func (s *EventBusService) CreateEventWithCorrelation(eventType, aggregateID, aggregateType, source, correlationID, causationID string, data map[string]interface{}) *Event {
	return &Event{
		ID:            uuid.New(),
		Type:          eventType,
		AggregateID:   aggregateID,
		AggregateType: aggregateType,
		Data:          data,
		Metadata:      make(map[string]interface{}),
		Version:       1,
		Timestamp:     time.Now(),
		Source:        source,
		CorrelationID: correlationID,
		CausationID:   causationID,
	}
}
