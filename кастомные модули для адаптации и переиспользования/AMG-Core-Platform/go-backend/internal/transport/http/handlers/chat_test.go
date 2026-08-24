package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"amg-flow-backend/internal/service"
	"amg-flow-backend/pkg/logger"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockPythonClient мок для Python клиента
type MockPythonClient struct {
	mock.Mock
}

func (m *MockPythonClient) ProcessChat(ctx context.Context, req *service.PythonChatRequest) (*service.PythonChatResponse, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(*service.PythonChatResponse), args.Error(1)
}

func (m *MockPythonClient) SendAnalytics(ctx context.Context, req *service.PythonAnalyticsRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockPythonClient) GetAnalytics(ctx context.Context, analyticsType string, params map[string]string) (map[string]interface{}, error) {
	args := m.Called(ctx, analyticsType, params)
	return args.Get(0).(map[string]interface{}), args.Error(1)
}

func (m *MockPythonClient) GetModels(ctx context.Context) ([]service.PythonModel, error) {
	args := m.Called(ctx)
	return args.Get(0).([]service.PythonModel), args.Error(1)
}

// MockStrigaService мок для Striga сервиса
type MockStrigaService struct {
	mock.Mock
}

func (m *MockStrigaService) GetUserService() *service.StrigaUserService {
	args := m.Called()
	return args.Get(0).(*service.StrigaUserService)
}

func (m *MockStrigaService) GetWalletService() *service.StrigaWalletService {
	args := m.Called()
	return args.Get(0).(*service.StrigaWalletService)
}

func (m *MockStrigaService) GetCardService() *service.StrigaCardService {
	args := m.Called()
	return args.Get(0).(*service.StrigaCardService)
}

func (m *MockStrigaService) GetTransactionService() *service.StrigaTransactionService {
	args := m.Called()
	return args.Get(0).(*service.StrigaTransactionService)
}

func (m *MockStrigaService) GetWebhookService() *service.StrigaWebhookService {
	args := m.Called()
	return args.Get(0).(*service.StrigaWebhookService)
}

func (m *MockStrigaService) GetClient() *service.StrigaClient {
	args := m.Called()
	return args.Get(0).(*service.StrigaClient)
}

func (m *MockStrigaService) HealthCheck() error {
	args := m.Called()
	return args.Error(0)
}

func (m *MockStrigaService) ProcessWebhook(ctx context.Context, eventType string, payload []byte) error {
	args := m.Called(ctx, eventType, payload)
	return args.Error(0)
}

func TestProcessChat(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		mockSetup      func(*MockPythonClient)
		expectedStatus int
		expectedError  bool
	}{
		{
			name: "successful chat request",
			requestBody: map[string]interface{}{
				"model":    "llama3.2:3b-instruct-q4_0",
				"messages": []map[string]string{
					{"role": "user", "content": "Hello"},
				},
				"conversation_id": "test-conv-123",
				"use_rag":         true,
				"use_smart_prompts": true,
			},
			mockSetup: func(mockClient *MockPythonClient) {
				mockClient.On("ProcessChat", mock.Anything, mock.AnythingOfType("*service.PythonChatRequest")).
					Return(&service.PythonChatResponse{
						Model:          "llama3.2:3b-instruct-q4_0",
						Message:        service.ChatMessage{Role: "assistant", Content: "Hello! How can I help you?"},
						ConversationID: "test-conv-123",
						RequestID:      "req-123",
						Metadata:       map[string]interface{}{"tokens": 10},
					}, nil)
			},
			expectedStatus: http.StatusOK,
			expectedError:  false,
		},
		{
			name: "invalid request - missing model",
			requestBody: map[string]interface{}{
				"messages": []map[string]string{
					{"role": "user", "content": "Hello"},
				},
			},
			mockSetup:      func(mockClient *MockPythonClient) {},
			expectedStatus: http.StatusBadRequest,
			expectedError:  true,
		},
		{
			name: "python service error",
			requestBody: map[string]interface{}{
				"model":    "llama3.2:3b-instruct-q4_0",
				"messages": []map[string]string{
					{"role": "user", "content": "Hello"},
				},
			},
			mockSetup: func(mockClient *MockPythonClient) {
				mockClient.On("ProcessChat", mock.Anything, mock.AnythingOfType("*service.PythonChatRequest")).
					Return((*service.PythonChatResponse)(nil), assert.AnError)
			},
			expectedStatus: http.StatusInternalServerError,
			expectedError:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup mocks
			mockPythonClient := new(MockPythonClient)
			mockStrigaService := new(MockStrigaService)
			logger := logger.NewLogger("test")

			// Setup mock expectations
			tt.mockSetup(mockPythonClient)

			// Create handlers
			handlers := NewHandlers(mockPythonClient, mockStrigaService, logger)

			// Create request
			requestBody, _ := json.Marshal(tt.requestBody)
			req, _ := http.NewRequest("POST", "/api/v1/chat", bytes.NewBuffer(requestBody))
			req.Header.Set("Content-Type", "application/json")

			// Create response recorder
			w := httptest.NewRecorder()

			// Create Gin context
			c, _ := gin.CreateTestContext(w)
			c.Request = req

			// Call handler
			handlers.ProcessChat(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if !tt.expectedError {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Contains(t, response, "model")
				assert.Contains(t, response, "message")
			}

			// Verify mock calls
			mockPythonClient.AssertExpectations(t)
		})
	}
}

func TestGetModels(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		mockSetup      func(*MockPythonClient)
		expectedStatus int
		expectedCount  int
	}{
		{
			name: "successful models request",
			mockSetup: func(mockClient *MockPythonClient) {
				mockClient.On("GetModels", mock.Anything).
					Return([]service.PythonModel{
						{Name: "llama3.2:3b-instruct-q4_0", Size: 1000000, ModifiedAt: "2024-01-01T00:00:00Z"},
						{Name: "codellama:7b", Size: 2000000, ModifiedAt: "2024-01-01T00:00:00Z"},
					}, nil)
			},
			expectedStatus: http.StatusOK,
			expectedCount:  2,
		},
		{
			name: "python service error",
			mockSetup: func(mockClient *MockPythonClient) {
				mockClient.On("GetModels", mock.Anything).
					Return([]service.PythonModel(nil), assert.AnError)
			},
			expectedStatus: http.StatusInternalServerError,
			expectedCount:  0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup mocks
			mockPythonClient := new(MockPythonClient)
			mockStrigaService := new(MockStrigaService)
			logger := logger.NewLogger("test")

			// Setup mock expectations
			tt.mockSetup(mockPythonClient)

			// Create handlers
			handlers := NewHandlers(mockPythonClient, mockStrigaService, logger)

			// Create request
			req, _ := http.NewRequest("GET", "/api/v1/models", nil)

			// Create response recorder
			w := httptest.NewRecorder()

			// Create Gin context
			c, _ := gin.CreateTestContext(w)
			c.Request = req

			// Call handler
			handlers.GetModels(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedCount > 0 {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Contains(t, response, "models")
			}

			// Verify mock calls
			mockPythonClient.AssertExpectations(t)
		})
	}
}

func TestHealthCheck(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Setup mocks
	mockPythonClient := new(MockPythonClient)
	mockStrigaService := new(MockStrigaService)
	logger := logger.NewLogger("test")

	// Create handlers
	handlers := NewHandlers(mockPythonClient, mockStrigaService, logger)

	// Create request
	req, _ := http.NewRequest("GET", "/api/v1/health", nil)

	// Create response recorder
	w := httptest.NewRecorder()

	// Create Gin context
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	// Call handler
	handlers.HealthCheck(c)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "healthy", response["status"])
}
