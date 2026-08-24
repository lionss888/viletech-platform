package saga

import (
	"context"
	"fmt"

	"amg-flow-backend/pkg/logger"

	"github.com/google/uuid"
)

// Service provides high-level saga operations
type Service struct {
	coordinator *Coordinator
	logger      logger.Logger
}

// NewService creates a new saga service
func NewService(coordinator *Coordinator, logger logger.Logger) *Service {
	return &Service{
		coordinator: coordinator,
		logger:      logger,
	}
}

// StartUserRegistration starts a user registration saga
func (s *Service) StartUserRegistration(ctx context.Context, data UserRegistrationData) (*Saga, error) {
	s.logger.Infof("Starting user registration saga for email: %s", data.Email)

	// Execute saga
	saga, err := s.coordinator.ExecuteSaga(ctx, "user_registration", data.Email, data)
	if err != nil {
		s.logger.Errorf("Failed to execute user registration saga: %v", err)
		return nil, fmt.Errorf("failed to execute user registration saga: %w", err)
	}

	s.logger.Infof("User registration saga started successfully: %s", saga.ID)
	return saga, nil
}

// StartPaymentProcessing starts a payment processing saga
func (s *Service) StartPaymentProcessing(ctx context.Context, data PaymentData) (*Saga, error) {
	s.logger.Infof("Starting payment processing saga for payment: %s", data.PaymentID)

	// Execute saga
	saga, err := s.coordinator.ExecuteSaga(ctx, "payment_processing", data.PaymentID, data)
	if err != nil {
		s.logger.Errorf("Failed to execute payment processing saga: %v", err)
		return nil, fmt.Errorf("failed to execute payment processing saga: %w", err)
	}

	s.logger.Infof("Payment processing saga started successfully: %s", saga.ID)
	return saga, nil
}

// StartAccountVerification starts an account verification saga
func (s *Service) StartAccountVerification(ctx context.Context, userID string, verificationType string) (*Saga, error) {
	s.logger.Infof("Starting account verification saga for user: %s", userID)

	// Prepare verification data
	verificationData := map[string]interface{}{
		"user_id":           userID,
		"verification_type": verificationType,
	}

	// Execute saga
	saga, err := s.coordinator.ExecuteSaga(ctx, "account_verification", userID, verificationData)
	if err != nil {
		s.logger.Errorf("Failed to execute account verification saga: %v", err)
		return nil, fmt.Errorf("failed to execute account verification saga: %w", err)
	}

	s.logger.Infof("Account verification saga started successfully: %s", saga.ID)
	return saga, nil
}

// GetSagaStatus retrieves the status of a saga
func (s *Service) GetSagaStatus(ctx context.Context, sagaID uuid.UUID) (*Saga, []*SagaStep, error) {
	s.logger.Infof("Getting saga status: %s", sagaID)

	saga, steps, err := s.coordinator.GetSagaStatus(ctx, sagaID)
	if err != nil {
		s.logger.Errorf("Failed to get saga status: %v", err)
		return nil, nil, fmt.Errorf("failed to get saga status: %w", err)
	}

	return saga, steps, nil
}

// CompensateSaga compensates a failed saga
func (s *Service) CompensateSaga(ctx context.Context, sagaID uuid.UUID) error {
	s.logger.Infof("Compensating saga: %s", sagaID)

	if err := s.coordinator.CompensateSaga(ctx, sagaID); err != nil {
		s.logger.Errorf("Failed to compensate saga: %v", err)
		return fmt.Errorf("failed to compensate saga: %w", err)
	}

	s.logger.Infof("Saga compensated successfully: %s", sagaID)
	return nil
}

// GetSagaByCorrelationID retrieves a saga by correlation ID
func (s *Service) GetSagaByCorrelationID(ctx context.Context, correlationID string) (*Saga, error) {
	s.logger.Infof("Getting saga by correlation ID: %s", correlationID)

	saga, err := s.coordinator.repository.GetSagaByCorrelationID(ctx, correlationID)
	if err != nil {
		s.logger.Errorf("Failed to get saga by correlation ID: %v", err)
		return nil, fmt.Errorf("failed to get saga by correlation ID: %w", err)
	}

	return saga, nil
}

// GetFailedSagas retrieves all failed sagas
func (s *Service) GetFailedSagas(ctx context.Context) ([]*Saga, error) {
	s.logger.Info("Getting failed sagas")

	sagas, err := s.coordinator.repository.GetFailedSagas(ctx)
	if err != nil {
		s.logger.Errorf("Failed to get failed sagas: %v", err)
		return nil, fmt.Errorf("failed to get failed sagas: %w", err)
	}

	return sagas, nil
}

// GetPendingSagas retrieves all pending sagas
func (s *Service) GetPendingSagas(ctx context.Context) ([]*Saga, error) {
	s.logger.Info("Getting pending sagas")

	sagas, err := s.coordinator.repository.GetPendingSagas(ctx)
	if err != nil {
		s.logger.Errorf("Failed to get pending sagas: %v", err)
		return nil, fmt.Errorf("failed to get pending sagas: %w", err)
	}

	return sagas, nil
}

// RetryFailedSaga retries a failed saga
func (s *Service) RetryFailedSaga(ctx context.Context, sagaID uuid.UUID) error {
	s.logger.Infof("Retrying failed saga: %s", sagaID)

	// Get saga
	saga, err := s.coordinator.repository.GetSaga(ctx, sagaID)
	if err != nil {
		s.logger.Errorf("Failed to get saga: %v", err)
		return fmt.Errorf("failed to get saga: %w", err)
	}

	// Check if saga is in failed state
	if saga.Status != SagaStatusFailed {
		return fmt.Errorf("saga is not in failed state: %s", saga.Status)
	}

	// Reset saga status
	saga.Status = SagaStatusPending
	saga.Error = ""
	saga.UpdatedAt = saga.UpdatedAt

	if err := s.coordinator.repository.UpdateSaga(ctx, saga); err != nil {
		s.logger.Errorf("Failed to update saga status: %v", err)
		return fmt.Errorf("failed to update saga status: %w", err)
	}

	// TODO: Restart saga execution
	// This would typically involve re-executing the saga steps

	s.logger.Infof("Failed saga retry initiated: %s", sagaID)
	return nil
}
