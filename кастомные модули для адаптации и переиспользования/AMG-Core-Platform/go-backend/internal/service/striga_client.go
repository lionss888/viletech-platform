package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"amg-flow-backend/pkg/logger"
)

// StrigaClient представляет клиент для работы с Striga API
type StrigaClient struct {
	baseURL    string
	auth       *StrigaAuth
	httpClient *http.Client
	logger     logger.Logger
}

// NewStrigaClient создает новый клиент Striga
func NewStrigaClient(baseURL, apiKey, apiSecret string, logger logger.Logger) *StrigaClient {
	return &StrigaClient{
		baseURL: baseURL,
		auth:    NewStrigaAuth(apiKey, apiSecret),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		logger: logger,
	}
}

// StrigaError представляет ошибку от Striga API
type StrigaError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

func (e *StrigaError) Error() string {
	return fmt.Sprintf("Striga API error [%s]: %s", e.Code, e.Message)
}

// StrigaResponse представляет стандартный ответ от Striga API
type StrigaResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *StrigaError `json:"error,omitempty"`
}

// makeRequest выполняет HTTP запрос к Striga API
func (c *StrigaClient) makeRequest(method, path string, body interface{}) (*StrigaResponse, error) {
	// Подготавливаем тело запроса
	var bodyBytes []byte
	var err error
	
	if body != nil {
		bodyBytes, err = json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
	}

	// Создаем запрос
	url := c.baseURL + path
	req, err := http.NewRequest(method, url, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Генерируем заголовки аутентификации
	bodyStr := string(bodyBytes)
	headers, err := c.auth.GenerateHeaders(method, path, bodyStr)
	if err != nil {
		return nil, fmt.Errorf("failed to generate auth headers: %w", err)
	}

	// Устанавливаем заголовки
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	// Выполняем запрос
	c.logger.Infof("Making %s request to %s", method, path)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Читаем ответ
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Парсим ответ
	var strigaResp StrigaResponse
	if err := json.Unmarshal(respBody, &strigaResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	// Проверяем статус ответа
	if resp.StatusCode >= 400 {
		if strigaResp.Error != nil {
			return nil, strigaResp.Error
		}
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	return &strigaResp, nil
}

// Get выполняет GET запрос
func (c *StrigaClient) Get(path string) (*StrigaResponse, error) {
	return c.makeRequest("GET", path, nil)
}

// Post выполняет POST запрос
func (c *StrigaClient) Post(path string, body interface{}) (*StrigaResponse, error) {
	return c.makeRequest("POST", path, body)
}

// Put выполняет PUT запрос
func (c *StrigaClient) Put(path string, body interface{}) (*StrigaResponse, error) {
	return c.makeRequest("PUT", path, body)
}

// Delete выполняет DELETE запрос
func (c *StrigaClient) Delete(path string) (*StrigaResponse, error) {
	return c.makeRequest("DELETE", path, nil)
}
