package saga

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// SagaStatus represents the status of a saga
type SagaStatus string

const (
	SagaStatusPending     SagaStatus = "pending"
	SagaStatusRunning     SagaStatus = "running"
	SagaStatusCompleted   SagaStatus = "completed"
	SagaStatusFailed      SagaStatus = "failed"
	SagaStatusCompensated SagaStatus = "compensated"
)

// StepStatus represents the status of a saga step
type StepStatus string

const (
	StepStatusPending     StepStatus = "pending"
	StepStatusRunning     StepStatus = "running"
	StepStatusCompleted   StepStatus = "completed"
	StepStatusFailed      StepStatus = "failed"
	StepStatusCompensated StepStatus = "compensated"
)

// Saga represents a distributed transaction saga
type Saga struct {
	ID            uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Type          string     `json:"type" gorm:"not null"`
	Status        SagaStatus `json:"status" gorm:"default:'pending'"`
	CorrelationID string     `json:"correlation_id" gorm:"index"`
	Data          string     `json:"data" gorm:"type:jsonb"`
	Result        string     `json:"result" gorm:"type:jsonb"`
	Error         string     `json:"error"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	CompletedAt   *time.Time `json:"completed_at"`
}

// SagaStep represents a single step in a saga
type SagaStep struct {
	ID          uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	SagaID      uuid.UUID  `json:"saga_id" gorm:"type:uuid;not null;index"`
	StepName    string     `json:"step_name" gorm:"not null"`
	Order       int        `json:"order" gorm:"not null"`
	Status      StepStatus `json:"status" gorm:"default:'pending'"`
	Data        string     `json:"data" gorm:"type:jsonb"`
	Result      string     `json:"result" gorm:"type:jsonb"`
	Error       string     `json:"error"`
	RetryCount  int        `json:"retry_count" gorm:"default:0"`
	MaxRetries  int        `json:"max_retries" gorm:"default:3"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	CompletedAt *time.Time `json:"completed_at"`
}

// StepAction represents an action to be executed in a saga step
type StepAction interface {
	Execute(ctx context.Context, data interface{}) (interface{}, error)
	Compensate(ctx context.Context, data interface{}) error
	GetName() string
}

// SagaOrchestrator manages the execution of sagas
type SagaOrchestrator interface {
	StartSaga(ctx context.Context, sagaType string, correlationID string, data interface{}) (*Saga, error)
	ExecuteStep(ctx context.Context, sagaID uuid.UUID, stepName string, data interface{}) error
	CompensateSaga(ctx context.Context, sagaID uuid.UUID) error
	GetSaga(ctx context.Context, sagaID uuid.UUID) (*Saga, error)
	GetSagaSteps(ctx context.Context, sagaID uuid.UUID) ([]*SagaStep, error)
}

// SagaRepository defines the interface for saga persistence
type SagaRepository interface {
	CreateSaga(ctx context.Context, saga *Saga) error
	UpdateSaga(ctx context.Context, saga *Saga) error
	GetSaga(ctx context.Context, sagaID uuid.UUID) (*Saga, error)
	GetSagaByCorrelationID(ctx context.Context, correlationID string) (*Saga, error)
	CreateSagaStep(ctx context.Context, step *SagaStep) error
	UpdateSagaStep(ctx context.Context, step *SagaStep) error
	GetSagaSteps(ctx context.Context, sagaID uuid.UUID) ([]*SagaStep, error)
	GetSagaStep(ctx context.Context, stepID uuid.UUID) (*SagaStep, error)
	GetSagasByStatus(ctx context.Context, status SagaStatus) ([]*Saga, error)
	GetFailedSagas(ctx context.Context) ([]*Saga, error)
	GetPendingSagas(ctx context.Context) ([]*Saga, error)
}
