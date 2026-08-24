package common

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"hash"
	"net/http"
	"strconv"
	"time"
)

// AuthProvider - интерфейс для провайдеров аутентификации
type AuthProvider interface {
	GetAuthHeaders(ctx context.Context, req *http.Request) (map[string]string, error)
	RefreshToken(ctx context.Context) error
}

// APIKeyAuth - аутентификация через API ключ
type APIKeyAuth struct {
	APIKey     string
	HeaderName string // по умолчанию "Authorization"
	Prefix     string // например "Bearer " или "ApiKey "
}

// NewAPIKeyAuth создаёт новый провайдер API ключ аутентификации
func NewAPIKeyAuth(apiKey, headerName, prefix string) *APIKeyAuth {
	if headerName == "" {
		headerName = "Authorization"
	}
	return &APIKeyAuth{
		APIKey:     apiKey,
		HeaderName: headerName,
		Prefix:     prefix,
	}
}

// GetAuthHeaders возвращает заголовки для API ключ аутентификации
func (a *APIKeyAuth) GetAuthHeaders(ctx context.Context, req *http.Request) (map[string]string, error) {
	headers := make(map[string]string)
	headers[a.HeaderName] = a.Prefix + a.APIKey
	return headers, nil
}

// RefreshToken для API ключ аутентификации не требуется
func (a *APIKeyAuth) RefreshToken(ctx context.Context) error {
	return nil // API ключи не требуют обновления
}

// HMACAuth - HMAC аутентификация (используется Striga и другими)
type HMACAuth struct {
	APIKey    string
	APISecret string
	Algorithm string // sha256, sha512, etc.
}

// NewHMACAuth создаёт новый провайдер HMAC аутентификации
func NewHMACAuth(apiKey, apiSecret, algorithm string) *HMACAuth {
	if algorithm == "" {
		algorithm = "sha256"
	}
	return &HMACAuth{
		APIKey:    apiKey,
		APISecret: apiSecret,
		Algorithm: algorithm,
	}
}

// GetAuthHeaders возвращает заголовки для HMAC аутентификации
func (a *HMACAuth) GetAuthHeaders(ctx context.Context, req *http.Request) (map[string]string, error) {
	timestamp := time.Now().Unix()
	timestampStr := strconv.FormatInt(timestamp, 10)

	// Создаём строку для подписи: timestamp + method + path + body
	signatureString := timestampStr + req.Method + req.URL.Path

	// Если есть тело запроса, добавляем его
	if req.Body != nil && req.ContentLength > 0 {
		// Здесь нужно быть осторожным с чтением body
		// В реальной реализации лучше передавать body отдельно
		// signatureString += bodyString
	}

	// Создаём HMAC подпись
	signature, err := a.createHMACSignature(signatureString)
	if err != nil {
		return nil, fmt.Errorf("failed to create HMAC signature: %w", err)
	}

	headers := make(map[string]string)
	headers["X-API-Key"] = a.APIKey
	headers["X-Timestamp"] = timestampStr
	headers["X-Signature"] = signature

	return headers, nil
}

// RefreshToken для HMAC аутентификации не требуется
func (a *HMACAuth) RefreshToken(ctx context.Context) error {
	return nil
}

// createHMACSignature создаёт HMAC подпись
func (a *HMACAuth) createHMACSignature(data string) (string, error) {
	var hash func() hash.Hash

	switch a.Algorithm {
	case "sha256":
		hash = sha256.New
	default:
		return "", fmt.Errorf("unsupported HMAC algorithm: %s", a.Algorithm)
	}

	h := hmac.New(hash, []byte(a.APISecret))
	h.Write([]byte(data))
	signature := hex.EncodeToString(h.Sum(nil))

	return signature, nil
}

// OAuth2Auth - OAuth 2.0 аутентификация (для RailsR и других)
type OAuth2Auth struct {
	ClientID     string
	ClientSecret string
	TokenURL     string
	AccessToken  string
	RefreshToken string
	ExpiresAt    time.Time
	httpClient   *http.Client
}

// NewOAuth2Auth создаёт новый провайдер OAuth 2.0 аутентификации
func NewOAuth2Auth(clientID, clientSecret, tokenURL string) *OAuth2Auth {
	return &OAuth2Auth{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		TokenURL:     tokenURL,
		httpClient:   &http.Client{Timeout: 30 * time.Second},
	}
}

// GetAuthHeaders возвращает заголовки для OAuth 2.0 аутентификации
func (a *OAuth2Auth) GetAuthHeaders(ctx context.Context, req *http.Request) (map[string]string, error) {
	// Проверяем, не истёк ли токен
	if time.Now().After(a.ExpiresAt.Add(-5 * time.Minute)) {
		if err := a.RefreshToken(ctx); err != nil {
			return nil, fmt.Errorf("failed to refresh token: %w", err)
		}
	}

	headers := make(map[string]string)
	headers["Authorization"] = "Bearer " + a.AccessToken
	return headers, nil
}

// RefreshToken обновляет OAuth 2.0 токен
func (a *OAuth2Auth) RefreshToken(ctx context.Context) error {
	// Реализация обновления токена через refresh_token grant
	// Это упрощённая версия, в реальности нужно больше логики

	// Подготавливаем данные для запроса токена
	data := map[string]string{
		"grant_type":    "refresh_token",
		"refresh_token": a.RefreshToken,
		"client_id":     a.ClientID,
		"client_secret": a.ClientSecret,
	}

	// Здесь должна быть реализация POST запроса к TokenURL
	// с обновлением AccessToken, RefreshToken и ExpiresAt
	// Пока оставляем заглушку

	return fmt.Errorf("OAuth2 token refresh not implemented yet")
}

// BasicAuth - базовая аутентификация
type BasicAuth struct {
	Username string
	Password string
}

// NewBasicAuth создаёт новый провайдер базовой аутентификации
func NewBasicAuth(username, password string) *BasicAuth {
	return &BasicAuth{
		Username: username,
		Password: password,
	}
}

// GetAuthHeaders возвращает заголовки для базовой аутентификации
func (a *BasicAuth) GetAuthHeaders(ctx context.Context, req *http.Request) (map[string]string, error) {
	headers := make(map[string]string)

	// Устанавливаем Basic Auth через встроенный механизм HTTP
	req.SetBasicAuth(a.Username, a.Password)

	return headers, nil
}

// RefreshToken для базовой аутентификации не требуется
func (a *BasicAuth) RefreshToken(ctx context.Context) error {
	return nil
}

// CustomHeaderAuth - аутентификация через произвольные заголовки
type CustomHeaderAuth struct {
	Headers map[string]string
}

// NewCustomHeaderAuth создаёт новый провайдер аутентификации через заголовки
func NewCustomHeaderAuth(headers map[string]string) *CustomHeaderAuth {
	return &CustomHeaderAuth{
		Headers: headers,
	}
}

// GetAuthHeaders возвращает произвольные заголовки
func (a *CustomHeaderAuth) GetAuthHeaders(ctx context.Context, req *http.Request) (map[string]string, error) {
	return a.Headers, nil
}

// RefreshToken для произвольных заголовков не требуется
func (a *CustomHeaderAuth) RefreshToken(ctx context.Context) error {
	return nil
}
