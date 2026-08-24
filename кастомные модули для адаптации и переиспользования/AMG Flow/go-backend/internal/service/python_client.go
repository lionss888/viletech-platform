package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"amg-flow-backend/pkg/errors"
	"amg-flow-backend/pkg/logger"
)

// PythonAnalyticsClient клиент для работы с Python аналитическим сервисом
type PythonAnalyticsClient struct {
	baseURL    string
	httpClient *http.Client
	logger     logger.Logger
}

// NewPythonAnalyticsClient создает новый клиент для Python сервиса
func NewPythonAnalyticsClient(baseURL string, logger logger.Logger) *PythonAnalyticsClient {
	return &PythonAnalyticsClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		logger: logger,
	}
}

// PythonChatRequest представляет запрос к Python сервису для чата
type PythonChatRequest struct {
	Model           string        `json:"model"`
	Messages        []ChatMessage `json:"messages"`
	ConversationID  string        `json:"conversation_id"`
	UseRAG          bool          `json:"use_rag"`
	UseSmartPrompts bool          `json:"use_smart_prompts"`
	SystemPrompt    string        `json:"system_prompt,omitempty"`
}

// PythonChatResponse представляет ответ от Python сервиса
type PythonChatResponse struct {
	Model          string                 `json:"model"`
	Message        ChatMessage            `json:"message"`
	ConversationID string                 `json:"conversation_id"`
	RequestID      string                 `json:"request_id"`
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
}

// PythonAnalyticsRequest представляет запрос к Python сервису для аналитики
type PythonAnalyticsRequest struct {
	SessionID      string                 `json:"session_id"`
	ConversationID string                 `json:"conversation_id"`
	EventType      string                 `json:"event_type"`
	Data           map[string]interface{} `json:"data"`
}

// ProcessChat отправляет запрос на обработку чата в Python сервис
func (c *PythonAnalyticsClient) ProcessChat(ctx context.Context, req *PythonChatRequest) (*PythonChatResponse, error) {
	url := fmt.Sprintf("%s/v1/ask", c.baseURL)
	
	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeInternal, "Failed to marshal request")
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeInternal, "Failed to create request")
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-Request-ID", generateRequestID())

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrCodePythonService, "Failed to send request to Python service")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, errors.NewWithDetails(
			errors.ErrCodePythonService,
			"Python service returned error",
			fmt.Sprintf("Status: %d, Body: %s", resp.StatusCode, string(body)),
		)
	}

	var response PythonChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, errors.Wrap(err, errors.ErrCodePythonService, "Failed to decode response")
	}

	return &response, nil
}

// SendAnalytics отправляет аналитические данные в Python сервис
func (c *PythonAnalyticsClient) SendAnalytics(ctx context.Context, req *PythonAnalyticsRequest) error {
	url := fmt.Sprintf("%s/v1/analytics/track", c.baseURL)
	
	jsonData, err := json.Marshal(req)
	if err != nil {
		return errors.Wrap(err, errors.ErrCodeInternal, "Failed to marshal analytics request")
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return errors.Wrap(err, errors.ErrCodeInternal, "Failed to create analytics request")
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-Request-ID", generateRequestID())

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return errors.Wrap(err, errors.ErrCodePythonService, "Failed to send analytics to Python service")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return errors.NewWithDetails(
			errors.ErrCodePythonService,
			"Python analytics service returned error",
			fmt.Sprintf("Status: %d, Body: %s", resp.StatusCode, string(body)),
		)
	}

	return nil
}

// GetAnalytics получает аналитические данные из Python сервиса
func (c *PythonAnalyticsClient) GetAnalytics(ctx context.Context, analyticsType string, params map[string]string) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/v1/analytics/%s", c.baseURL, analyticsType)
	
	httpReq, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeInternal, "Failed to create analytics request")
	}

	// Добавляем параметры запроса
	q := httpReq.URL.Query()
	for key, value := range params {
		q.Add(key, value)
	}
	httpReq.URL.RawQuery = q.Encode()

	httpReq.Header.Set("X-Request-ID", generateRequestID())

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrCodePythonService, "Failed to get analytics from Python service")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, errors.NewWithDetails(
			errors.ErrCodePythonService,
			"Python analytics service returned error",
			fmt.Sprintf("Status: %d, Body: %s", resp.StatusCode, string(body)),
		)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, errors.Wrap(err, errors.ErrCodePythonService, "Failed to decode analytics response")
	}

	return result, nil
}

// generateRequestID генерирует уникальный ID запроса
func generateRequestID() string {
	return fmt.Sprintf("go-%d", time.Now().UnixNano())
}
