package service

import (
	"context"
	"encoding/json"
	"fmt"

	"amg-flow-backend/pkg/logger"
)

// StrigaWebhookService обрабатывает webhook события от Striga
type StrigaWebhookService struct {
	userService        *StrigaUserService
	walletService      *StrigaWalletService
	cardService        *StrigaCardService
	transactionService *StrigaTransactionService
	logger             logger.Logger
}

// NewStrigaWebhookService создает новый сервис для обработки webhook'ов
func NewStrigaWebhookService(
	userService *StrigaUserService,
	walletService *StrigaWalletService,
	cardService *StrigaCardService,
	transactionService *StrigaTransactionService,
	logger logger.Logger,
) *StrigaWebhookService {
	return &StrigaWebhookService{
		userService:        userService,
		walletService:      walletService,
		cardService:        cardService,
		transactionService: transactionService,
		logger:             logger,
	}
}

// ProcessWebhook обрабатывает входящий webhook от Striga
func (s *StrigaWebhookService) ProcessWebhook(ctx context.Context, eventType string, payload []byte) error {
	s.logger.Infof("Processing webhook event: %s", eventType)

	switch eventType {
	case "user.kyc.updated":
		return s.handleKYCWebhook(ctx, payload)
	case "card.status.changed":
		return s.handleCardWebhook(ctx, payload)
	case "transaction.status.changed":
		return s.handleTransactionWebhook(ctx, payload)
	case "wallet.balance.updated":
		return s.handleWalletWebhook(ctx, payload)
	default:
		s.logger.Warnf("Unknown webhook event type: %s", eventType)
		return nil // Не критичная ошибка для неизвестных событий
	}
}

// handleKYCWebhook обрабатывает KYC webhook
func (s *StrigaWebhookService) handleKYCWebhook(ctx context.Context, payload []byte) error {
	var kycWebhook KYCWebhook
	if err := json.Unmarshal(payload, &kycWebhook); err != nil {
		return fmt.Errorf("failed to unmarshal KYC webhook: %w", err)
	}

	s.logger.Infof("Processing KYC webhook for user %s, status: %s", kycWebhook.UserID, kycWebhook.Status)

	switch kycWebhook.Status {
	case KYCStatusApproved:
		return s.handleKYCApproved(ctx, &kycWebhook)
	case KYCStatusOnHold:
		return s.handleKYCHold(ctx, &kycWebhook)
	case KYCStatusRejected:
		return s.handleKYCRejected(ctx, &kycWebhook)
	case KYCStatusRejectedFinal:
		return s.handleKYCRejectedFinal(ctx, &kycWebhook)
	default:
		s.logger.Warnf("Unknown KYC status: %s", kycWebhook.Status)
		return nil
	}
}

// handleKYCApproved обрабатывает одобрение KYC
func (s *StrigaWebhookService) handleKYCApproved(ctx context.Context, webhook *KYCWebhook) error {
	s.logger.Infof("KYC approved for user %s", webhook.UserID)
	
	// Здесь можно добавить логику:
	// - Уведомление пользователя
	// - Активация дополнительных сервисов
	// - Обновление статуса в локальной БД
	
	return nil
}

// handleKYCHold обрабатывает удержание KYC
func (s *StrigaWebhookService) handleKYCHold(ctx context.Context, webhook *KYCWebhook) error {
	s.logger.Infof("KYC on hold for user %s, reason: %s", webhook.UserID, webhook.Reason)
	
	// Здесь можно добавить логику:
	// - Уведомление пользователя о необходимости дополнительных документов
	// - Ограничение функциональности
	
	return nil
}

// handleKYCRejected обрабатывает отклонение KYC
func (s *StrigaWebhookService) handleKYCRejected(ctx context.Context, webhook *KYCWebhook) error {
	s.logger.Infof("KYC rejected for user %s, reason: %s", webhook.UserID, webhook.Reason)
	
	// Здесь можно добавить логику:
	// - Уведомление пользователя
	// - Ограничение функциональности
	// - Запрос на повторную подачу документов
	
	return nil
}

// handleKYCRejectedFinal обрабатывает окончательное отклонение KYC
func (s *StrigaWebhookService) handleKYCRejectedFinal(ctx context.Context, webhook *KYCWebhook) error {
	s.logger.Infof("KYC finally rejected for user %s, reason: %s", webhook.UserID, webhook.Reason)
	
	// Здесь можно добавить логику:
	// - Уведомление пользователя
	// - Блокировка аккаунта
	// - Возврат средств
	
	return nil
}

// handleCardWebhook обрабатывает карточные webhook'и
func (s *StrigaWebhookService) handleCardWebhook(ctx context.Context, payload []byte) error {
	var cardWebhook CardWebhook
	if err := json.Unmarshal(payload, &cardWebhook); err != nil {
		return fmt.Errorf("failed to unmarshal card webhook: %w", err)
	}

	s.logger.Infof("Processing card webhook for card %s, event: %s", cardWebhook.CardID, cardWebhook.EventType)

	switch cardWebhook.EventType {
	case "ACTIVATED":
		return s.handleCardActivated(ctx, &cardWebhook)
	case "BLOCKED":
		return s.handleCardBlocked(ctx, &cardWebhook)
	case "UNBLOCKED":
		return s.handleCardUnblocked(ctx, &cardWebhook)
	case "DELETED":
		return s.handleCardDeleted(ctx, &cardWebhook)
	default:
		s.logger.Warnf("Unknown card event type: %s", cardWebhook.EventType)
		return nil
	}
}

// handleCardActivated обрабатывает активацию карты
func (s *StrigaWebhookService) handleCardActivated(ctx context.Context, webhook *CardWebhook) error {
	s.logger.Infof("Card %s activated for user %s", webhook.CardID, webhook.UserID)
	
	// Здесь можно добавить логику:
	// - Уведомление пользователя
	// - Активация дополнительных сервисов
	
	return nil
}

// handleCardBlocked обрабатывает блокировку карты
func (s *StrigaWebhookService) handleCardBlocked(ctx context.Context, webhook *CardWebhook) error {
	s.logger.Infof("Card %s blocked for user %s", webhook.CardID, webhook.UserID)
	
	// Здесь можно добавить логику:
	// - Уведомление пользователя
	// - Ограничение функциональности
	
	return nil
}

// handleCardUnblocked обрабатывает разблокировку карты
func (s *StrigaWebhookService) handleCardUnblocked(ctx context.Context, webhook *CardWebhook) error {
	s.logger.Infof("Card %s unblocked for user %s", webhook.CardID, webhook.UserID)
	
	// Здесь можно добавить логику:
	// - Уведомление пользователя
	// - Восстановление функциональности
	
	return nil
}

// handleCardDeleted обрабатывает удаление карты
func (s *StrigaWebhookService) handleCardDeleted(ctx context.Context, webhook *CardWebhook) error {
	s.logger.Infof("Card %s deleted for user %s", webhook.CardID, webhook.UserID)
	
	// Здесь можно добавить логику:
	// - Уведомление пользователя
	// - Очистка связанных данных
	
	return nil
}

// handleTransactionWebhook обрабатывает транзакционные webhook'и
func (s *StrigaWebhookService) handleTransactionWebhook(ctx context.Context, payload []byte) error {
	var transactionWebhook TransactionWebhook
	if err := json.Unmarshal(payload, &transactionWebhook); err != nil {
		return fmt.Errorf("failed to unmarshal transaction webhook: %w", err)
	}

	s.logger.Infof("Processing transaction webhook for transaction %s, event: %s", 
		transactionWebhook.TransactionID, transactionWebhook.EventType)

	switch transactionWebhook.EventType {
	case "CREATED":
		return s.handleTransactionCreated(ctx, &transactionWebhook)
	case "APPROVED":
		return s.handleTransactionApproved(ctx, &transactionWebhook)
	case "REJECTED":
		return s.handleTransactionRejected(ctx, &transactionWebhook)
	case "COMPLETED":
		return s.handleTransactionCompleted(ctx, &transactionWebhook)
	default:
		s.logger.Warnf("Unknown transaction event type: %s", transactionWebhook.EventType)
		return nil
	}
}

// handleTransactionCreated обрабатывает создание транзакции
func (s *StrigaWebhookService) handleTransactionCreated(ctx context.Context, webhook *TransactionWebhook) error {
	s.logger.Infof("Transaction %s created for user %s, amount: %s %s", 
		webhook.TransactionID, webhook.UserID, webhook.Amount, webhook.Currency)
	
	// Здесь можно добавить логику:
	// - Уведомление пользователя
	// - Проверка лимитов
	// - Антифрод проверки
	
	return nil
}

// handleTransactionApproved обрабатывает одобрение транзакции
func (s *StrigaWebhookService) handleTransactionApproved(ctx context.Context, webhook *TransactionWebhook) error {
	s.logger.Infof("Transaction %s approved for user %s", webhook.TransactionID, webhook.UserID)
	
	// Здесь можно добавить логику:
	// - Уведомление пользователя
	// - Обновление баланса
	// - Логирование для аудита
	
	return nil
}

// handleTransactionRejected обрабатывает отклонение транзакции
func (s *StrigaWebhookService) handleTransactionRejected(ctx context.Context, webhook *TransactionWebhook) error {
	s.logger.Infof("Transaction %s rejected for user %s", webhook.TransactionID, webhook.UserID)
	
	// Здесь можно добавить логику:
	// - Уведомление пользователя
	// - Возврат средств
	// - Логирование для аудита
	
	return nil
}

// handleTransactionCompleted обрабатывает завершение транзакции
func (s *StrigaWebhookService) handleTransactionCompleted(ctx context.Context, webhook *TransactionWebhook) error {
	s.logger.Infof("Transaction %s completed for user %s", webhook.TransactionID, webhook.UserID)
	
	// Здесь можно добавить логику:
	// - Уведомление пользователя
	// - Обновление статистики
	// - Аналитика
	
	return nil
}

// handleWalletWebhook обрабатывает кошельковые webhook'и
func (s *StrigaWebhookService) handleWalletWebhook(ctx context.Context, payload []byte) error {
	s.logger.Infof("Processing wallet webhook")
	
	// Здесь можно добавить логику для обработки изменений баланса кошелька
	
	return nil
}
