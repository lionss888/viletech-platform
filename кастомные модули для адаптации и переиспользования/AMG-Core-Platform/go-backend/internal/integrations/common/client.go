package common

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"golang.org/x/time/rate"
)

// Logger interface для логирования
type Logger interface {
	Debug(msg string, fields ...map[string]interface{})
	Info(msg string, fields ...map[string]interface{})
	Warn(msg string, fields ...map[string]interface{})
	Error(msg string, fields ...map[string]interface{})
	WithFields(fields map[string]interface{}) Logger
	WithError(err error) Logger
}

// BaseClient - базовый HTTP клиент для всех интеграций
type BaseClient struct {
	httpClient   *http.Client
	baseURL      string
	timeout      time.Duration
	rateLimiter  *rate.Limiter
	logger       Logger
	authProvider AuthProvider
}

// NewBaseClient создаёт новый базовый клиент
func NewBaseClient(config IntegrationConfig, authProvider AuthProvider, logger Logger) *BaseClient {
	// Создаём rate limiter если указан лимит
	var limiter *rate.Limiter
	if config.RateLimit > 0 {
		limiter = rate.NewLimiter(rate.Limit(config.RateLimit), config.RateLimit)
	}

	return &BaseClient{
		httpClient: &http.Client{
			Timeout: config.Timeout,
		},
		baseURL:      config.APIURL,
		timeout:      config.Timeout,
		rateLimiter:  limiter,
		logger:       logger,
		authProvider: authProvider,
	}
}

// Request выполняет HTTP запрос с retry логикой
func (c *BaseClient) Request(ctx context.Context, method, endpoint string, body interface{}, result interface{}) error {
	// Применяем rate limiting
	if c.rateLimiter != nil {
		if err := c.rateLimiter.Wait(ctx); err != nil {
			return fmt.Errorf("rate limiter wait failed: %w", err)
		}
	}

	// Подготавливаем тело запроса
	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("failed to marshal request body: %w", err)
		}
		reqBody = bytes.NewBuffer(jsonBody)
	}

	// Создаём запрос
	url := c.baseURL + endpoint
	req, err := http.NewRequestWithContext(ctx, method, url, reqBody)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Устанавливаем базовые заголовки
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "AMG-Core-Platform/1.0")

	// Добавляем заголовки аутентификации
	if c.authProvider != nil {
		authHeaders, err := c.authProvider.GetAuthHeaders(ctx, req)
		if err != nil {
			return fmt.Errorf("failed to get auth headers: %w", err)
		}
		for key, value := range authHeaders {
			req.Header.Set(key, value)
		}
	}

	// Логируем запрос
	c.logger.Debug("Making HTTP request", map[string]interface{}{
		"method":   method,
		"url":      url,
		"endpoint": endpoint,
	})

	// Выполняем запрос
	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.logger.Error("HTTP request failed", map[string]interface{}{
			"method": method,
			"url":    url,
			"error":  err.Error(),
		})
		return fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	// Читаем ответ
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %w", err)
	}

	// Логируем ответ
	c.logger.Debug("HTTP response received", map[string]interface{}{
		"method":      method,
		"url":         url,
		"status_code": resp.StatusCode,
		"body_size":   len(respBody),
	})

	// Проверяем статус код
	if resp.StatusCode >= 400 {
		var apiErr APIError
		if err := json.Unmarshal(respBody, &apiErr); err != nil {
			// Если не удалось распарсить как APIError, создаём общую ошибку
			apiErr = APIError{
				Code:    fmt.Sprintf("HTTP_%d", resp.StatusCode),
				Message: string(respBody),
			}
		}

		c.logger.Error("API error response", map[string]interface{}{
			"method":      method,
			"url":         url,
			"status_code": resp.StatusCode,
			"error_code":  apiErr.Code,
			"error_msg":   apiErr.Message,
		})

		return apiErr
	}

	// Парсим успешный ответ
	if result != nil && len(respBody) > 0 {
		if err := json.Unmarshal(respBody, result); err != nil {
			return fmt.Errorf("failed to unmarshal response: %w", err)
		}
	}

	return nil
}

// Get выполняет GET запрос
func (c *BaseClient) Get(ctx context.Context, endpoint string, result interface{}) error {
	return c.Request(ctx, http.MethodGet, endpoint, nil, result)
}

// Post выполняет POST запрос
func (c *BaseClient) Post(ctx context.Context, endpoint string, body interface{}, result interface{}) error {
	return c.Request(ctx, http.MethodPost, endpoint, body, result)
}

// Put выполняет PUT запрос
func (c *BaseClient) Put(ctx context.Context, endpoint string, body interface{}, result interface{}) error {
	return c.Request(ctx, http.MethodPut, endpoint, body, result)
}

// Delete выполняет DELETE запрос
func (c *BaseClient) Delete(ctx context.Context, endpoint string, result interface{}) error {
	return c.Request(ctx, http.MethodDelete, endpoint, nil, result)
}

// Patch выполняет PATCH запрос
func (c *BaseClient) Patch(ctx context.Context, endpoint string, body interface{}, result interface{}) error {
	return c.Request(ctx, http.MethodPatch, endpoint, body, result)
}

// SetAuthProvider устанавливает провайдер аутентификации
func (c *BaseClient) SetAuthProvider(provider AuthProvider) {
	c.authProvider = provider
}

// HealthCheck проверяет доступность API
func (c *BaseClient) HealthCheck(ctx context.Context) error {
	// Простая проверка доступности через HEAD запрос к корню API
	req, err := http.NewRequestWithContext(ctx, http.MethodHead, c.baseURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create health check request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("health check request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 500 {
		return fmt.Errorf("API is unhealthy, status code: %d", resp.StatusCode)
	}

	return nil
}
