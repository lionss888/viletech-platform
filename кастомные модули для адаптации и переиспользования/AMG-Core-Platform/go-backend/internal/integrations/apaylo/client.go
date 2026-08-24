package apaylo

import (
	"context"
	"fmt"

	"amg-flow-backend/internal/integrations/common"
)

// Client - клиент для работы с Apaylo Payment API
type Client struct {
	*common.BaseClient
	config         *Config
	logger         common.Logger
	paymentService *PaymentService
	webhookService *WebhookService
}

// Config - конфигурация для Apaylo
type Config struct {
	common.IntegrationConfig
	MerchantID    string `json:"merchant_id"`
	WebhookSecret string `json:"webhook_secret"`
	Environment   string `json:"environment"` // sandbox, production
}

// NewClient создаёт новый клиент Apaylo
func NewClient(config *Config, logger common.Logger) (*Client, error) {
	if config.APIKey == "" {
		return nil, fmt.Errorf("Apaylo API key is required")
	}

	if config.MerchantID == "" {
		return nil, fmt.Errorf("Apaylo merchant ID is required")
	}

	if config.Environment == "" {
		config.Environment = "sandbox"
	}

	// Создаём API key аутентификацию для Apaylo
	authProvider := common.NewAPIKeyAuth(config.APIKey, "Authorization", "Bearer ")

	// Создаём базовый клиент
	baseClient := common.NewBaseClient(config.IntegrationConfig, authProvider, logger)

	client := &Client{
		BaseClient: baseClient,
		config:     config,
		logger:     logger,
	}

	// Инициализируем сервисы
	client.paymentService = NewPaymentService(client)
	client.webhookService = NewWebhookService(client)

	return client, nil
}

// Name возвращает имя интеграции
func (c *Client) Name() string {
	return "Apaylo Payment API"
}

// Version возвращает версию API
func (c *Client) Version() string {
	return "v1"
}

// GetConfig возвращает конфигурацию
func (c *Client) GetConfig() common.IntegrationConfig {
	return c.config.IntegrationConfig
}

// GetPaymentService возвращает сервис для работы с платежами
func (c *Client) GetPaymentService() *PaymentService {
	return c.paymentService
}

// GetWebhookService возвращает сервис для работы с webhook'ами
func (c *Client) GetWebhookService() *WebhookService {
	return c.webhookService
}

// HealthCheck проверяет доступность Apaylo API
func (c *Client) HealthCheck(ctx context.Context) error {
	// Apaylo использует endpoint для проверки статуса
	var response HealthResponse
	if err := c.Get(ctx, "/v1/health", &response); err != nil {
		return fmt.Errorf("Apaylo health check failed: %w", err)
	}

	if response.Status != "healthy" {
		return fmt.Errorf("Apaylo API is unhealthy: %s", response.Status)
	}

	return nil
}

// GetPaymentService возвращает сервис для работы с платежами
func (c *Client) GetPaymentService() *PaymentService {
	return NewPaymentService(c, c.logger)
}

// GetSettlementService возвращает сервис для работы с расчётами
func (c *Client) GetSettlementService() *SettlementService {
	return NewSettlementService(c, c.logger)
}

// GetWebhookService возвращает сервис для работы с webhook'ами
func (c *Client) GetWebhookService() *WebhookService {
	return NewWebhookService(c, c.logger)
}

// HealthResponse - ответ на health check
type HealthResponse struct {
	Status    string `json:"status"`
	Version   string `json:"version"`
	Timestamp string `json:"timestamp"`
}
