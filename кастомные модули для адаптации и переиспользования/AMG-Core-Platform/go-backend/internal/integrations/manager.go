package integrations

import (
	"context"
	"fmt"
	"sync"
	"time"

	"amg-flow-backend/internal/integrations/apaylo"
	"amg-flow-backend/internal/integrations/bitso"
	"amg-flow-backend/internal/integrations/common"
	"amg-flow-backend/internal/integrations/railsr"
	"amg-flow-backend/internal/integrations/striga"
)

// Manager - менеджер всех интеграций
type Manager struct {
	config  *Config
	logger  common.Logger
	clients map[string]common.Integration
	mu      sync.RWMutex
}

// Config - общая конфигурация интеграций
type Config struct {
	Striga *striga.Config `json:"striga,omitempty"`
	RailsR *railsr.Config `json:"railsr,omitempty"`
	Bitso  *bitso.Config  `json:"bitso,omitempty"`
	Apaylo *apaylo.Config `json:"apaylo,omitempty"`
}

// NewManager создаёт новый менеджер интеграций
func NewManager(config *Config, logger common.Logger) (*Manager, error) {
	manager := &Manager{
		config:  config,
		logger:  logger,
		clients: make(map[string]common.Integration),
	}

	// Инициализируем активные интеграции
	if err := manager.initializeClients(); err != nil {
		return nil, fmt.Errorf("failed to initialize integration clients: %w", err)
	}

	return manager, nil
}

// initializeClients инициализирует клиенты для активных интеграций
func (m *Manager) initializeClients() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Инициализация Striga
	if m.config.Striga != nil && m.config.Striga.Enabled {
		client, err := striga.NewClient(m.config.Striga, m.logger)
		if err != nil {
			return fmt.Errorf("failed to create Striga client: %w", err)
		}
		m.clients["striga"] = client
		m.logger.Info("Striga integration initialized")
	}

	// Инициализация RailsR
	if m.config.RailsR != nil && m.config.RailsR.Enabled {
		client, err := railsr.NewClient(m.config.RailsR, m.logger)
		if err != nil {
			return fmt.Errorf("failed to create RailsR client: %w", err)
		}
		m.clients["railsr"] = client
		m.logger.Info("RailsR integration initialized")
	}

	// Инициализация Bitso
	if m.config.Bitso != nil && m.config.Bitso.Enabled {
		client, err := bitso.NewClient(m.config.Bitso, m.logger)
		if err != nil {
			return fmt.Errorf("failed to create Bitso client: %w", err)
		}
		m.clients["bitso"] = client
		m.logger.Info("Bitso integration initialized")
	}

	// Инициализация Apaylo
	if m.config.Apaylo != nil && m.config.Apaylo.Enabled {
		client, err := apaylo.NewClient(m.config.Apaylo, m.logger)
		if err != nil {
			return fmt.Errorf("failed to create Apaylo client: %w", err)
		}
		m.clients["apaylo"] = client
		m.logger.Info("Apaylo integration initialized")
	}

	return nil
}

// GetClient возвращает клиент интеграции по имени
func (m *Manager) GetClient(name string) (common.Integration, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	client, exists := m.clients[name]
	if !exists {
		return nil, fmt.Errorf("integration '%s' not found or not enabled", name)
	}

	return client, nil
}

// GetStrigaClient возвращает типизированный клиент Striga
func (m *Manager) GetStrigaClient() (*striga.Client, error) {
	client, err := m.GetClient("striga")
	if err != nil {
		return nil, err
	}

	strigaClient, ok := client.(*striga.Client)
	if !ok {
		return nil, fmt.Errorf("invalid Striga client type")
	}

	return strigaClient, nil
}

// GetRailsRClient возвращает типизированный клиент RailsR
func (m *Manager) GetRailsRClient() (*railsr.Client, error) {
	client, err := m.GetClient("railsr")
	if err != nil {
		return nil, err
	}

	railsrClient, ok := client.(*railsr.Client)
	if !ok {
		return nil, fmt.Errorf("invalid RailsR client type")
	}

	return railsrClient, nil
}

// GetBitsoClient возвращает типизированный клиент Bitso
func (m *Manager) GetBitsoClient() (*bitso.Client, error) {
	client, err := m.GetClient("bitso")
	if err != nil {
		return nil, err
	}

	bitsoClient, ok := client.(*bitso.Client)
	if !ok {
		return nil, fmt.Errorf("invalid Bitso client type")
	}

	return bitsoClient, nil
}

// GetApayloClient возвращает типизированный клиент Apaylo
func (m *Manager) GetApayloClient() (*apaylo.Client, error) {
	client, err := m.GetClient("apaylo")
	if err != nil {
		return nil, err
	}

	apayloClient, ok := client.(*apaylo.Client)
	if !ok {
		return nil, fmt.Errorf("invalid Apaylo client type")
	}

	return apayloClient, nil
}

// GetActiveIntegrations возвращает список активных интеграций
func (m *Manager) GetActiveIntegrations() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()

	integrations := make([]string, 0, len(m.clients))
	for name := range m.clients {
		integrations = append(integrations, name)
	}

	return integrations
}

// HealthCheck проверяет состояние всех интеграций
func (m *Manager) HealthCheck(ctx context.Context) map[string]error {
	m.mu.RLock()
	defer m.mu.RUnlock()

	results := make(map[string]error)

	for name, client := range m.clients {
		m.logger.Debug("Checking health", map[string]interface{}{
			"integration": name,
		})

		if err := client.HealthCheck(ctx); err != nil {
			results[name] = err
			m.logger.Error("Health check failed", map[string]interface{}{
				"integration": name,
				"error":       err.Error(),
			})
		} else {
			results[name] = nil
			m.logger.Debug("Health check passed", map[string]interface{}{
				"integration": name,
			})
		}
	}

	return results
}

// HealthCheckSummary возвращает сводку по состоянию интеграций
func (m *Manager) HealthCheckSummary(ctx context.Context) HealthSummary {
	results := m.HealthCheck(ctx)

	summary := HealthSummary{
		Timestamp: time.Now(),
		Total:     len(results),
		Healthy:   0,
		Unhealthy: 0,
		Details:   make(map[string]string),
	}

	for name, err := range results {
		if err == nil {
			summary.Healthy++
			summary.Details[name] = "healthy"
		} else {
			summary.Unhealthy++
			summary.Details[name] = err.Error()
		}
	}

	if summary.Unhealthy == 0 {
		summary.Status = "healthy"
	} else if summary.Healthy == 0 {
		summary.Status = "unhealthy"
	} else {
		summary.Status = "degraded"
	}

	return summary
}

// Reload перезагружает конфигурацию и переинициализирует клиенты
func (m *Manager) Reload(config *Config) error {
	m.logger.Info("Reloading integrations configuration")

	m.mu.Lock()
	defer m.mu.Unlock()

	// Сохраняем старую конфигурацию на случай ошибки
	oldConfig := m.config
	oldClients := m.clients

	// Обновляем конфигурацию
	m.config = config
	m.clients = make(map[string]common.Integration)

	// Пытаемся инициализировать новые клиенты
	if err := m.initializeClients(); err != nil {
		// Откатываемся к старой конфигурации
		m.config = oldConfig
		m.clients = oldClients
		return fmt.Errorf("failed to reload integrations: %w", err)
	}

	m.logger.Info("Integrations configuration reloaded successfully")
	return nil
}

// Close закрывает все соединения
func (m *Manager) Close() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.logger.Info("Closing all integration clients")

	// Очищаем клиенты
	m.clients = make(map[string]common.Integration)

	return nil
}

// HealthSummary - сводка по состоянию интеграций
type HealthSummary struct {
	Status    string            `json:"status"` // healthy, unhealthy, degraded
	Total     int               `json:"total"`
	Healthy   int               `json:"healthy"`
	Unhealthy int               `json:"unhealthy"`
	Timestamp time.Time         `json:"timestamp"`
	Details   map[string]string `json:"details"`
}
