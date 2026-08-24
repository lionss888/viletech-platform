package saga

import (
	"context"
	"fmt"
	"time"

	"amg-flow-backend/pkg/logger"

	"github.com/google/uuid"
)

// Coordinator manages saga execution and compensation
type Coordinator struct {
	orchestrator *Orchestrator
	repository   SagaRepository
	logger       logger.Logger
}

// NewCoordinator creates a new saga coordinator
func NewCoordinator(orchestrator *Orchestrator, repository SagaRepository, logger logger.Logger) *Coordinator {
	return &Coordinator{
		orchestrator: orchestrator,
		repository:   repository,
		logger:       logger,
	}
}

// ExecuteSaga executes a saga with automatic step management
func (c *Coordinator) ExecuteSaga(ctx context.Context, sagaType string, correlationID string, data interface{}) (*Saga, error) {
	c.logger.Infof("Executing saga: type=%s, correlationID=%s", sagaType, correlationID)

	// Start saga
	saga, err := c.orchestrator.StartSaga(ctx, sagaType, correlationID, data)
	if err != nil {
		c.logger.Errorf("Failed to start saga: %v", err)
		return nil, fmt.Errorf("failed to start saga: %w", err)
	}

	// Get saga steps configuration
	steps, err := c.getSagaSteps(sagaType)
	if err != nil {
		c.logger.Errorf("Failed to get saga steps: %v", err)
		return nil, fmt.Errorf("failed to get saga steps: %w", err)
	}

	// Execute steps sequentially
	for i, step := range steps {
		c.logger.Infof("Executing step %d/%d: %s", i+1, len(steps), step.Name)

		// Create step data
		stepData := map[string]interface{}{
			"saga_id":    saga.ID,
			"step_name":  step.Name,
			"step_order": i,
			"data":       data,
		}

		// Execute step
		if err := c.orchestrator.ExecuteStep(ctx, saga.ID, step.Name, stepData); err != nil {
			c.logger.Errorf("Failed to execute step %s: %v", step.Name, err)

			// Mark saga as failed
			saga.Status = SagaStatusFailed
			saga.Error = err.Error()
			saga.UpdatedAt = time.Now()
			if updateErr := c.repository.UpdateSaga(ctx, saga); updateErr != nil {
				c.logger.Errorf("Failed to update saga status: %v", updateErr)
			}

			// Compensate saga
			if compErr := c.orchestrator.CompensateSaga(ctx, saga.ID); compErr != nil {
				c.logger.Errorf("Failed to compensate saga: %v", compErr)
			}

			return nil, fmt.Errorf("failed to execute step %s: %w", step.Name, err)
		}

		c.logger.Infof("Step %s completed successfully", step.Name)
	}

	// Mark saga as completed
	saga.Status = SagaStatusCompleted
	saga.UpdatedAt = time.Now()
	completedAt := time.Now()
	saga.CompletedAt = &completedAt

	if err := c.repository.UpdateSaga(ctx, saga); err != nil {
		c.logger.Errorf("Failed to update saga status: %v", err)
		return nil, fmt.Errorf("failed to update saga status: %w", err)
	}

	c.logger.Infof("Saga completed successfully: %s", saga.ID)
	return saga, nil
}

// CompensateSaga compensates a failed saga
func (c *Coordinator) CompensateSaga(ctx context.Context, sagaID uuid.UUID) error {
	c.logger.Infof("Compensating saga: %s", sagaID)

	// Get saga
	saga, err := c.repository.GetSaga(ctx, sagaID)
	if err != nil {
		c.logger.Errorf("Failed to get saga: %v", err)
		return fmt.Errorf("failed to get saga: %w", err)
	}

	// Get saga steps in reverse order
	steps, err := c.repository.GetSagaSteps(ctx, sagaID)
	if err != nil {
		c.logger.Errorf("Failed to get saga steps: %v", err)
		return fmt.Errorf("failed to get saga steps: %w", err)
	}

	// Compensate steps in reverse order
	for i := len(steps) - 1; i >= 0; i-- {
		step := steps[i]
		if step.Status == StepStatusCompleted {
			c.logger.Infof("Compensating step: %s", step.StepName)

			// TODO: Execute compensation logic for this step
			// This would typically call the appropriate service to undo the action

			step.Status = StepStatusCompensated
			step.UpdatedAt = time.Now()
			completedAt := time.Now()
			step.CompletedAt = &completedAt

			if err := c.repository.UpdateSagaStep(ctx, step); err != nil {
				c.logger.Errorf("Failed to update saga step: %v", err)
				return fmt.Errorf("failed to update saga step: %w", err)
			}

			c.logger.Infof("Step compensated successfully: %s", step.StepName)
		}
	}

	// Update saga status
	saga.Status = SagaStatusCompensated
	saga.UpdatedAt = time.Now()
	if err := c.repository.UpdateSaga(ctx, saga); err != nil {
		c.logger.Errorf("Failed to update saga status: %v", err)
		return fmt.Errorf("failed to update saga status: %w", err)
	}

	c.logger.Infof("Saga compensated successfully: %s", sagaID)
	return nil
}

// SagaStepConfig represents configuration for a saga step
type SagaStepConfig struct {
	Name       string `json:"name"`
	Order      int    `json:"order"`
	RetryCount int    `json:"retry_count"`
	MaxRetries int    `json:"max_retries"`
	Timeout    int    `json:"timeout"` // in seconds
	Compensate bool   `json:"compensate"`
}

// getSagaSteps returns the steps configuration for a saga type
func (c *Coordinator) getSagaSteps(sagaType string) ([]SagaStepConfig, error) {
	// Define saga steps configurations
	sagaSteps := map[string][]SagaStepConfig{
		"user_registration": {
			{Name: "create_user", Order: 1, RetryCount: 0, MaxRetries: 3, Timeout: 30, Compensate: true},
			{Name: "create_wallet", Order: 2, RetryCount: 0, MaxRetries: 3, Timeout: 30, Compensate: true},
			{Name: "create_bank_account", Order: 3, RetryCount: 0, MaxRetries: 3, Timeout: 30, Compensate: true},
			{Name: "set_limits", Order: 4, RetryCount: 0, MaxRetries: 3, Timeout: 30, Compensate: true},
			{Name: "send_welcome_email", Order: 5, RetryCount: 0, MaxRetries: 3, Timeout: 30, Compensate: false},
		},
		"payment_processing": {
			{Name: "check_limits", Order: 1, RetryCount: 0, MaxRetries: 3, Timeout: 30, Compensate: false},
			{Name: "fraud_check", Order: 2, RetryCount: 0, MaxRetries: 3, Timeout: 30, Compensate: false},
			{Name: "reserve_funds", Order: 3, RetryCount: 0, MaxRetries: 3, Timeout: 30, Compensate: true},
			{Name: "process_payment", Order: 4, RetryCount: 0, MaxRetries: 3, Timeout: 30, Compensate: true},
			{Name: "update_balances", Order: 5, RetryCount: 0, MaxRetries: 3, Timeout: 30, Compensate: true},
			{Name: "send_notifications", Order: 6, RetryCount: 0, MaxRetries: 3, Timeout: 30, Compensate: false},
		},
		"account_verification": {
			{Name: "send_verification_email", Order: 1, RetryCount: 0, MaxRetries: 3, Timeout: 30, Compensate: false},
			{Name: "create_verification_record", Order: 2, RetryCount: 0, MaxRetries: 3, Timeout: 30, Compensate: true},
			{Name: "update_user_status", Order: 3, RetryCount: 0, MaxRetries: 3, Timeout: 30, Compensate: true},
		},
	}

	steps, exists := sagaSteps[sagaType]
	if !exists {
		return nil, fmt.Errorf("unknown saga type: %s", sagaType)
	}

	return steps, nil
}

// GetSagaStatus returns the status of a saga
func (c *Coordinator) GetSagaStatus(ctx context.Context, sagaID uuid.UUID) (*Saga, []*SagaStep, error) {
	c.logger.Infof("Getting saga status: %s", sagaID)

	// Get saga
	saga, err := c.repository.GetSaga(ctx, sagaID)
	if err != nil {
		c.logger.Errorf("Failed to get saga: %v", err)
		return nil, nil, fmt.Errorf("failed to get saga: %w", err)
	}

	// Get saga steps
	steps, err := c.repository.GetSagaSteps(ctx, sagaID)
	if err != nil {
		c.logger.Errorf("Failed to get saga steps: %v", err)
		return nil, nil, fmt.Errorf("failed to get saga steps: %w", err)
	}

	return saga, steps, nil
}
