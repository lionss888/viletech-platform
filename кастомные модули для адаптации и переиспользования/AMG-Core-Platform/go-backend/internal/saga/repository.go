package saga

import (
	"context"
	"time"

	"amg-flow-backend/pkg/logger"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Repository implements the SagaRepository interface
type Repository struct {
	db     *gorm.DB
	logger logger.Logger
}

// NewRepository creates a new saga repository
func NewRepository(db *gorm.DB, logger logger.Logger) *Repository {
	return &Repository{
		db:     db,
		logger: logger,
	}
}

// CreateSaga creates a new saga
func (r *Repository) CreateSaga(ctx context.Context, saga *Saga) error {
	r.logger.Infof("Creating saga: %s", saga.ID)

	if err := r.db.WithContext(ctx).Create(saga).Error; err != nil {
		r.logger.Errorf("Failed to create saga: %v", err)
		return err
	}

	r.logger.Infof("Saga created successfully: %s", saga.ID)
	return nil
}

// UpdateSaga updates an existing saga
func (r *Repository) UpdateSaga(ctx context.Context, saga *Saga) error {
	r.logger.Infof("Updating saga: %s", saga.ID)

	saga.UpdatedAt = time.Now()
	if err := r.db.WithContext(ctx).Save(saga).Error; err != nil {
		r.logger.Errorf("Failed to update saga: %v", err)
		return err
	}

	r.logger.Infof("Saga updated successfully: %s", saga.ID)
	return nil
}

// GetSaga retrieves a saga by ID
func (r *Repository) GetSaga(ctx context.Context, sagaID uuid.UUID) (*Saga, error) {
	r.logger.Infof("Getting saga: %s", sagaID)

	var saga Saga
	if err := r.db.WithContext(ctx).Where("id = ?", sagaID).First(&saga).Error; err != nil {
		r.logger.Errorf("Failed to get saga: %v", err)
		return nil, err
	}

	return &saga, nil
}

// GetSagaByCorrelationID retrieves a saga by correlation ID
func (r *Repository) GetSagaByCorrelationID(ctx context.Context, correlationID string) (*Saga, error) {
	r.logger.Infof("Getting saga by correlation ID: %s", correlationID)

	var saga Saga
	if err := r.db.WithContext(ctx).Where("correlation_id = ?", correlationID).First(&saga).Error; err != nil {
		r.logger.Errorf("Failed to get saga by correlation ID: %v", err)
		return nil, err
	}

	return &saga, nil
}

// CreateSagaStep creates a new saga step
func (r *Repository) CreateSagaStep(ctx context.Context, step *SagaStep) error {
	r.logger.Infof("Creating saga step: %s", step.ID)

	if err := r.db.WithContext(ctx).Create(step).Error; err != nil {
		r.logger.Errorf("Failed to create saga step: %v", err)
		return err
	}

	r.logger.Infof("Saga step created successfully: %s", step.ID)
	return nil
}

// UpdateSagaStep updates an existing saga step
func (r *Repository) UpdateSagaStep(ctx context.Context, step *SagaStep) error {
	r.logger.Infof("Updating saga step: %s", step.ID)

	step.UpdatedAt = time.Now()
	if err := r.db.WithContext(ctx).Save(step).Error; err != nil {
		r.logger.Errorf("Failed to update saga step: %v", err)
		return err
	}

	r.logger.Infof("Saga step updated successfully: %s", step.ID)
	return nil
}

// GetSagaSteps retrieves all steps for a saga
func (r *Repository) GetSagaSteps(ctx context.Context, sagaID uuid.UUID) ([]*SagaStep, error) {
	r.logger.Infof("Getting saga steps for saga: %s", sagaID)

	var steps []*SagaStep
	if err := r.db.WithContext(ctx).Where("saga_id = ?", sagaID).Order("order ASC").Find(&steps).Error; err != nil {
		r.logger.Errorf("Failed to get saga steps: %v", err)
		return nil, err
	}

	return steps, nil
}

// GetSagaStep retrieves a saga step by ID
func (r *Repository) GetSagaStep(ctx context.Context, stepID uuid.UUID) (*SagaStep, error) {
	r.logger.Infof("Getting saga step: %s", stepID)

	var step SagaStep
	if err := r.db.WithContext(ctx).Where("id = ?", stepID).First(&step).Error; err != nil {
		r.logger.Errorf("Failed to get saga step: %v", err)
		return nil, err
	}

	return &step, nil
}

// GetSagasByStatus retrieves sagas by status
func (r *Repository) GetSagasByStatus(ctx context.Context, status SagaStatus) ([]*Saga, error) {
	r.logger.Infof("Getting sagas by status: %s", status)

	var sagas []*Saga
	if err := r.db.WithContext(ctx).Where("status = ?", status).Find(&sagas).Error; err != nil {
		r.logger.Errorf("Failed to get sagas by status: %v", err)
		return nil, err
	}

	return sagas, nil
}

// GetFailedSagas retrieves failed sagas that need compensation
func (r *Repository) GetFailedSagas(ctx context.Context) ([]*Saga, error) {
	r.logger.Info("Getting failed sagas")

	var sagas []*Saga
	if err := r.db.WithContext(ctx).Where("status = ?", SagaStatusFailed).Find(&sagas).Error; err != nil {
		r.logger.Errorf("Failed to get failed sagas: %v", err)
		return nil, err
	}

	return sagas, nil
}

// GetPendingSagas retrieves pending sagas that need processing
func (r *Repository) GetPendingSagas(ctx context.Context) ([]*Saga, error) {
	r.logger.Info("Getting pending sagas")

	var sagas []*Saga
	if err := r.db.WithContext(ctx).Where("status = ?", SagaStatusPending).Find(&sagas).Error; err != nil {
		r.logger.Errorf("Failed to get pending sagas: %v", err)
		return nil, err
	}

	return sagas, nil
}
