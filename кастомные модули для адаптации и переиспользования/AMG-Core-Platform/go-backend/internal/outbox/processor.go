package outbox

import (
	"context"
	"fmt"
	"time"

	"amg-flow-backend/pkg/logger"

	"github.com/google/uuid"
)

// EventProcessorImpl implements the EventProcessor interface
type EventProcessorImpl struct {
	repository InboxRepository
	handlers   map[string]EventHandler
	logger     logger.Logger
}

// NewEventProcessor creates a new event processor
func NewEventProcessor(repository InboxRepository, logger logger.Logger) *EventProcessorImpl {
	return &EventProcessorImpl{
		repository: repository,
		handlers:   make(map[string]EventHandler),
		logger:     logger,
	}
}

// RegisterHandler registers an event handler
func (p *EventProcessorImpl) RegisterHandler(handler EventHandler) error {
	key := fmt.Sprintf("%s:%s", handler.GetAggregateType(), handler.GetEventType())
	p.handlers[key] = handler
	p.logger.Infof("Registered event handler: %s", key)
	return nil
}

// GetHandlers returns all registered handlers
func (p *EventProcessorImpl) GetHandlers() map[string]EventHandler {
	return p.handlers
}

// ProcessEvent processes a single inbox event
func (p *EventProcessorImpl) ProcessEvent(ctx context.Context, event *InboxEvent) error {
	p.logger.Infof("Processing inbox event: %s (type: %s)", event.ID, event.EventType)

	// Update event status to processing
	event.Status = EventStatusProcessing
	event.UpdatedAt = time.Now()

	if err := p.repository.UpdateEvent(ctx, event); err != nil {
		p.logger.Errorf("Failed to update event status: %v", err)
		return fmt.Errorf("failed to update event status: %w", err)
	}

	// Find handler for this event
	key := fmt.Sprintf("%s:%s", event.AggregateType, event.EventType)
	handler, exists := p.handlers[key]
	if !exists {
		p.logger.Warnf("No handler found for event type: %s", key)
		// Mark as processed even if no handler
		event.Status = EventStatusPublished
		now := time.Now()
		event.ProcessedAt = &now
		event.UpdatedAt = time.Now()

		if err := p.repository.UpdateEvent(ctx, event); err != nil {
			p.logger.Errorf("Failed to update event status: %v", err)
		}
		return nil
	}

	// Process event with handler
	if err := handler.HandleEvent(ctx, event); err != nil {
		p.logger.Errorf("Failed to handle event: %v", err)

		// Mark event as failed
		event.Status = EventStatusFailed
		event.UpdatedAt = time.Now()

		if updateErr := p.repository.UpdateEvent(ctx, event); updateErr != nil {
			p.logger.Errorf("Failed to update event status: %v", updateErr)
		}

		return fmt.Errorf("failed to handle event: %w", err)
	}

	// Mark event as processed
	event.Status = EventStatusPublished
	now := time.Now()
	event.ProcessedAt = &now
	event.UpdatedAt = time.Now()

	if err := p.repository.UpdateEvent(ctx, event); err != nil {
		p.logger.Errorf("Failed to mark event as processed: %v", err)
		return fmt.Errorf("failed to mark event as processed: %w", err)
	}

	p.logger.Infof("Event processed successfully: %s", event.ID)
	return nil
}

// ProcessEvents processes multiple inbox events
func (p *EventProcessorImpl) ProcessEvents(ctx context.Context, events []*InboxEvent) error {
	p.logger.Infof("Processing %d inbox events", len(events))

	for _, event := range events {
		if err := p.ProcessEvent(ctx, event); err != nil {
			p.logger.Errorf("Failed to process event %s: %v", event.ID, err)
			// Continue processing other events
		}
	}

	p.logger.Info("Finished processing inbox events")
	return nil
}

// InboxService provides high-level inbox operations
type InboxServiceImpl struct {
	repository InboxRepository
	processor  EventProcessor
	logger     logger.Logger
}

// NewInboxService creates a new inbox service
func NewInboxService(repository InboxRepository, processor EventProcessor, logger logger.Logger) *InboxServiceImpl {
	return &InboxServiceImpl{
		repository: repository,
		processor:  processor,
		logger:     logger,
	}
}

// ProcessInboxEvents processes all pending events in the inbox
func (s *InboxServiceImpl) ProcessInboxEvents(ctx context.Context) error {
	s.logger.Info("Processing pending inbox events")

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
	if err := s.processor.ProcessEvents(ctx, events); err != nil {
		s.logger.Errorf("Failed to process events: %v", err)
		return fmt.Errorf("failed to process events: %w", err)
	}

	s.logger.Info("Finished processing inbox events")
	return nil
}

// RegisterHandler registers an event handler
func (s *InboxServiceImpl) RegisterHandler(handler EventHandler) error {
	s.logger.Infof("Registering event handler: %s:%s", handler.GetAggregateType(), handler.GetEventType())

	if err := s.processor.RegisterHandler(handler); err != nil {
		s.logger.Errorf("Failed to register handler: %v", err)
		return fmt.Errorf("failed to register handler: %w", err)
	}

	s.logger.Infof("Event handler registered successfully")
	return nil
}

// GetEventStatus retrieves the status of an inbox event
func (s *InboxServiceImpl) GetEventStatus(ctx context.Context, eventID uuid.UUID) (*InboxEvent, error) {
	s.logger.Infof("Getting inbox event status: %s", eventID)

	event, err := s.repository.GetEventByID(ctx, eventID)
	if err != nil {
		s.logger.Errorf("Failed to get event status: %v", err)
		return nil, fmt.Errorf("failed to get event status: %w", err)
	}

	return event, nil
}
