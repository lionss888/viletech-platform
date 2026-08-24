package bitso

import (
	"context"
	"fmt"

	"amg-flow-backend/internal/integrations/common"
)

// Client - клиент для работы с Bitso Crypto Exchange API
type Client struct {
	*common.BaseClient
	config *Config
	logger common.Logger
}

// Config - конфигурация для Bitso
type Config struct {
	common.IntegrationConfig
	Environment string `json:"environment"` // sandbox, production
}

// NewClient создаёт новый клиент Bitso
func NewClient(config *Config, logger common.Logger) (*Client, error) {
	if config.APIKey == "" {
		return nil, fmt.Errorf("Bitso API key is required")
	}

	if config.APISecret == "" {
		return nil, fmt.Errorf("Bitso API secret is required")
	}

	if config.Environment == "" {
		config.Environment = "sandbox"
	}

	// Создаём специализированную аутентификацию для Bitso
	authProvider := NewBitsoAuth(config.APIKey, config.APISecret, logger)

	// Создаём базовый клиент
	baseClient := common.NewBaseClient(config.IntegrationConfig, authProvider, logger)

	client := &Client{
		BaseClient: baseClient,
		config:     config,
		logger:     logger,
	}

	// Инициализируем сервисы
	client.tradingService = NewTradingService(client)
	client.marketDataService = NewMarketDataService(client)
	client.accountService = NewAccountService(client)

	return client, nil
}

// Name возвращает имя интеграции
func (c *Client) Name() string {
	return "Bitso Crypto Exchange"
}

// Version возвращает версию API
func (c *Client) Version() string {
	return "v3"
}

// GetConfig возвращает конфигурацию
func (c *Client) GetConfig() common.IntegrationConfig {
	return c.config.IntegrationConfig
}

// GetTradingService возвращает сервис для торговых операций
func (c *Client) GetTradingService() *TradingService {
	return c.tradingService
}

// GetMarketDataService возвращает сервис для рыночных данных
func (c *Client) GetMarketDataService() *MarketDataService {
	return c.marketDataService
}

// GetAccountService возвращает сервис для управления аккаунтом
func (c *Client) GetAccountService() *AccountService {
	return c.accountService
}

// HealthCheck проверяет доступность Bitso API
func (c *Client) HealthCheck(ctx context.Context) error {
	// Bitso использует endpoint для получения доступных книг
	var response AvailableBooksResponse
	if err := c.Get(ctx, "/v3/available_books", &response); err != nil {
		return fmt.Errorf("Bitso health check failed: %w", err)
	}

	if !response.Success {
		return fmt.Errorf("Bitso API is unhealthy")
	}

	return nil
}

// GetTradingService возвращает сервис для торговли
func (c *Client) GetTradingService() *TradingService {
	return NewTradingService(c, c.logger)
}

// GetMarketDataService возвращает сервис для рыночных данных
func (c *Client) GetMarketDataService() *MarketDataService {
	return NewMarketDataService(c, c.logger)
}

// GetAccountService возвращает сервис для работы с аккаунтом
func (c *Client) GetAccountService() *AccountService {
	return NewAccountService(c, c.logger)
}

// AvailableBooksResponse - ответ на запрос доступных торговых пар
type AvailableBooksResponse struct {
	Success bool `json:"success"`
	Payload []struct {
		Book string `json:"book"`
	} `json:"payload"`
}
