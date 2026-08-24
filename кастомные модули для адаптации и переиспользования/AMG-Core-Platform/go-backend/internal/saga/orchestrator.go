package saga

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"amg-flow-backend/pkg/logger"

	"github.com/google/uuid"
)

// Orchestrator implements the SagaOrchestrator interface
type Orchestrator struct {
	repo   SagaRepository
	logger logger.Logger
}

// NewOrchestrator creates a new saga orchestrator
func NewOrchestrator(repo SagaRepository, logger logger.Logger) *Orchestrator {
	return &Orchestrator{
		repo:   repo,
		logger: logger,
	}
}

// StartSaga starts a new saga
func (o *Orchestrator) StartSaga(ctx context.Context, sagaType string, correlationID string, data interface{}) (*Saga, error) {
	o.logger.Infof("Starting saga: type=%s, correlationID=%s", sagaType, correlationID)

	// Create saga
	saga := &Saga{
		ID:            uuid.New(),
		Type:          sagaType,
		Status:        SagaStatusPending,
		CorrelationID: correlationID,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	// Serialize data
	dataJSON, err := json.Marshal(data)
	if err != nil {
		o.logger.Errorf("Failed to serialize saga data: %v", err)
		return nil, fmt.Errorf("failed to serialize saga data: %w", err)
	}
	saga.Data = string(dataJSON)

	// Save saga
	if err := o.repo.CreateSaga(ctx, saga); err != nil {
		o.logger.Errorf("Failed to create saga: %v", err)
		return nil, fmt.Errorf("failed to create saga: %w", err)
	}

	o.logger.Infof("Saga created successfully: %s", saga.ID)
	return saga, nil
}

// ExecuteStep executes a step in a saga
func (o *Orchestrator) ExecuteStep(ctx context.Context, sagaID uuid.UUID, stepName string, data interface{}) error {
	o.logger.Infof("Executing saga step: sagaID=%s, step=%s", sagaID, stepName)

	// Get saga
	saga, err := o.repo.GetSaga(ctx, sagaID)
	if err != nil {
		o.logger.Errorf("Failed to get saga: %v", err)
		return fmt.Errorf("failed to get saga: %w", err)
	}

	// Check if saga is in valid state
	if saga.Status != SagaStatusRunning && saga.Status != SagaStatusPending {
		return fmt.Errorf("saga is not in a valid state for execution: %s", saga.Status)
	}

	// Update saga status to running
	if saga.Status == SagaStatusPending {
		saga.Status = SagaStatusRunning
		saga.UpdatedAt = time.Now()
		if err := o.repo.UpdateSaga(ctx, saga); err != nil {
			o.logger.Errorf("Failed to update saga status: %v", err)
			return fmt.Errorf("failed to update saga status: %w", err)
		}
	}

	// Create saga step
	step := &SagaStep{
		ID:         uuid.New(),
		SagaID:     sagaID,
		StepName:   stepName,
		Status:     StepStatusRunning,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
		MaxRetries: 3,
	}

	// Serialize step data
	dataJSON, err := json.Marshal(data)
	if err != nil {
		o.logger.Errorf("Failed to serialize step data: %v", err)
		return fmt.Errorf("failed to serialize step data: %w", err)
	}
	step.Data = string(dataJSON)

	// Save step
	if err := o.repo.CreateSagaStep(ctx, step); err != nil {
		o.logger.Errorf("Failed to create saga step: %v", err)
		return fmt.Errorf("failed to create saga step: %w", err)
	}

	o.logger.Infof("Saga step created successfully: %s", step.ID)
	return nil
}

// CompensateSaga compensates a failed saga
func (o *Orchestrator) CompensateSaga(ctx context.Context, sagaID uuid.UUID) error {
	o.logger.Infof("Compensating saga: %s", sagaID)

	// Get saga
	saga, err := o.repo.GetSaga(ctx, sagaID)
	if err != nil {
		o.logger.Errorf("Failed to get saga: %v", err)
		return fmt.Errorf("failed to get saga: %w", err)
	}

	// Get saga steps in reverse order
	steps, err := o.repo.GetSagaSteps(ctx, sagaID)
	if err != nil {
		o.logger.Errorf("Failed to get saga steps: %v", err)
		return fmt.Errorf("failed to get saga steps: %w", err)
	}

	// Update saga status
	saga.Status = SagaStatusCompensated
	saga.UpdatedAt = time.Now()
	if err := o.repo.UpdateSaga(ctx, saga); err != nil {
		o.logger.Errorf("Failed to update saga status: %v", err)
		return fmt.Errorf("failed to update saga status: %w", err)
	}

	// Compensate steps in reverse order
	for i := len(steps) - 1; i >= 0; i-- {
		step := steps[i]
		if step.Status == StepStatusCompleted {
			// TODO: Execute compensation logic for this step
			step.Status = StepStatusCompensated
			step.UpdatedAt = time.Now()
			step.CompletedAt = &time.Time{}
			*step.CompletedAt = time.Now()

			if err := o.repo.UpdateSagaStep(ctx, step); err != nil {
				o.logger.Errorf("Failed to update saga step: %v", err)
				return fmt.Errorf("failed to update saga step: %w", err)
			}

			o.logger.Infof("Compensated saga step: %s", step.StepName)
		}
	}

	o.logger.Infof("Saga compensated successfully: %s", sagaID)
	return nil
}

// GetSaga retrieves a saga by ID
func (o *Orchestrator) GetSaga(ctx context.Context, sagaID uuid.UUID) (*Saga, error) {
	return o.repo.GetSaga(ctx, sagaID)
}

// GetSagaSteps retrieves all steps for a saga
func (o *Orchestrator) GetSagaSteps(ctx context.Context, sagaID uuid.UUID) ([]*SagaStep, error) {
	return o.repo.GetSagaSteps(ctx, sagaID)
}
