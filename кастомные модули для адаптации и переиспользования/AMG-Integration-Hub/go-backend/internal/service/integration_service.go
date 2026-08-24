package service

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"amg-integration-bus/internal/domain"
	"amg-integration-bus/internal/data-access"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

// integrationService implements IntegrationService interface
type integrationService struct {
	repo        data-access.IntegrationRepository
	operationRepo data-access.OperationRepository
	metricRepo  data-access.MetricRepository
	logRepo     data-access.LogRepository
	logger      *logrus.Logger
	plugins     map[string]domain.IntegrationPlugin
	mu          sync.RWMutex
}

// NewIntegrationService creates a new integration service
func NewIntegrationService(
	repo data-access.IntegrationRepository,
	operationRepo data-access.OperationRepository,
	metricRepo data-access.MetricRepository,
	logRepo data-access.LogRepository,
	logger *logrus.Logger,
) domain.IntegrationService {
	return &integrationService{
		repo:        repo,
		operationRepo: operationRepo,
		metricRepo:  metricRepo,
		logRepo:     logRepo,
		logger:      logger,
		plugins:     make(map[string]domain.IntegrationPlugin),
	}
}

// CreateIntegration creates a new integration
func (s *integrationService) CreateIntegration(integration *domain.Integration) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Generate ID if not provided
	if integration.ID == "" {
		integration.ID = uuid.New().String()
	}

	// Set timestamps
	now := time.Now()
	integration.CreatedAt = now
	integration.UpdatedAt = now

	// Set default status
	if integration.Status == "" {
		integration.Status = domain.StatusPending
	}

	// Validate configuration
	if err := s.validateIntegrationConfig(integration); err != nil {
		return fmt.Errorf("invalid integration configuration: %w", err)
	}

	// Save to database
	if err := s.repo.Create(context.Background(), integration); err != nil {
		return fmt.Errorf("failed to create integration: %w", err)
	}

	s.logger.WithFields(logrus.Fields{
		"integration_id": integration.ID,
		"name":           integration.Name,
		"type":           integration.Type,
	}).Info("Integration created")

	return nil
}

// GetIntegration retrieves an integration by ID
func (s *integrationService) GetIntegration(id string) (*domain.Integration, error) {
	integration, err := s.repo.GetByID(context.Background(), id)
	if err != nil {
		return nil, fmt.Errorf("failed to get integration: %w", err)
	}
	return integration, nil
}

// GetIntegrations retrieves integrations with filters
func (s *integrationService) GetIntegrations(filters map[string]interface{}) ([]*domain.Integration, error) {
	integrations, err := s.repo.GetAll(context.Background(), filters)
	if err != nil {
		return nil, fmt.Errorf("failed to get integrations: %w", err)
	}
	return integrations, nil
}

// UpdateIntegration updates an integration
func (s *integrationService) UpdateIntegration(id string, updates map[string]interface{}) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Add updated timestamp
	updates["updated_at"] = time.Now()

	if err := s.repo.Update(context.Background(), id, updates); err != nil {
		return fmt.Errorf("failed to update integration: %w", err)
	}

	s.logger.WithFields(logrus.Fields{
		"integration_id": id,
		"updates":        updates,
	}).Info("Integration updated")

	return nil
}

// DeleteIntegration deletes an integration
func (s *integrationService) DeleteIntegration(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Get integration to find plugin name
	integration, err := s.repo.GetByID(context.Background(), id)
	if err != nil {
		return fmt.Errorf("failed to get integration for deletion: %w", err)
	}

	// Unregister plugin if exists
	if plugin, exists := s.plugins[integration.Name]; exists {
		if err := plugin.Shutdown(); err != nil {
			s.logger.WithError(err).WithField("plugin", integration.Name).Warn("Failed to shutdown plugin")
		}
		delete(s.plugins, integration.Name)
	}

	// Delete from database
	if err := s.repo.Delete(context.Background(), id); err != nil {
		return fmt.Errorf("failed to delete integration: %w", err)
	}

	s.logger.WithField("integration_id", id).Info("Integration deleted")

	return nil
}

// RegisterPlugin registers a new integration plugin
func (s *integrationService) RegisterPlugin(plugin domain.IntegrationPlugin) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Check if plugin already exists
	if _, exists := s.plugins[plugin.Name()]; exists {
		return fmt.Errorf("plugin %s already registered", plugin.Name())
	}

	// Validate plugin
	if err := s.validatePlugin(plugin); err != nil {
		return fmt.Errorf("invalid plugin: %w", err)
	}

	// Register plugin
	s.plugins[plugin.Name()] = plugin

	s.logger.WithField("plugin", plugin.Name()).Info("Plugin registered")

	return nil
}

// UnregisterPlugin unregisters an integration plugin
func (s *integrationService) UnregisterPlugin(name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	plugin, exists := s.plugins[name]
	if !exists {
		return fmt.Errorf("plugin %s not found", name)
	}

	// Shutdown plugin
	if err := plugin.Shutdown(); err != nil {
		s.logger.WithError(err).WithField("plugin", name).Warn("Failed to shutdown plugin")
	}

	// Remove from registry
	delete(s.plugins, name)

	s.logger.WithField("plugin", name).Info("Plugin unregistered")

	return nil
}

// GetPlugin retrieves a plugin by name
func (s *integrationService) GetPlugin(name string) (domain.IntegrationPlugin, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	plugin, exists := s.plugins[name]
	if !exists {
		return nil, fmt.Errorf("plugin %s not found", name)
	}

	return plugin, nil
}

// GetPlugins returns all registered plugins
func (s *integrationService) GetPlugins() map[string]domain.IntegrationPlugin {
	s.mu.RLock()
	defer s.mu.RUnlock()

	plugins := make(map[string]domain.IntegrationPlugin)
	for name, plugin := range s.plugins {
		plugins[name] = plugin
	}

	return plugins
}

// ExecuteOperation executes an operation on an integration
func (s *integrationService) ExecuteOperation(integrationID, action string, params map[string]interface{}) (*domain.IntegrationOperation, error) {
	// Create operation record
	operation := &domain.IntegrationOperation{
		ID:            uuid.New().String(),
		IntegrationID: integrationID,
		Action:        action,
		Params:        params,
		Status:        "pending",
		CreatedAt:     time.Now(),
	}

	// Save operation to database
	if err := s.operationRepo.Create(context.Background(), operation); err != nil {
		return nil, fmt.Errorf("failed to create operation: %w", err)
	}

	// Get integration
	integration, err := s.GetIntegration(integrationID)
	if err != nil {
		s.updateOperationStatus(operation.ID, "failed", fmt.Sprintf("Integration not found: %v", err), nil)
		return operation, err
	}

	// Get plugin
	plugin, err := s.GetPlugin(integration.Name)
	if err != nil {
		s.updateOperationStatus(operation.ID, "failed", fmt.Sprintf("Plugin not found: %v", err), nil)
		return operation, err
	}

	// Execute operation
	startTime := time.Now()
	result, err := plugin.Execute(action, params)
	duration := time.Since(startTime).Milliseconds()

	// Update operation status
	if err != nil {
		s.updateOperationStatus(operation.ID, "failed", err.Error(), nil)
	} else {
		resultMap := make(map[string]interface{})
		if result != nil {
			// Convert result to map
			resultBytes, _ := json.Marshal(result)
			json.Unmarshal(resultBytes, &resultMap)
		}
		s.updateOperationStatus(operation.ID, "completed", "", resultMap)
	}

	// Update operation with duration
	operation.Duration = duration
	operation.Result = make(map[string]interface{})
	if result != nil {
		resultBytes, _ := json.Marshal(result)
		json.Unmarshal(resultBytes, &operation.Result)
	}

	if err != nil {
		operation.Error = err.Error()
		operation.Status = "failed"
	} else {
		operation.Status = "completed"
	}

	now := time.Now()
	operation.CompletedAt = &now

	// Update operation in database
	s.operationRepo.Update(context.Background(), operation.ID, map[string]interface{}{
		"status":       operation.Status,
		"result":       operation.Result,
		"error":        operation.Error,
		"duration":     operation.Duration,
		"completed_at": operation.CompletedAt,
	})

	s.logger.WithFields(logrus.Fields{
		"operation_id":   operation.ID,
		"integration_id": integrationID,
		"action":         action,
		"duration_ms":    duration,
		"status":         operation.Status,
	}).Info("Operation executed")

	return operation, err
}

// GetOperation retrieves an operation by ID
func (s *integrationService) GetOperation(id string) (*domain.IntegrationOperation, error) {
	operation, err := s.operationRepo.GetByID(context.Background(), id)
	if err != nil {
		return nil, fmt.Errorf("failed to get operation: %w", err)
	}
	return operation, nil
}

// GetOperations retrieves operations with filters
func (s *integrationService) GetOperations(integrationID string, filters map[string]interface{}) ([]*domain.IntegrationOperation, error) {
	if integrationID != "" {
		filters["integration_id"] = integrationID
	}

	operations, err := s.operationRepo.GetAll(context.Background(), filters)
	if err != nil {
		return nil, fmt.Errorf("failed to get operations: %w", err)
	}
	return operations, nil
}

// GetIntegrationStatus returns the status of an integration
func (s *integrationService) GetIntegrationStatus(id string) (domain.IntegrationStatus, error) {
	integration, err := s.GetIntegration(id)
	if err != nil {
		return "", err
	}

	// Check plugin health if plugin is registered
	if plugin, exists := s.plugins[integration.Name]; exists {
		if err := plugin.HealthCheck(); err != nil {
			return domain.StatusError, nil
		}
		return plugin.GetStatus(), nil
	}

	return integration.Status, nil
}

// GetIntegrationMetrics retrieves metrics for an integration
func (s *integrationService) GetIntegrationMetrics(id string, timeRange string) ([]*domain.IntegrationMetric, error) {
	filters := map[string]interface{}{
		"integration_id": id,
	}

	// Parse time range if provided
	if timeRange != "" {
		// Implementation for time range filtering
		// This would parse timeRange and add appropriate time filters
	}

	metrics, err := s.metricRepo.GetAll(context.Background(), filters)
	if err != nil {
		return nil, fmt.Errorf("failed to get integration metrics: %w", err)
	}
	return metrics, nil
}

// GetIntegrationLogs retrieves logs for an integration
func (s *integrationService) GetIntegrationLogs(id string, filters map[string]interface{}) ([]*domain.IntegrationLog, error) {
	filters["integration_id"] = id

	logs, err := s.logRepo.GetAll(context.Background(), filters)
	if err != nil {
		return nil, fmt.Errorf("failed to get integration logs: %w", err)
	}
	return logs, nil
}

// HealthCheck performs health check on all integrations
func (s *integrationService) HealthCheck() map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()

	health := map[string]interface{}{
		"status":     "healthy",
		"timestamp":  time.Now(),
		"plugins":    make(map[string]interface{}),
		"total":      len(s.plugins),
		"healthy":    0,
		"unhealthy":  0,
	}

	plugins := health["plugins"].(map[string]interface{})

	for name, plugin := range s.plugins {
		pluginHealth := map[string]interface{}{
			"name":    name,
			"version": plugin.Version(),
			"type":    plugin.Type(),
			"status":  "healthy",
		}

		if err := plugin.HealthCheck(); err != nil {
			pluginHealth["status"] = "unhealthy"
			pluginHealth["error"] = err.Error()
			health["unhealthy"] = health["unhealthy"].(int) + 1
		} else {
			health["healthy"] = health["healthy"].(int) + 1
		}

		plugins[name] = pluginHealth
	}

	if health["unhealthy"].(int) > 0 {
		health["status"] = "degraded"
	}

	return health
}

// PerformMaintenance performs maintenance on an integration
func (s *integrationService) PerformMaintenance(integrationID string) error {
	integration, err := s.GetIntegration(integrationID)
	if err != nil {
		return err
	}

	plugin, exists := s.plugins[integration.Name]
	if !exists {
		return fmt.Errorf("plugin %s not found", integration.Name)
	}

	// Set status to maintenance
	s.UpdateIntegration(integrationID, map[string]interface{}{
		"status": domain.StatusMaintenance,
	})

	// Perform plugin-specific maintenance
	// This would call plugin maintenance methods if they exist

	// Restore status
	s.UpdateIntegration(integrationID, map[string]interface{}{
		"status":     domain.StatusActive,
		"last_sync": time.Now(),
	})

	s.logger.WithField("integration_id", integrationID).Info("Maintenance completed")

	return nil
}

// Helper methods

func (s *integrationService) validateIntegrationConfig(integration *domain.Integration) error {
	if integration.Name == "" {
		return fmt.Errorf("integration name is required")
	}

	if integration.Type == "" {
		return fmt.Errorf("integration type is required")
	}

	return nil
}

func (s *integrationService) validatePlugin(plugin domain.IntegrationPlugin) error {
	if plugin.Name() == "" {
		return fmt.Errorf("plugin name cannot be empty")
	}

	if plugin.Version() == "" {
		return fmt.Errorf("plugin version cannot be empty")
	}

	return nil
}

func (s *integrationService) updateOperationStatus(operationID, status, errorMsg string, result map[string]interface{}) {
	updates := map[string]interface{}{
		"status": status,
	}

	if errorMsg != "" {
		updates["error"] = errorMsg
	}

	if result != nil {
		updates["result"] = result
	}

	if status == "completed" || status == "failed" {
		updates["completed_at"] = time.Now()
	}

	if err := s.operationRepo.Update(context.Background(), operationID, updates); err != nil {
		s.logger.WithError(err).WithField("operation_id", operationID).Error("Failed to update operation status")
	}
}
