package bitso

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

// BitsoAuth - специализированная аутентификация для Bitso API
type BitsoAuth struct {
	APIKey    string
	APISecret string
	logger    common.Logger
}

// NewBitsoAuth создаёт новый провайдер аутентификации для Bitso
func NewBitsoAuth(apiKey, apiSecret string, logger common.Logger) *BitsoAuth {
	return &BitsoAuth{
		APIKey:    apiKey,
		APISecret: apiSecret,
		logger:    logger,
	}
}

// GetAuthHeaders возвращает заголовки для Bitso API согласно их документации
func (a *BitsoAuth) GetAuthHeaders(ctx context.Context, req *http.Request) (map[string]string, error) {
	// Bitso использует millisecond nonce
	nonce := strconv.FormatInt(time.Now().UnixMilli(), 10)

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

	// Создаём строку для подписи согласно Bitso API:
	// nonce + method + request_path + body
	message := nonce + req.Method + req.URL.Path

	// Добавляем query parameters если есть
	if req.URL.RawQuery != "" {
		message += "?" + req.URL.RawQuery
	}

	// Добавляем body если есть
	if bodyString != "" {
		message += bodyString
	}

	a.logger.Debug("Creating Bitso signature", map[string]interface{}{
		"nonce":    nonce,
		"method":   req.Method,
		"path":     req.URL.Path,
		"query":    req.URL.RawQuery,
		"body_len": len(bodyString),
	})

	// Создаём HMAC-SHA256 подпись
	signature, err := a.createHMACSignature(message)
	if err != nil {
		return nil, fmt.Errorf("failed to create Bitso signature: %w", err)
	}

	headers := make(map[string]string)
	// Bitso использует специфичный формат Authorization header
	headers["Authorization"] = fmt.Sprintf("Bitso %s:%s:%s", a.APIKey, nonce, signature)
	headers["Content-Type"] = "application/json"
	headers["Accept"] = "application/json"

	return headers, nil
}

// RefreshToken для HMAC аутентификации не требуется
func (a *BitsoAuth) RefreshToken(ctx context.Context) error {
	return nil
}

// createHMACSignature создаёт HMAC-SHA256 подпись для Bitso
func (a *BitsoAuth) createHMACSignature(message string) (string, error) {
	h := hmac.New(sha256.New, []byte(a.APISecret))
	h.Write([]byte(message))
	signature := hex.EncodeToString(h.Sum(nil))
	return signature, nil
}

// ValidateWebhookSignature проверяет подпись webhook'а от Bitso (если поддерживается)
func (a *BitsoAuth) ValidateWebhookSignature(payload []byte, signature string) bool {
	expectedSignature, err := a.createHMACSignature(string(payload))
	if err != nil {
		a.logger.Error("Failed to create webhook signature", map[string]interface{}{
			"error": err.Error(),
		})
		return false
	}

	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}
