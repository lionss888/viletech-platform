package service

import (
	"context"
	"amg-flow-backend/pkg/config"
	"amg-flow-backend/pkg/logger"
)

// StrigaService представляет основной сервис для работы с Striga API
type StrigaService struct {
	client            *StrigaClient
	userService       *StrigaUserService
	walletService     *StrigaWalletService
	cardService       *StrigaCardService
	transactionService *StrigaTransactionService
	webhookService    *StrigaWebhookService
	logger            logger.Logger
}

// NewStrigaService создает новый основной сервис Striga
func NewStrigaService(cfg *config.Config, logger logger.Logger) *StrigaService {
	// Создаем клиент
	client := NewStrigaClient(cfg.StrigaAPIURL, cfg.StrigaAPIKey, cfg.StrigaAPISecret, logger)

	// Создаем сервисы
	userService := NewStrigaUserService(client, logger)
	walletService := NewStrigaWalletService(client, logger)
	cardService := NewStrigaCardService(client, logger)
	transactionService := NewStrigaTransactionService(client, logger)

	// Создаем webhook сервис
	webhookService := NewStrigaWebhookService(userService, walletService, cardService, transactionService, logger)

	return &StrigaService{
		client:            client,
		userService:       userService,
		walletService:     walletService,
		cardService:       cardService,
		transactionService: transactionService,
		webhookService:    webhookService,
		logger:            logger,
	}
}

// GetUserService возвращает сервис для работы с пользователями
func (s *StrigaService) GetUserService() *StrigaUserService {
	return s.userService
}

// GetWalletService возвращает сервис для работы с кошельками
func (s *StrigaService) GetWalletService() *StrigaWalletService {
	return s.walletService
}

// GetCardService возвращает сервис для работы с картами
func (s *StrigaService) GetCardService() *StrigaCardService {
	return s.cardService
}

// GetTransactionService возвращает сервис для работы с транзакциями
func (s *StrigaService) GetTransactionService() *StrigaTransactionService {
	return s.transactionService
}

// GetClient возвращает базовый клиент
func (s *StrigaService) GetClient() *StrigaClient {
	return s.client
}

// GetWebhookService возвращает сервис для обработки webhook'ов
func (s *StrigaService) GetWebhookService() *StrigaWebhookService {
	return s.webhookService
}

// HealthCheck проверяет доступность Striga API
func (s *StrigaService) HealthCheck() error {
	s.logger.Info("Checking Striga API health")
	
	_, err := s.client.Get("/v1/health")
	if err != nil {
		s.logger.Errorf("Striga API health check failed: %v", err)
		return err
	}
	
	s.logger.Info("Striga API is healthy")
	return nil
}

// ProcessWebhook обрабатывает webhook события от Striga
func (s *StrigaService) ProcessWebhook(ctx context.Context, eventType string, payload []byte) error {
	return s.webhookService.ProcessWebhook(ctx, eventType, payload)
}
