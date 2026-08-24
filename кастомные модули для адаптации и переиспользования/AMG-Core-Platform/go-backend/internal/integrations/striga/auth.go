package striga

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"amg-flow-backend/internal/integrations/common"
)

// StrigaAuth - специализированная аутентификация для Striga API
type StrigaAuth struct {
	APIKey    string
	APISecret string
	logger    common.Logger
}

// NewStrigaAuth создаёт новый провайдер аутентификации для Striga
func NewStrigaAuth(apiKey, apiSecret string, logger common.Logger) *StrigaAuth {
	return &StrigaAuth{
		APIKey:    apiKey,
		APISecret: apiSecret,
		logger:    logger,
	}
}

// GetAuthHeaders возвращает заголовки для Striga API согласно их документации
func (a *StrigaAuth) GetAuthHeaders(ctx context.Context, req *http.Request) (map[string]string, error) {
	timestamp := time.Now().Unix()
	timestampStr := strconv.FormatInt(timestamp, 10)

	// Читаем body если есть
	var bodyString string
	if req.Body != nil {
		bodyBytes, err := io.ReadAll(req.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to read request body: %w", err)
		}
		bodyString = string(bodyBytes)

		// Восстанавливаем body для последующего использования
		req.Body = io.NopCloser(strings.NewReader(bodyString))
		req.ContentLength = int64(len(bodyBytes))
	}

	// Создаём строку для подписи согласно Striga API:
	// timestamp + method + path + query + body
	signatureString := timestampStr + req.Method + req.URL.Path

	// Добавляем query parameters если есть
	if req.URL.RawQuery != "" {
		signatureString += "?" + req.URL.RawQuery
	}

	// Добавляем body если есть
	if bodyString != "" {
		signatureString += bodyString
	}

	a.logger.Debug("Creating Striga signature", map[string]interface{}{
		"timestamp": timestampStr,
		"method":    req.Method,
		"path":      req.URL.Path,
		"query":     req.URL.RawQuery,
		"body_len":  len(bodyString),
	})

	// Создаём HMAC-SHA256 подпись
	signature, err := a.createHMACSignature(signatureString)
	if err != nil {
		return nil, fmt.Errorf("failed to create Striga signature: %w", err)
	}

	headers := make(map[string]string)
	headers["Authorization"] = "HMAC " + a.APIKey + ":" + signature + ":" + timestampStr
	headers["Content-Type"] = "application/json"
	headers["Accept"] = "application/json"

	return headers, nil
}

// RefreshToken для HMAC аутентификации не требуется
func (a *StrigaAuth) RefreshToken(ctx context.Context) error {
	return nil
}

// createHMACSignature создаёт HMAC-SHA256 подпись для Striga
func (a *StrigaAuth) createHMACSignature(data string) (string, error) {
	h := hmac.New(sha256.New, []byte(a.APISecret))
	h.Write([]byte(data))
	signature := hex.EncodeToString(h.Sum(nil))
	return signature, nil
}

// ValidateWebhookSignature проверяет подпись webhook'а от Striga
func (a *StrigaAuth) ValidateWebhookSignature(payload []byte, signature string) bool {
	expectedSignature, err := a.createHMACSignature(string(payload))
	if err != nil {
		a.logger.Error("Failed to create webhook signature", map[string]interface{}{
			"error": err.Error(),
		})
		return false
	}

	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}
