package domain

import (
	"time"
)

// IntegrationStatus represents the status of an integration
type IntegrationStatus string

const (
	StatusActive     IntegrationStatus = "active"
	StatusInactive   IntegrationStatus = "inactive"
	StatusError      IntegrationStatus = "error"
	StatusPending    IntegrationStatus = "pending"
	StatusMaintenance IntegrationStatus = "maintenance"
)

// IntegrationType represents the type of integration
type IntegrationType string

const (
	TypeBanking     IntegrationType = "banking"
	TypePayment     IntegrationType = "payment"
	TypeCRM         IntegrationType = "crm"
	TypeAnalytics   IntegrationType = "analytics"
	TypeMarketing   IntegrationType = "marketing"
	TypeCommunication IntegrationType = "communication"
)

// Integration represents an external system integration
type Integration struct {
	ID          string           `json:"id" db:"id"`
	Name        string           `json:"name" db:"name"`
	Type        IntegrationType  `json:"type" db:"type"`
	Status      IntegrationStatus `json:"status" db:"status"`
	Version     string           `json:"version" db:"version"`
	Description string           `json:"description" db:"description"`
	Config      map[string]interface{} `json:"config" db:"config"`
	Credentials map[string]interface{} `json:"credentials" db:"credentials"`
	Metadata    map[string]interface{} `json:"metadata" db:"metadata"`
	CreatedAt   time.Time        `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at" db:"updated_at"`
	LastSync    *time.Time       `json:"last_sync" db:"last_sync"`
}

// IntegrationPlugin defines the interface for integration plugins
type IntegrationPlugin interface {
	// Basic information
	Name() string
	Version() string
	Type() IntegrationType
	
	// Lifecycle management
	Initialize(config map[string]interface{}) error
	Shutdown() error
	
	// Operations
	Execute(action string, params map[string]interface{}) (interface{}, error)
	ValidateConfig(config map[string]interface{}) error
	
	// Monitoring
	HealthCheck() error
	GetMetrics() map[string]interface{}
	GetStatus() IntegrationStatus
	
	// Configuration
	GetConfigSchema() map[string]interface{}
	GetActions() []string
}

// IntegrationOperation represents an operation performed by an integration
type IntegrationOperation struct {
	ID           string                 `json:"id" db:"id"`
	IntegrationID string                `json:"integration_id" db:"integration_id"`
	Action       string                 `json:"action" db:"action"`
	Params       map[string]interface{} `json:"params" db:"params"`
	Result       map[string]interface{} `json:"result" db:"result"`
	Status       string                 `json:"status" db:"status"`
	Error        string                 `json:"error" db:"error"`
	Duration     int64                  `json:"duration" db:"duration"` // milliseconds
	CreatedAt    time.Time              `json:"created_at" db:"created_at"`
	CompletedAt  *time.Time             `json:"completed_at" db:"completed_at"`
}

// IntegrationMetric represents metrics for an integration
type IntegrationMetric struct {
	ID           string                 `json:"id" db:"id"`
	IntegrationID string                `json:"integration_id" db:"integration_id"`
	Name         string                 `json:"name" db:"name"`
	Value        float64                `json:"value" db:"value"`
	Unit         string                 `json:"unit" db:"unit"`
	Labels       map[string]string      `json:"labels" db:"labels"`
	Timestamp    time.Time              `json:"timestamp" db:"timestamp"`
}

// IntegrationLog represents a log entry for an integration
type IntegrationLog struct {
	ID           string                 `json:"id" db:"id"`
	IntegrationID string                `json:"integration_id" db:"integration_id"`
	Level        string                 `json:"level" db:"level"`
	Message      string                 `json:"message" db:"message"`
	Context      map[string]interface{} `json:"context" db:"context"`
	Timestamp    time.Time              `json:"timestamp" db:"timestamp"`
}

// IntegrationService defines the interface for integration management
type IntegrationService interface {
	// CRUD operations
	CreateIntegration(integration *Integration) error
	GetIntegration(id string) (*Integration, error)
	GetIntegrations(filters map[string]interface{}) ([]*Integration, error)
	UpdateIntegration(id string, updates map[string]interface{}) error
	DeleteIntegration(id string) error
	
	// Plugin management
	RegisterPlugin(plugin IntegrationPlugin) error
	UnregisterPlugin(name string) error
	GetPlugin(name string) (IntegrationPlugin, error)
	GetPlugins() map[string]IntegrationPlugin
	
	// Operations
	ExecuteOperation(integrationID, action string, params map[string]interface{}) (*IntegrationOperation, error)
	GetOperation(id string) (*IntegrationOperation, error)
	GetOperations(integrationID string, filters map[string]interface{}) ([]*IntegrationOperation, error)
	
	// Monitoring
	GetIntegrationStatus(id string) (IntegrationStatus, error)
	GetIntegrationMetrics(id string, timeRange string) ([]*IntegrationMetric, error)
	GetIntegrationLogs(id string, filters map[string]interface{}) ([]*IntegrationLog, error)
	
	// Health and maintenance
	HealthCheck() map[string]interface{}
	PerformMaintenance(integrationID string) error
}
