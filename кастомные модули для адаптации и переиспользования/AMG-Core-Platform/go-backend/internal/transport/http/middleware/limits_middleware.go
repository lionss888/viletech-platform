package middleware

import (
	"amg-flow-backend/internal/domain"
	"amg-flow-backend/internal/service"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// LimitsMiddleware middleware для автоматической проверки лимитов
type LimitsMiddleware struct {
	limitsService *service.LimitsService
}

// NewLimitsMiddleware создает новый middleware для лимитов
func NewLimitsMiddleware(limitsService *service.LimitsService) *LimitsMiddleware {
	return &LimitsMiddleware{
		limitsService: limitsService,
	}
}

// CheckLimitsBeforeTransaction проверяет лимиты перед транзакцией
func (m *LimitsMiddleware) CheckLimitsBeforeTransaction() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Получаем данные транзакции из контекста или тела запроса
		var transactionData struct {
			UserID        uuid.UUID       `json:"user_id"`
			Amount        decimal.Decimal `json:"amount"`
			Currency      string          `json:"currency"`
			Category      string          `json:"category"`
			Country       string          `json:"country,omitempty"`
			MCC           string          `json:"mcc,omitempty"`
			TransactionID *uuid.UUID      `json:"transaction_id,omitempty"`
		}

		// Пытаемся получить данные из тела запроса
		if err := c.ShouldBindJSON(&transactionData); err != nil {
			// Если не удалось получить из JSON, пропускаем проверку
			c.Next()
			return
		}

		// Проверяем, что у нас есть необходимые данные
		if transactionData.UserID == uuid.Nil || transactionData.Amount.IsZero() || transactionData.Currency == "" {
			c.Next()
			return
		}

		// Создаем запрос на проверку лимитов
		checkRequest := &domain.LimitCheckRequest{
			UserID:        transactionData.UserID,
			Amount:        transactionData.Amount,
			Currency:      transactionData.Currency,
			Category:      domain.LimitCategory(transactionData.Category),
			Country:       transactionData.Country,
			MCC:           transactionData.MCC,
			TransactionID: transactionData.TransactionID,
		}

		// Проверяем лимиты
		response, err := m.limitsService.CheckLimits(c.Request.Context(), checkRequest)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to check limits",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		// Если лимит превышен, блокируем операцию
		if !response.Allowed {
			c.JSON(http.StatusForbidden, gin.H{
				"error":      "Transaction blocked by limits",
				"details":    "One or more limits have been exceeded",
				"violations": response.Violations,
				"limits":     response.Limits,
			})
			c.Abort()
			return
		}

		// Сохраняем информацию о лимитах в контексте для дальнейшего использования
		c.Set("limits_response", response)
		c.Next()
	}
}

// RecordLimitUsageAfterTransaction записывает использование лимитов после транзакции
func (m *LimitsMiddleware) RecordLimitUsageAfterTransaction() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Выполняем основную логику сначала
		c.Next()

		// Проверяем, что операция была успешной
		if c.Writer.Status() < 200 || c.Writer.Status() >= 300 {
			return
		}

		// Получаем данные транзакции из контекста
		limitsResponse, exists := c.Get("limits_response")
		if !exists {
			return
		}

		response, ok := limitsResponse.(*domain.LimitCheckResponse)
		if !ok {
			return
		}

		// Получаем данные транзакции
		var transactionData struct {
			UserID        uuid.UUID       `json:"user_id"`
			Amount        decimal.Decimal `json:"amount"`
			Currency      string          `json:"currency"`
			TransactionID *uuid.UUID      `json:"transaction_id,omitempty"`
		}

		if err := c.ShouldBindJSON(&transactionData); err != nil {
			return
		}

		// Записываем использование для каждого затронутого лимита
		for _, limit := range response.Limits {
			usageRequest := &service.RecordLimitUsageRequest{
				UserID:        transactionData.UserID,
				LimitID:       limit.LimitID,
				Amount:        transactionData.Amount,
				TransactionID: transactionData.TransactionID,
			}

			// Игнорируем ошибки при записи использования
			_ = m.limitsService.RecordLimitUsage(c.Request.Context(), usageRequest)
		}
	}
}

// CheckLimitsForCardOperation проверяет лимиты для карточных операций
func (m *LimitsMiddleware) CheckLimitsForCardOperation() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Получаем данные карточной операции
		var cardOperation struct {
			UserID        uuid.UUID       `json:"user_id"`
			CardID        uuid.UUID       `json:"card_id"`
			Amount        decimal.Decimal `json:"amount"`
			Currency      string          `json:"currency"`
			Merchant      string          `json:"merchant,omitempty"`
			MCC           string          `json:"mcc,omitempty"`
			Country       string          `json:"country,omitempty"`
			TransactionID *uuid.UUID      `json:"transaction_id,omitempty"`
		}

		if err := c.ShouldBindJSON(&cardOperation); err != nil {
			c.Next()
			return
		}

		// Проверяем лимиты для карточных операций
		checkRequest := &domain.LimitCheckRequest{
			UserID:        cardOperation.UserID,
			Amount:        cardOperation.Amount,
			Currency:      cardOperation.Currency,
			Category:      domain.LimitCategoryCard,
			Country:       cardOperation.Country,
			MCC:           cardOperation.MCC,
			TransactionID: cardOperation.TransactionID,
		}

		response, err := m.limitsService.CheckLimits(c.Request.Context(), checkRequest)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to check card limits",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		if !response.Allowed {
			c.JSON(http.StatusForbidden, gin.H{
				"error":      "Card operation blocked by limits",
				"details":    "Card limits have been exceeded",
				"violations": response.Violations,
			})
			c.Abort()
			return
		}

		c.Set("card_limits_response", response)
		c.Next()
	}
}

// CheckLimitsForTransferOperation проверяет лимиты для переводов
func (m *LimitsMiddleware) CheckLimitsForTransferOperation() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Получаем данные перевода
		var transferData struct {
			UserID        uuid.UUID       `json:"user_id"`
			Amount        decimal.Decimal `json:"amount"`
			Currency      string          `json:"currency"`
			ToCountry     string          `json:"to_country,omitempty"`
			TransactionID *uuid.UUID      `json:"transaction_id,omitempty"`
		}

		if err := c.ShouldBindJSON(&transferData); err != nil {
			c.Next()
			return
		}

		// Проверяем лимиты для переводов
		checkRequest := &domain.LimitCheckRequest{
			UserID:        transferData.UserID,
			Amount:        transferData.Amount,
			Currency:      transferData.Currency,
			Category:      domain.LimitCategoryTransfer,
			Country:       transferData.ToCountry,
			TransactionID: transferData.TransactionID,
		}

		response, err := m.limitsService.CheckLimits(c.Request.Context(), checkRequest)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to check transfer limits",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		if !response.Allowed {
			c.JSON(http.StatusForbidden, gin.H{
				"error":      "Transfer blocked by limits",
				"details":    "Transfer limits have been exceeded",
				"violations": response.Violations,
			})
			c.Abort()
			return
		}

		c.Set("transfer_limits_response", response)
		c.Next()
	}
}
