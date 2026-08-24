package service

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strconv"
	"time"
)

// StrigaAuth реализует HMAC аутентификацию для Striga API
type StrigaAuth struct {
	apiKey    string
	apiSecret string
}

// NewStrigaAuth создает новый экземпляр StrigaAuth
func NewStrigaAuth(apiKey, apiSecret string) *StrigaAuth {
	return &StrigaAuth{
		apiKey:    apiKey,
		apiSecret: apiSecret,
	}
}

// GenerateSignature генерирует HMAC подпись для запроса
func (a *StrigaAuth) GenerateSignature(method, path, body string) (string, string, error) {
	// Генерируем timestamp
	timestamp := time.Now().Unix()
	timestampStr := strconv.FormatInt(timestamp, 10)

	// Создаем строку для подписи: method + path + timestamp + body
	signatureString := fmt.Sprintf("%s%s%s%s", method, path, timestampStr, body)

	// Создаем HMAC подпись
	h := hmac.New(sha256.New, []byte(a.apiSecret))
	h.Write([]byte(signatureString))
	signature := hex.EncodeToString(h.Sum(nil))

	return signature, timestampStr, nil
}

// GenerateHeaders генерирует заголовки для аутентификации
func (a *StrigaAuth) GenerateHeaders(method, path, body string) (map[string]string, error) {
	signature, timestamp, err := a.GenerateSignature(method, path, body)
	if err != nil {
		return nil, err
	}

	headers := map[string]string{
		"X-API-Key":    a.apiKey,
		"X-Timestamp":  timestamp,
		"X-Signature":  signature,
		"Content-Type": "application/json",
	}

	return headers, nil
}

// VerifyWebhookSignature проверяет подпись webhook от Striga
func (a *StrigaAuth) VerifyWebhookSignature(payload, signature, timestamp string) bool {
	// Создаем строку для проверки: payload + timestamp
	expectedString := fmt.Sprintf("%s%s", payload, timestamp)

	// Создаем HMAC подпись
	h := hmac.New(sha256.New, []byte(a.apiSecret))
	h.Write([]byte(expectedString))
	expectedSignature := hex.EncodeToString(h.Sum(nil))

	// Сравниваем подписи
	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}
