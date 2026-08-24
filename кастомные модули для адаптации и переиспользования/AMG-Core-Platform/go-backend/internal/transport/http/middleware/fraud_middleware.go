package middleware

import (
	"net/http"
	"time"

	"amg-flow-backend/internal/domain"
	"amg-flow-backend/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// FraudMiddleware middleware для автоматической проверки фрод-контроля
type FraudMiddleware struct {
	fraudService *service.FraudService
}

// NewFraudMiddleware создает новый FraudMiddleware
func NewFraudMiddleware(fraudService *service.FraudService) *FraudMiddleware {
	return &FraudMiddleware{fraudService: fraudService}
}

// CheckFraudBeforeTransaction возвращает middleware для проверки фрод-контроля перед транзакцией
func (m *FraudMiddleware) CheckFraudBeforeTransaction() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Получаем данные транзакции из контекста или тела запроса
		var transactionData struct {
			UserID        uuid.UUID       `json:"user_id"`
			Amount        decimal.Decimal `json:"amount"`
			Currency      string          `json:"currency"`
			Country       string          `json:"country,omitempty"`
			IPAddress     string          `json:"ip_address,omitempty"`
			DeviceID      string          `json:"device_id,omitempty"`
			MerchantID    string          `json:"merchant_id,omitempty"`
			MCC           string          `json:"mcc,omitempty"`
			Latitude      *float64        `json:"latitude,omitempty"`
			Longitude     *float64        `json:"longitude,omitempty"`
			TransactionID *uuid.UUID      `json:"transaction_id,omitempty"`
		}

		// Пытаемся получить данные из тела запроса
		if err := c.ShouldBindJSON(&transactionData); err != nil {
			// Если не удалось получить из тела, используем заголовки или параметры
			userIDStr := c.GetHeader("X-User-ID")
			if userIDStr != "" {
				if userID, err := uuid.Parse(userIDStr); err == nil {
					transactionData.UserID = userID
				}
			}

			amountStr := c.GetHeader("X-Amount")
			if amountStr != "" {
				if amount, err := decimal.NewFromString(amountStr); err == nil {
					transactionData.Amount = amount
				}
			}

			transactionData.Currency = c.GetHeader("X-Currency")
			transactionData.Country = c.GetHeader("X-Country")
			transactionData.IPAddress = c.ClientIP()
			transactionData.DeviceID = c.GetHeader("X-Device-ID")
			transactionData.MerchantID = c.GetHeader("X-Merchant-ID")
			transactionData.MCC = c.GetHeader("X-MCC")
		}

		// Создаем запрос на проверку фрод-контроля
		fraudRequest := &domain.FraudCheckRequest{
			UserID:        transactionData.UserID,
			TransactionID: transactionData.TransactionID,
			EventType:     "transaction",
			Amount:        transactionData.Amount,
			Currency:      transactionData.Currency,
			Country:       transactionData.Country,
			IPAddress:     transactionData.IPAddress,
			DeviceID:      transactionData.DeviceID,
			MerchantID:    transactionData.MerchantID,
			MCC:           transactionData.MCC,
			Latitude:      transactionData.Latitude,
			Longitude:     transactionData.Longitude,
		}

		// Проверяем фрод-контроль
		response, err := m.fraudService.CheckFraudRules(c.Request.Context(), fraudRequest)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to check fraud rules",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		// Проверяем результат
		if !response.Allowed {
			c.JSON(http.StatusForbidden, gin.H{
				"error":           "Transaction blocked by fraud control",
				"details":         "Transaction has been flagged as potentially fraudulent",
				"risk_score":      response.RiskScore,
				"risk_level":      response.RiskLevel,
				"status":          response.Status,
				"violations":      response.Violations,
				"recommendations": response.Recommendations,
			})
			c.Abort()
			return
		}

		// Если транзакция требует рассмотрения, добавляем заголовки
		if response.Status == domain.FraudStatusReview {
			c.Header("X-Fraud-Status", "review")
			c.Header("X-Fraud-Risk-Score", string(rune(response.RiskScore)))
			c.Header("X-Fraud-Risk-Level", string(response.RiskLevel))
		}

		// Сохраняем результат проверки в контексте
		c.Set("fraud_check_result", response)
		c.Next()
	}
}

// CheckFraudForCardOperation возвращает middleware для проверки фрод-контроля карточных операций
func (m *FraudMiddleware) CheckFraudForCardOperation() gin.HandlerFunc {
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
			IPAddress     string          `json:"ip_address,omitempty"`
			DeviceID      string          `json:"device_id,omitempty"`
			TransactionID *uuid.UUID      `json:"transaction_id,omitempty"`
		}

		if err := c.ShouldBindJSON(&cardOperation); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid card operation data",
			})
			c.Abort()
			return
		}

		// Создаем запрос на проверку фрод-контроля
		fraudRequest := &domain.FraudCheckRequest{
			UserID:        cardOperation.UserID,
			TransactionID: cardOperation.TransactionID,
			EventType:     "card_operation",
			Amount:        cardOperation.Amount,
			Currency:      cardOperation.Currency,
			Country:       cardOperation.Country,
			IPAddress:     cardOperation.IPAddress,
			DeviceID:      cardOperation.DeviceID,
			MerchantID:    cardOperation.Merchant,
			MCC:           cardOperation.MCC,
		}

		// Проверяем фрод-контроль
		response, err := m.fraudService.CheckFraudRules(c.Request.Context(), fraudRequest)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to check fraud rules for card operation",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		// Проверяем результат
		if !response.Allowed {
			c.JSON(http.StatusForbidden, gin.H{
				"error":      "Card operation blocked by fraud control",
				"details":    "Card operation has been flagged as potentially fraudulent",
				"risk_score": response.RiskScore,
				"risk_level": response.RiskLevel,
				"status":     response.Status,
				"violations": response.Violations,
			})
			c.Abort()
			return
		}

		// Сохраняем результат проверки в контексте
		c.Set("fraud_check_result", response)
		c.Next()
	}
}

// CheckFraudForTransferOperation возвращает middleware для проверки фрод-контроля операций перевода
func (m *FraudMiddleware) CheckFraudForTransferOperation() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Получаем данные перевода
		var transferData struct {
			UserID        uuid.UUID       `json:"user_id"`
			Amount        decimal.Decimal `json:"amount"`
			Currency      string          `json:"currency"`
			ToCountry     string          `json:"to_country,omitempty"`
			IPAddress     string          `json:"ip_address,omitempty"`
			DeviceID      string          `json:"device_id,omitempty"`
			TransactionID *uuid.UUID      `json:"transaction_id,omitempty"`
		}

		if err := c.ShouldBindJSON(&transferData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid transfer data",
			})
			c.Abort()
			return
		}

		// Создаем запрос на проверку фрод-контроля
		fraudRequest := &domain.FraudCheckRequest{
			UserID:        transferData.UserID,
			TransactionID: transferData.TransactionID,
			EventType:     "transfer",
			Amount:        transferData.Amount,
			Currency:      transferData.Currency,
			Country:       transferData.ToCountry,
			IPAddress:     transferData.IPAddress,
			DeviceID:      transferData.DeviceID,
		}

		// Проверяем фрод-контроль
		response, err := m.fraudService.CheckFraudRules(c.Request.Context(), fraudRequest)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to check fraud rules for transfer",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		// Проверяем результат
		if !response.Allowed {
			c.JSON(http.StatusForbidden, gin.H{
				"error":      "Transfer blocked by fraud control",
				"details":    "Transfer has been flagged as potentially fraudulent",
				"risk_score": response.RiskScore,
				"risk_level": response.RiskLevel,
				"status":     response.Status,
				"violations": response.Violations,
			})
			c.Abort()
			return
		}

		// Сохраняем результат проверки в контексте
		c.Set("fraud_check_result", response)
		c.Next()
	}
}

// CheckFraudForLogin возвращает middleware для проверки фрод-контроля при входе
func (m *FraudMiddleware) CheckFraudForLogin() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Получаем данные входа
		var loginData struct {
			UserID    uuid.UUID `json:"user_id"`
			IPAddress string    `json:"ip_address,omitempty"`
			DeviceID  string    `json:"device_id,omitempty"`
			UserAgent string    `json:"user_agent,omitempty"`
		}

		if err := c.ShouldBindJSON(&loginData); err != nil {
			// Если не удалось получить из тела, используем заголовки
			userIDStr := c.GetHeader("X-User-ID")
			if userIDStr != "" {
				if userID, err := uuid.Parse(userIDStr); err == nil {
					loginData.UserID = userID
				}
			}

			loginData.IPAddress = c.ClientIP()
			loginData.DeviceID = c.GetHeader("X-Device-ID")
			loginData.UserAgent = c.GetHeader("User-Agent")
		}

		// Создаем запрос на проверку фрод-контроля
		fraudRequest := &domain.FraudCheckRequest{
			UserID:    loginData.UserID,
			EventType: "login",
			IPAddress: loginData.IPAddress,
			DeviceID:  loginData.DeviceID,
			EventData: map[string]interface{}{
				"user_agent": loginData.UserAgent,
				"timestamp":  time.Now().Unix(),
			},
		}

		// Проверяем фрод-контроль
		response, err := m.fraudService.CheckFraudRules(c.Request.Context(), fraudRequest)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to check fraud rules for login",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		// Проверяем результат
		if !response.Allowed {
			c.JSON(http.StatusForbidden, gin.H{
				"error":      "Login blocked by fraud control",
				"details":    "Login attempt has been flagged as potentially fraudulent",
				"risk_score": response.RiskScore,
				"risk_level": response.RiskLevel,
				"status":     response.Status,
				"violations": response.Violations,
			})
			c.Abort()
			return
		}

		// Сохраняем результат проверки в контексте
		c.Set("fraud_check_result", response)
		c.Next()
	}
}
