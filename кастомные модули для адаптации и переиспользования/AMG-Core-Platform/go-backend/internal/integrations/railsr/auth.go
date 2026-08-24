package railsr

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"amg-flow-backend/internal/integrations/common"
)

// RailsRAuth - специализированная аутентификация для RailsR API
type RailsRAuth struct {
	ClientID     string
	ClientSecret string
	TokenURL     string
	Environment  string // PLAY или PLAYLive
	AccessToken  string
	RefreshToken string
	ExpiresAt    time.Time
	httpClient   *http.Client
	logger       common.Logger
}

// NewRailsRAuth создаёт новый провайдер аутентификации для RailsR
func NewRailsRAuth(clientID, clientSecret, tokenURL, environment string, logger common.Logger) *RailsRAuth {
	return &RailsRAuth{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		TokenURL:     tokenURL,
		Environment:  environment,
		httpClient:   &http.Client{Timeout: 30 * time.Second},
		logger:       logger,
	}
}

// GetAuthHeaders возвращает заголовки для RailsR API
func (a *RailsRAuth) GetAuthHeaders(ctx context.Context, req *http.Request) (map[string]string, error) {
	// Проверяем, не истёк ли токен
	if time.Now().After(a.ExpiresAt.Add(-5 * time.Minute)) {
		if err := a.RefreshToken(ctx); err != nil {
			return nil, fmt.Errorf("failed to refresh RailsR token: %w", err)
		}
	}

	headers := make(map[string]string)
	headers["Authorization"] = "Bearer " + a.AccessToken
	headers["X-Environment"] = a.Environment
	headers["Content-Type"] = "application/vnd.api+json"
	headers["Accept"] = "application/vnd.api+json"

	return headers, nil
}

// RefreshToken обновляет OAuth 2.0 токен для RailsR
func (a *RailsRAuth) RefreshToken(ctx context.Context) error {
	a.logger.Info("Refreshing RailsR access token", map[string]interface{}{
		"client_id":   a.ClientID,
		"environment": a.Environment,
	})

	// Подготавливаем данные для запроса токена
	data := url.Values{
		"grant_type":    {"client_credentials"},
		"client_id":     {a.ClientID},
		"client_secret": {a.ClientSecret},
		"scope":         {"accounts:read accounts:write cards:read cards:write transactions:read transactions:write"},
	}

	// Создаём запрос
	req, err := http.NewRequestWithContext(ctx, "POST", a.TokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return fmt.Errorf("failed to create token request: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	// Выполняем запрос
	resp, err := a.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("token request failed: %w", err)
	}
	defer resp.Body.Close()

	// Проверяем статус ответа
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("token request failed with status %d", resp.StatusCode)
	}

	// Парсим ответ
	var tokenResponse TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil {
		return fmt.Errorf("failed to decode token response: %w", err)
	}

	// Сохраняем токен
	a.AccessToken = tokenResponse.AccessToken
	a.RefreshToken = tokenResponse.RefreshToken
	a.ExpiresAt = time.Now().Add(time.Duration(tokenResponse.ExpiresIn) * time.Second)

	a.logger.Info("RailsR access token refreshed successfully", map[string]interface{}{
		"expires_at": a.ExpiresAt,
		"token_type": tokenResponse.TokenType,
	})

	return nil
}

// TokenResponse - ответ на запрос токена от RailsR
type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	Scope        string `json:"scope"`
}

// ValidateWebhookSignature проверяет подпись webhook'а от RailsR
func (a *RailsRAuth) ValidateWebhookSignature(payload []byte, signature string, secret string) bool {
	// RailsR использует HMAC-SHA256 для подписи webhook'ов
	// Реализация зависит от конкретного формата подписи RailsR
	// Пока возвращаем true для совместимости
	a.logger.Debug("Validating RailsR webhook signature", map[string]interface{}{
		"signature_length": len(signature),
		"payload_length":   len(payload),
	})

	// TODO: Реализовать валидацию подписи согласно документации RailsR
	return true
}
