package striga

import (
	"context"
	"fmt"

	"amg-flow-backend/internal/integrations/common"
)

// Client - клиент для работы со Striga Banking Platform API
type Client struct {
	*common.BaseClient
	config *Config
	logger common.Logger
}

// Config - конфигурация для Striga
type Config struct {
	common.IntegrationConfig
	WebhookSecret string `json:"webhook_secret"`
	Environment   string `json:"environment"` // sandbox, production
}

// NewClient создаёт новый клиент Striga
func NewClient(config *Config, logger common.Logger) (*Client, error) {
	if config.APIKey == "" {
		return nil, fmt.Errorf("Striga API key is required")
	}

	if config.APISecret == "" {
		return nil, fmt.Errorf("Striga API secret is required")
	}

	// Создаём специализированную аутентификацию для Striga
	authProvider := NewStrigaAuth(config.APIKey, config.APISecret, logger)

	// Создаём базовый клиент
	baseClient := common.NewBaseClient(config.IntegrationConfig, authProvider, logger)

	client := &Client{
		BaseClient: baseClient,
		config:     config,
		logger:     logger,
	}

	// Инициализируем сервисы
	client.userService = NewUserService(client)
	client.walletService = NewWalletService(client)
	client.cardService = NewCardService(client)
	client.transactionService = NewTransactionService(client)
	client.webhookService = NewWebhookService(client)

	return client, nil
}

// Name возвращает имя интеграции
func (c *Client) Name() string {
	return "Striga Banking Platform"
}

// Version возвращает версию API
func (c *Client) Version() string {
	return "v1"
}

// GetConfig возвращает конфигурацию
func (c *Client) GetConfig() common.IntegrationConfig {
	return c.config.IntegrationConfig
}

// GetUserService возвращает сервис для работы с пользователями
func (c *Client) GetUserService() *UserService {
	return c.userService
}

// GetWalletService возвращает сервис для работы с кошельками
func (c *Client) GetWalletService() *WalletService {
	return c.walletService
}

// GetCardService возвращает сервис для работы с картами
func (c *Client) GetCardService() *CardService {
	return c.cardService
}

// GetTransactionService возвращает сервис для работы с транзакциями
func (c *Client) GetTransactionService() *TransactionService {
	return c.transactionService
}

// GetWebhookService возвращает сервис для работы с webhook'ами
func (c *Client) GetWebhookService() *WebhookService {
	return c.webhookService
}

// HealthCheck проверяет доступность Striga API
func (c *Client) HealthCheck(ctx context.Context) error {
	// Используем endpoint для проверки статуса
	var response HealthResponse
	if err := c.Get(ctx, "/v1/health", &response); err != nil {
		return fmt.Errorf("Striga health check failed: %w", err)
	}

	if response.Status != "healthy" {
		return fmt.Errorf("Striga API is unhealthy: %s", response.Status)
	}

	return nil
}

// GetUserService возвращает сервис для работы с пользователями
func (c *Client) GetUserService() *UserService {
	return NewUserService(c, c.logger)
}

// GetWalletService возвращает сервис для работы с кошельками
func (c *Client) GetWalletService() *WalletService {
	return NewWalletService(c, c.logger)
}

// GetCardService возвращает сервис для работы с картами
func (c *Client) GetCardService() *CardService {
	return NewCardService(c, c.logger)
}

// GetTransactionService возвращает сервис для работы с транзакциями
func (c *Client) GetTransactionService() *TransactionService {
	return NewTransactionService(c, c.logger)
}

// GetKYCService возвращает сервис для работы с KYC
func (c *Client) GetKYCService() *KYCService {
	return NewKYCService(c, c.logger)
}

// GetWebhookService возвращает сервис для работы с webhook'ами
func (c *Client) GetWebhookService() *WebhookService {
	return NewWebhookService(c, c.logger)
}

// HealthResponse - ответ на health check
type HealthResponse struct {
	Status  string `json:"status"`
	Version string `json:"version"`
	Time    string `json:"time"`
}
