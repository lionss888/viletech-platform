package outbox

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"amg-flow-backend/pkg/logger"

	"github.com/google/uuid"
)

// EventPublisherImpl implements the EventPublisher interface
type EventPublisherImpl struct {
	repository OutboxRepository
	logger     logger.Logger
}

// NewEventPublisher creates a new event publisher
func NewEventPublisher(repository OutboxRepository, logger logger.Logger) *EventPublisherImpl {
	return &EventPublisherImpl{
		repository: repository,
		logger:     logger,
	}
}

// PublishEvent publishes a single event to the outbox
func (p *EventPublisherImpl) PublishEvent(ctx context.Context, event *OutboxEvent) error {
	p.logger.Infof("Publishing event: %s (type: %s)", event.ID, event.EventType)

	// Update event status to processing
	event.Status = EventStatusProcessing
	event.UpdatedAt = time.Now()

	if err := p.repository.UpdateEvent(ctx, event); err != nil {
		p.logger.Errorf("Failed to update event status: %v", err)
		return fmt.Errorf("failed to update event status: %w", err)
	}

	// TODO: Publish to actual event bus (Kafka, RabbitMQ, etc.)
	// For now, we'll simulate successful publishing
	p.logger.Infof("Event published successfully: %s", event.ID)

	// Mark event as published
	event.Status = EventStatusPublished
	now := time.Now()
	event.PublishedAt = &now
	event.UpdatedAt = time.Now()

	if err := p.repository.UpdateEvent(ctx, event); err != nil {
		p.logger.Errorf("Failed to mark event as published: %v", err)
		return fmt.Errorf("failed to mark event as published: %w", err)
	}

	p.logger.Infof("Event marked as published: %s", event.ID)
	return nil
}

// PublishEvents publishes multiple events to the outbox
func (p *EventPublisherImpl) PublishEvents(ctx context.Context, events []*OutboxEvent) error {
	p.logger.Infof("Publishing %d events", len(events))

	for _, event := range events {
		if err := p.PublishEvent(ctx, event); err != nil {
			p.logger.Errorf("Failed to publish event %s: %v", event.ID, err)
			return fmt.Errorf("failed to publish event %s: %v", event.ID, err)
		}
	}

	p.logger.Infof("All events published successfully")
	return nil
}

// OutboxService provides high-level outbox operations
type OutboxServiceImpl struct {
	repository OutboxRepository
	publisher  EventPublisher
	logger     logger.Logger
}

// NewOutboxService creates a new outbox service
func NewOutboxService(repository OutboxRepository, publisher EventPublisher, logger logger.Logger) *OutboxServiceImpl {
	return &OutboxServiceImpl{
		repository: repository,
		publisher:  publisher,
		logger:     logger,
	}
}

// PublishEvent creates and publishes an event to the outbox
func (s *OutboxServiceImpl) PublishEvent(ctx context.Context, aggregateID, aggregateType, eventType string, eventData interface{}) error {
	s.logger.Infof("Publishing event: aggregateID=%s, type=%s", aggregateID, eventType)

	// Serialize event data
	dataJSON, err := json.Marshal(eventData)
	if err != nil {
		s.logger.Errorf("Failed to serialize event data: %v", err)
		return fmt.Errorf("failed to serialize event data: %w", err)
	}

	// Create outbox event
	event := &OutboxEvent{
		ID:            uuid.New(),
		AggregateID:   aggregateID,
		AggregateType: aggregateType,
		EventType:     eventType,
		EventData:     string(dataJSON),
		Status:        EventStatusPending,
		RetryCount:    0,
		MaxRetries:    3,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	// Save event to outbox
	if err := s.repository.CreateEvent(ctx, event); err != nil {
		s.logger.Errorf("Failed to create outbox event: %v", err)
		return fmt.Errorf("failed to create outbox event: %w", err)
	}

	s.logger.Infof("Outbox event created successfully: %s", event.ID)
	return nil
}

// ProcessPendingEvents processes all pending events in the outbox
func (s *OutboxServiceImpl) ProcessPendingEvents(ctx context.Context) error {
	s.logger.Info("Processing pending outbox events")

	// Get pending events
	events, err := s.repository.GetPendingEvents(ctx, 100) // Process up to 100 events at a time
	if err != nil {
		s.logger.Errorf("Failed to get pending events: %v", err)
		return fmt.Errorf("failed to get pending events: %w", err)
	}

	if len(events) == 0 {
		s.logger.Info("No pending events to process")
		return nil
	}

	s.logger.Infof("Processing %d pending events", len(events))

	// Process events
	for _, event := range events {
		if err := s.processEvent(ctx, event); err != nil {
			s.logger.Errorf("Failed to process event %s: %v", event.ID, err)
			// Continue processing other events
		}
	}

	s.logger.Info("Finished processing pending events")
	return nil
}

// processEvent processes a single event
func (s *OutboxServiceImpl) processEvent(ctx context.Context, event *OutboxEvent) error {
	s.logger.Infof("Processing event: %s", event.ID)

	// Update retry count
	event.RetryCount++
	event.Status = EventStatusProcessing
	event.UpdatedAt = time.Now()

	if err := s.repository.UpdateEvent(ctx, event); err != nil {
		s.logger.Errorf("Failed to update event status: %v", err)
		return fmt.Errorf("failed to update event status: %w", err)
	}

	// Publish event
	if err := s.publisher.PublishEvent(ctx, event); err != nil {
		s.logger.Errorf("Failed to publish event: %v", err)

		// Mark event as failed
		event.Status = EventStatusFailed
		event.LastError = err.Error()
		event.UpdatedAt = time.Now()

		if updateErr := s.repository.UpdateEvent(ctx, event); updateErr != nil {
			s.logger.Errorf("Failed to update event status: %v", updateErr)
		}

		return fmt.Errorf("failed to publish event: %v", err)
	}

	s.logger.Infof("Event processed successfully: %s", event.ID)
	return nil
}

// RetryFailedEvents retries failed events that haven't exceeded max retries
func (s *OutboxServiceImpl) RetryFailedEvents(ctx context.Context) error {
	s.logger.Info("Retrying failed outbox events")

	// Get failed events
	events, err := s.repository.GetFailedEvents(ctx, 50) // Retry up to 50 events at a time
	if err != nil {
		s.logger.Errorf("Failed to get failed events: %v", err)
		return fmt.Errorf("failed to get failed events: %w", err)
	}

	if len(events) == 0 {
		s.logger.Info("No failed events to retry")
		return nil
	}

	s.logger.Infof("Retrying %d failed events", len(events))

	// Retry events
	for _, event := range events {
		if err := s.processEvent(ctx, event); err != nil {
			s.logger.Errorf("Failed to retry event %s: %v", event.ID, err)
			// Continue retrying other events
		}
	}

	s.logger.Info("Finished retrying failed events")
	return nil
}

// GetEventStatus retrieves the status of an event
func (s *OutboxServiceImpl) GetEventStatus(ctx context.Context, eventID uuid.UUID) (*OutboxEvent, error) {
	s.logger.Infof("Getting event status: %s", eventID)

	event, err := s.repository.GetEventByID(ctx, eventID)
	if err != nil {
		s.logger.Errorf("Failed to get event status: %v", err)
		return nil, fmt.Errorf("failed to get event status: %w", err)
	}

	return event, nil
}
