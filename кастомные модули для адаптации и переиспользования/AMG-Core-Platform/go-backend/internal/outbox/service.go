package outbox

import (
	"context"
	"fmt"
	"time"

	"amg-flow-backend/pkg/logger"
)

// OutboxInboxService provides unified outbox and inbox operations
type OutboxInboxService struct {
	outboxService OutboxService
	inboxService  InboxService
	logger        logger.Logger
}

// NewOutboxInboxService creates a new unified service
func NewOutboxInboxService(outboxService OutboxService, inboxService InboxService, logger logger.Logger) *OutboxInboxService {
	return &OutboxInboxService{
		outboxService: outboxService,
		inboxService:  inboxService,
		logger:        logger,
	}
}

// PublishEvent publishes an event to the outbox
func (s *OutboxInboxService) PublishEvent(ctx context.Context, aggregateID, aggregateType, eventType string, eventData interface{}) error {
	s.logger.Infof("Publishing event: aggregateID=%s, type=%s", aggregateID, eventType)

	if err := s.outboxService.PublishEvent(ctx, aggregateID, aggregateType, eventType, eventData); err != nil {
		s.logger.Errorf("Failed to publish event: %v", err)
		return fmt.Errorf("failed to publish event: %w", err)
	}

	s.logger.Infof("Event published successfully: %s", aggregateID)
	return nil
}

// ProcessOutboxEvents processes all pending outbox events
func (s *OutboxInboxService) ProcessOutboxEvents(ctx context.Context) error {
	s.logger.Info("Processing outbox events")

	if err := s.outboxService.ProcessPendingEvents(ctx); err != nil {
		s.logger.Errorf("Failed to process outbox events: %v", err)
		return fmt.Errorf("failed to process outbox events: %w", err)
	}

	s.logger.Info("Outbox events processed successfully")
	return nil
}

// ProcessInboxEvents processes all pending inbox events
func (s *OutboxInboxService) ProcessInboxEvents(ctx context.Context) error {
	s.logger.Info("Processing inbox events")

	if err := s.inboxService.ProcessInboxEvents(ctx); err != nil {
		s.logger.Errorf("Failed to process inbox events: %v", err)
		return fmt.Errorf("failed to process inbox events: %w", err)
	}

	s.logger.Info("Inbox events processed successfully")
	return nil
}

// RetryFailedEvents retries failed outbox events
func (s *OutboxInboxService) RetryFailedEvents(ctx context.Context) error {
	s.logger.Info("Retrying failed events")

	if err := s.outboxService.RetryFailedEvents(ctx); err != nil {
		s.logger.Errorf("Failed to retry failed events: %v", err)
		return fmt.Errorf("failed to retry failed events: %w", err)
	}

	s.logger.Info("Failed events retried successfully")
	return nil
}

// RegisterEventHandler registers an event handler for inbox events
func (s *OutboxInboxService) RegisterEventHandler(handler EventHandler) error {
	s.logger.Infof("Registering event handler: %s:%s", handler.GetAggregateType(), handler.GetEventType())

	if err := s.inboxService.RegisterHandler(handler); err != nil {
		s.logger.Errorf("Failed to register event handler: %v", err)
		return fmt.Errorf("failed to register event handler: %w", err)
	}

	s.logger.Infof("Event handler registered successfully")
	return nil
}

// SagaEventPublisher publishes events from Saga operations
type SagaEventPublisher struct {
	outboxService OutboxService
	logger        logger.Logger
}

// NewSagaEventPublisher creates a new saga event publisher
func NewSagaEventPublisher(outboxService OutboxService, logger logger.Logger) *SagaEventPublisher {
	return &SagaEventPublisher{
		outboxService: outboxService,
		logger:        logger,
	}
}

// PublishSagaStarted publishes a saga started event
func (p *SagaEventPublisher) PublishSagaStarted(ctx context.Context, sagaID, sagaType, correlationID string, sagaData interface{}) error {
	p.logger.Infof("Publishing saga started event: %s", sagaID)

	eventData := map[string]interface{}{
		"saga_id":        sagaID,
		"saga_type":      sagaType,
		"correlation_id": correlationID,
		"saga_data":      sagaData,
		"timestamp":      time.Now(),
	}

	if err := p.outboxService.PublishEvent(ctx, sagaID, "saga", "saga_started", eventData); err != nil {
		p.logger.Errorf("Failed to publish saga started event: %v", err)
		return fmt.Errorf("failed to publish saga started event: %w", err)
	}

	p.logger.Infof("Saga started event published successfully: %s", sagaID)
	return nil
}

// PublishSagaCompleted publishes a saga completed event
func (p *SagaEventPublisher) PublishSagaCompleted(ctx context.Context, sagaID, sagaType, correlationID string, result interface{}) error {
	p.logger.Infof("Publishing saga completed event: %s", sagaID)

	eventData := map[string]interface{}{
		"saga_id":        sagaID,
		"saga_type":      sagaType,
		"correlation_id": correlationID,
		"result":         result,
		"timestamp":      time.Now(),
	}

	if err := p.outboxService.PublishEvent(ctx, sagaID, "saga", "saga_completed", eventData); err != nil {
		p.logger.Errorf("Failed to publish saga completed event: %v", err)
		return fmt.Errorf("failed to publish saga completed event: %w", err)
	}

	p.logger.Infof("Saga completed event published successfully: %s", sagaID)
	return nil
}

// PublishSagaFailed publishes a saga failed event
func (p *SagaEventPublisher) PublishSagaFailed(ctx context.Context, sagaID, sagaType, correlationID, errorMessage string) error {
	p.logger.Infof("Publishing saga failed event: %s", sagaID)

	eventData := map[string]interface{}{
		"saga_id":        sagaID,
		"saga_type":      sagaType,
		"correlation_id": correlationID,
		"error_message":  errorMessage,
		"timestamp":      time.Now(),
	}

	if err := p.outboxService.PublishEvent(ctx, sagaID, "saga", "saga_failed", eventData); err != nil {
		p.logger.Errorf("Failed to publish saga failed event: %v", err)
		return fmt.Errorf("failed to publish saga failed event: %w", err)
	}

	p.logger.Infof("Saga failed event published successfully: %s", sagaID)
	return nil
}

// PublishSagaStepCompleted publishes a saga step completed event
func (p *SagaEventPublisher) PublishSagaStepCompleted(ctx context.Context, sagaID, stepName string, stepData interface{}) error {
	p.logger.Infof("Publishing saga step completed event: %s - %s", sagaID, stepName)

	eventData := map[string]interface{}{
		"saga_id":   sagaID,
		"step_name": stepName,
		"step_data": stepData,
		"timestamp": time.Now(),
	}

	if err := p.outboxService.PublishEvent(ctx, sagaID, "saga_step", "saga_step_completed", eventData); err != nil {
		p.logger.Errorf("Failed to publish saga step completed event: %v", err)
		return fmt.Errorf("failed to publish saga step completed event: %w", err)
	}

	p.logger.Infof("Saga step completed event published successfully: %s - %s", sagaID, stepName)
	return nil
}

// UserEventPublisher publishes user-related events
type UserEventPublisher struct {
	outboxService OutboxService
	logger        logger.Logger
}

// NewUserEventPublisher creates a new user event publisher
func NewUserEventPublisher(outboxService OutboxService, logger logger.Logger) *UserEventPublisher {
	return &UserEventPublisher{
		outboxService: outboxService,
		logger:        logger,
	}
}

// PublishUserCreated publishes a user created event
func (p *UserEventPublisher) PublishUserCreated(ctx context.Context, userID, email, firstName, lastName string) error {
	p.logger.Infof("Publishing user created event: %s", userID)

	eventData := map[string]interface{}{
		"user_id":    userID,
		"email":      email,
		"first_name": firstName,
		"last_name":  lastName,
		"timestamp":  time.Now(),
	}

	if err := p.outboxService.PublishEvent(ctx, userID, "user", "user_created", eventData); err != nil {
		p.logger.Errorf("Failed to publish user created event: %v", err)
		return fmt.Errorf("failed to publish user created event: %w", err)
	}

	p.logger.Infof("User created event published successfully: %s", userID)
	return nil
}

// PublishUserUpdated publishes a user updated event
func (p *UserEventPublisher) PublishUserUpdated(ctx context.Context, userID, email, firstName, lastName string) error {
	p.logger.Infof("Publishing user updated event: %s", userID)

	eventData := map[string]interface{}{
		"user_id":    userID,
		"email":      email,
		"first_name": firstName,
		"last_name":  lastName,
		"timestamp":  time.Now(),
	}

	if err := p.outboxService.PublishEvent(ctx, userID, "user", "user_updated", eventData); err != nil {
		p.logger.Errorf("Failed to publish user updated event: %v", err)
		return fmt.Errorf("failed to publish user updated event: %w", err)
	}

	p.logger.Infof("User updated event published successfully: %s", userID)
	return nil
}

// PublishUserAuthenticated publishes a user authenticated event
func (p *UserEventPublisher) PublishUserAuthenticated(ctx context.Context, userID, email string) error {
	p.logger.Infof("Publishing user authenticated event: %s", userID)

	eventData := map[string]interface{}{
		"user_id":   userID,
		"email":     email,
		"timestamp": time.Now(),
	}

	if err := p.outboxService.PublishEvent(ctx, userID, "user", "user_authenticated", eventData); err != nil {
		p.logger.Errorf("Failed to publish user authenticated event: %v", err)
		return fmt.Errorf("failed to publish user authenticated event: %w", err)
	}

	p.logger.Infof("User authenticated event published successfully: %s", userID)
	return nil
}
