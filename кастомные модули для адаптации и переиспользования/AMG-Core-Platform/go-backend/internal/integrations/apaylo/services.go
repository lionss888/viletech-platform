package apaylo

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"amg-flow-backend/internal/integrations/common"

	"github.com/shopspring/decimal"
)

// PaymentService - сервис для обработки платежей Apaylo
type PaymentService struct {
	client *Client
}

// NewPaymentService создаёт новый PaymentService
func NewPaymentService(client *Client) *PaymentService {
	return &PaymentService{client: client}
}

// ProcessPayment обрабатывает платёж
func (s *PaymentService) ProcessPayment(ctx context.Context, req common.PaymentRequest) (*common.PaymentResponse, error) {
	// Конвертируем общий запрос в формат Apaylo
	apayloReq := map[string]interface{}{
		"amount":      req.Amount,
		"currency":    req.Currency,
		"description": req.Description,
		"reference":   req.Reference,
		"metadata":    req.Metadata,
	}

	var response map[string]interface{}
	err := s.client.SendRequest(ctx, "POST", "/payments", apayloReq, &response)
	if err != nil {
		return nil, fmt.Errorf("failed to process Apaylo payment: %w", err)
	}

	// Конвертируем ответ в общий формат
	paymentResp := &common.PaymentResponse{
		PaymentID: getStringFromMap(response, "payment_id"),
		Status:    common.Status(getStringFromMap(response, "status")),
		Amount:    req.Amount,
		Currency:  req.Currency,
	}

	if redirectURL := getStringFromMap(response, "redirect_url"); redirectURL != "" {
		paymentResp.RedirectURL = redirectURL
	}

	if transactionID := getStringFromMap(response, "transaction_id"); transactionID != "" {
		paymentResp.TransactionID = transactionID
	}

	return paymentResp, nil
}

// GetPaymentStatus получает статус платежа
func (s *PaymentService) GetPaymentStatus(ctx context.Context, paymentID string) (*common.PaymentStatus, error) {
	path := fmt.Sprintf("/payments/%s", paymentID)

	var response map[string]interface{}
	err := s.client.SendRequest(ctx, "GET", path, nil, &response)
	if err != nil {
		return nil, fmt.Errorf("failed to get Apaylo payment status %s: %w", paymentID, err)
	}

	status := &common.PaymentStatus{
		PaymentID: paymentID,
		Status:    common.Status(getStringFromMap(response, "status")),
		Details:   getStringFromMap(response, "details"),
	}

	if amountStr := getStringFromMap(response, "amount"); amountStr != "" {
		if amount, err := decimal.NewFromString(amountStr); err == nil {
			status.Amount = amount
		}
	}

	if currency := getStringFromMap(response, "currency"); currency != "" {
		status.Currency = currency
	}

	if transactionID := getStringFromMap(response, "transaction_id"); transactionID != "" {
		status.TransactionID = transactionID
	}

	return status, nil
}

// RefundPayment возвращает платёж
func (s *PaymentService) RefundPayment(ctx context.Context, paymentID string, amount decimal.Decimal) error {
	path := fmt.Sprintf("/payments/%s/refund", paymentID)

	reqBody := map[string]interface{}{
		"amount": amount,
	}

	var response map[string]interface{}
	err := s.client.SendRequest(ctx, "POST", path, reqBody, &response)
	if err != nil {
		return fmt.Errorf("failed to refund Apaylo payment %s: %w", paymentID, err)
	}

	// Проверяем статус ответа
	if status := getStringFromMap(response, "status"); status != "success" {
		if errorMsg := getStringFromMap(response, "error"); errorMsg != "" {
			return fmt.Errorf("refund failed: %s", errorMsg)
		}
		return fmt.Errorf("refund failed with status: %s", status)
	}

	return nil
}

// ListPayments получает список платежей
func (s *PaymentService) ListPayments(ctx context.Context, limit, offset int) ([]map[string]interface{}, error) {
	path := "/payments"
	params := []string{}

	if limit > 0 {
		params = append(params, fmt.Sprintf("limit=%d", limit))
	}
	if offset > 0 {
		params = append(params, fmt.Sprintf("offset=%d", offset))
	}

	if len(params) > 0 {
		path += "?" + joinParams(params)
	}

	var response map[string]interface{}
	err := s.client.SendRequest(ctx, "GET", path, nil, &response)
	if err != nil {
		return nil, fmt.Errorf("failed to list Apaylo payments: %w", err)
	}

	// Извлекаем массив платежей из ответа
	if paymentsData, ok := response["payments"].([]interface{}); ok {
		payments := make([]map[string]interface{}, len(paymentsData))
		for i, payment := range paymentsData {
			if paymentMap, ok := payment.(map[string]interface{}); ok {
				payments[i] = paymentMap
			}
		}
		return payments, nil
	}

	return nil, fmt.Errorf("unexpected response format from Apaylo")
}

// GetPaymentMethods получает доступные методы платежа
func (s *PaymentService) GetPaymentMethods(ctx context.Context, currency string) ([]map[string]interface{}, error) {
	path := "/payment-methods"
	if currency != "" {
		path += "?currency=" + currency
	}

	var response map[string]interface{}
	err := s.client.SendRequest(ctx, "GET", path, nil, &response)
	if err != nil {
		return nil, fmt.Errorf("failed to get Apaylo payment methods: %w", err)
	}

	// Извлекаем методы платежа из ответа
	if methodsData, ok := response["methods"].([]interface{}); ok {
		methods := make([]map[string]interface{}, len(methodsData))
		for i, method := range methodsData {
			if methodMap, ok := method.(map[string]interface{}); ok {
				methods[i] = methodMap
			}
		}
		return methods, nil
	}

	return nil, fmt.Errorf("unexpected response format from Apaylo")
}

// WebhookService - сервис для обработки webhook'ов Apaylo
type WebhookService struct {
	client *Client
}

// NewWebhookService создаёт новый WebhookService
func NewWebhookService(client *Client) *WebhookService {
	return &WebhookService{client: client}
}

// ValidateWebhookSignature проверяет подпись webhook'а (базовая реализация)
func (s *WebhookService) ValidateWebhookSignature(payload []byte, signature string) bool {
	// Apaylo может использовать различные методы подписи
	// Здесь нужна реализация согласно документации Apaylo
	s.client.logger.Debug("Validating Apaylo webhook signature", map[string]interface{}{
		"signature_length": len(signature),
		"payload_length":   len(payload),
	})

	// TODO: Реализовать валидацию подписи согласно документации Apaylo
	return true
}

// ProcessWebhookEvent обрабатывает входящий webhook
func (s *WebhookService) ProcessWebhookEvent(ctx context.Context, payload []byte, signature string) (*common.WebhookEvent, error) {
	if !s.ValidateWebhookSignature(payload, signature) {
		return nil, fmt.Errorf("invalid webhook signature")
	}

	var rawEvent map[string]interface{}
	if err := json.Unmarshal(payload, &rawEvent); err != nil {
		return nil, fmt.Errorf("failed to parse webhook payload: %w", err)
	}

	// Конвертируем в общий формат webhook события
	event := &common.WebhookEvent{
		ID:        getStringFromMap(rawEvent, "id"),
		Type:      getStringFromMap(rawEvent, "type"),
		Payload:   rawEvent,
		Signature: signature,
	}

	if timestampStr := getStringFromMap(rawEvent, "timestamp"); timestampStr != "" {
		if timestamp, err := time.Parse(time.RFC3339, timestampStr); err == nil {
			event.Timestamp = timestamp
		}
	}

	// Логируем получение webhook'а
	s.client.logger.Info("Received Apaylo webhook", map[string]interface{}{
		"type": event.Type,
		"id":   event.ID,
	})

	return event, nil
}

// Вспомогательные функции
func getStringFromMap(m map[string]interface{}, key string) string {
	if value, ok := m[key]; ok {
		if str, ok := value.(string); ok {
			return str
		}
	}
	return ""
}

func joinParams(params []string) string {
	result := ""
	for i, param := range params {
		if i > 0 {
			result += "&"
		}
		result += param
	}
	return result
}
