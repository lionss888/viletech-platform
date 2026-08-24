package railsr

import (
	"context"
	"fmt"

	"amg-flow-backend/internal/integrations/common"
)

// Client - клиент для работы с RailsR Banking API
type Client struct {
	*common.BaseClient
	config             *Config
	logger             common.Logger
	accountService     *AccountService
	cardService        *CardService
	transactionService *TransactionService
	customerService    *CustomerService
}

// Config - конфигурация для RailsR
type Config struct {
	common.IntegrationConfig
	Environment   string `json:"environment"` // PLAY, PLAYLive
	ClientID      string `json:"client_id"`
	ClientSecret  string `json:"client_secret"`
	TokenURL      string `json:"token_url"`
	WebhookSecret string `json:"webhook_secret"`
}

// NewClient создаёт новый клиент RailsR
func NewClient(config *Config, logger common.Logger) (*Client, error) {
	if config.APIKey == "" {
		return nil, fmt.Errorf("RailsR API key is required")
	}

	if config.Environment == "" {
		config.Environment = "PLAY" // По умолчанию sandbox
	}

	// Создаём специализированную аутентификацию для RailsR
	var authProvider common.AuthProvider
	if config.ClientID != "" && config.ClientSecret != "" {
		authProvider = NewRailsRAuth(config.ClientID, config.ClientSecret, config.TokenURL, config.Environment, logger)
	} else {
		// Fallback на API key аутентификацию
		authProvider = common.NewAPIKeyAuth(config.APIKey, "Authorization", "Bearer ")
	}

	// Создаём базовый клиент
	baseClient := common.NewBaseClient(config.IntegrationConfig, authProvider, logger)

	client := &Client{
		BaseClient: baseClient,
		config:     config,
		logger:     logger,
	}

	// Инициализируем сервисы
	client.accountService = NewAccountService(client)
	client.cardService = NewCardService(client)
	client.transactionService = NewTransactionService(client)
	client.customerService = NewCustomerService(client)

	return client, nil
}

// Name возвращает имя интеграции
func (c *Client) Name() string {
	return "RailsR Banking API"
}

// Version возвращает версию API
func (c *Client) Version() string {
	return "v1"
}

// GetConfig возвращает конфигурацию
func (c *Client) GetConfig() common.IntegrationConfig {
	return c.config.IntegrationConfig
}

// GetAccountService возвращает сервис для работы со счетами
func (c *Client) GetAccountService() *AccountService {
	return c.accountService
}

// GetCardService возвращает сервис для работы с картами
func (c *Client) GetCardService() *CardService {
	return c.cardService
}

// GetTransactionService возвращает сервис для работы с транзакциями
func (c *Client) GetTransactionService() *TransactionService {
	return c.transactionService
}

// GetCustomerService возвращает сервис для работы с клиентами
func (c *Client) GetCustomerService() *CustomerService {
	return c.customerService
}

// HealthCheck проверяет доступность RailsR API
func (c *Client) HealthCheck(ctx context.Context) error {
	// RailsR использует endpoint для проверки статуса
	var response HealthResponse
	if err := c.Get(ctx, "/v1/health", &response); err != nil {
		return fmt.Errorf("RailsR health check failed: %w", err)
	}

	if response.Status != "UP" {
		return fmt.Errorf("RailsR API is unhealthy: %s", response.Status)
	}

	return nil
}

// GetAccountService возвращает сервис для работы со счетами
func (c *Client) GetAccountService() *AccountService {
	return NewAccountService(c, c.logger)
}

// GetCardService возвращает сервис для работы с картами
func (c *Client) GetCardService() *CardService {
	return NewCardService(c, c.logger)
}

// GetTransactionService возвращает сервис для работы с транзакциями
func (c *Client) GetTransactionService() *TransactionService {
	return NewTransactionService(c, c.logger)
}

// GetWebhookService возвращает сервис для работы с webhook'ами
func (c *Client) GetWebhookService() *WebhookService {
	return NewWebhookService(c, c.logger)
}

// HealthResponse - ответ на health check
type HealthResponse struct {
	Status      string `json:"status"`
	Environment string `json:"environment"`
	Version     string `json:"version"`
	Timestamp   string `json:"timestamp"`
}
