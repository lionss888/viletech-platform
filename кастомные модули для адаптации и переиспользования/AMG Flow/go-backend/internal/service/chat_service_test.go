package service

import (
	"context"
	"testing"

	"amg-flow-backend/internal/domain"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockMessageRepository мок репозитория сообщений
type MockMessageRepository struct {
	mock.Mock
}

func (m *MockMessageRepository) Create(ctx context.Context, message *domain.Message) error {
	args := m.Called(ctx, message)
	return args.Error(0)
}

func (m *MockMessageRepository) GetByID(ctx context.Context, id uint) (*domain.Message, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*domain.Message), args.Error(1)
}

func (m *MockMessageRepository) GetByConversationID(ctx context.Context, conversationID uint, limit, offset int) ([]*domain.Message, error) {
	args := m.Called(ctx, conversationID, limit, offset)
	return args.Get(0).([]*domain.Message), args.Error(1)
}

func (m *MockMessageRepository) Update(ctx context.Context, message *domain.Message) error {
	args := m.Called(ctx, message)
	return args.Error(0)
}

func (m *MockMessageRepository) Delete(ctx context.Context, id uint) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockMessageRepository) CountByConversationID(ctx context.Context, conversationID uint) (int64, error) {
	args := m.Called(ctx, conversationID)
	return args.Get(0).(int64), args.Error(1)
}

// MockConversationRepository мок репозитория разговоров
type MockConversationRepository struct {
	mock.Mock
}

func (m *MockConversationRepository) Create(ctx context.Context, conversation *domain.Conversation) error {
	args := m.Called(ctx, conversation)
	return args.Error(0)
}

func (m *MockConversationRepository) GetByID(ctx context.Context, id uint) (*domain.Conversation, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*domain.Conversation), args.Error(1)
}

func (m *MockConversationRepository) GetByExternalID(ctx context.Context, externalID string) (*domain.Conversation, error) {
	args := m.Called(ctx, externalID)
	return args.Get(0).(*domain.Conversation), args.Error(1)
}

func (m *MockConversationRepository) GetBySessionID(ctx context.Context, sessionID uint, limit, offset int) ([]*domain.Conversation, error) {
	args := m.Called(ctx, sessionID, limit, offset)
	return args.Get(0).([]*domain.Conversation), args.Error(1)
}

func (m *MockConversationRepository) Update(ctx context.Context, conversation *domain.Conversation) error {
	args := m.Called(ctx, conversation)
	return args.Error(0)
}

func (m *MockConversationRepository) Delete(ctx context.Context, id uint) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockConversationRepository) GetActiveBySessionID(ctx context.Context, sessionID uint) ([]*domain.Conversation, error) {
	args := m.Called(ctx, sessionID)
	return args.Get(0).([]*domain.Conversation), args.Error(1)
}

// MockPythonAnalyticsClient мок Python клиента
type MockPythonAnalyticsClient struct {
	mock.Mock
}

func (m *MockPythonAnalyticsClient) ProcessChat(ctx context.Context, req *PythonChatRequest) (*PythonChatResponse, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(*PythonChatResponse), args.Error(1)
}

func (m *MockPythonAnalyticsClient) SendAnalytics(ctx context.Context, req *PythonAnalyticsRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

// MockLogger мок логгера
type MockLogger struct{}

func (l *MockLogger) Debug(msg string)                          {}
func (l *MockLogger) Info(msg string)                           {}
func (l *MockLogger) Warn(msg string)                           {}
func (l *MockLogger) Error(msg string)                          {}
func (l *MockLogger) Debugf(format string, args ...interface{}) {}
func (l *MockLogger) Infof(format string, args ...interface{})  {}
func (l *MockLogger) Warnf(format string, args ...interface{})  {}
func (l *MockLogger) Errorf(format string, args ...interface{}) {}

func TestChatService_ProcessChat(t *testing.T) {
	// Подготовка моков
	mockMessageRepo := &MockMessageRepository{}
	mockConversationRepo := &MockConversationRepository{}
	mockSessionRepo := &MockSessionRepository{}
	mockModelRepo := &MockModelRepository{}
	mockPythonClient := &MockPythonAnalyticsClient{}
	mockLogger := &MockLogger{}

	// Создание сервиса
	service := NewChatService(
		mockMessageRepo,
		mockConversationRepo,
		mockSessionRepo,
		mockModelRepo,
		mockPythonClient,
		mockLogger,
	)

	// Тестовые данные
	ctx := context.Background()
	sessionID := "test-session"

	req := &ChatRequest{
		Model:          "llama3.2:3b-instruct-q4_0",
		Messages:       []ChatMessage{{Role: "user", Content: "Hello"}},
		ConversationID: "test-conv",
		Stream:         false,
	}

	// Настройка ожиданий моков
	mockModel := &domain.Model{
		Name:     "llama3.2:3b-instruct-q4_0",
		IsActive: true,
	}
	mockModelRepo.On("GetByName", ctx, "llama3.2:3b-instruct-q4_0").Return(mockModel, nil)

	mockSession := &domain.Session{
		ID:        1,
		SessionID: sessionID,
		IsActive:  true,
	}
	mockSessionRepo.On("GetBySessionID", ctx, sessionID).Return(mockSession, nil)

	mockConversation := &domain.Conversation{
		ID:        1,
		SessionID: 1,
		Title:     "New Conversation",
		IsActive:  true,
	}
	mockConversationRepo.On("Create", ctx, mock.AnythingOfType("*domain.Conversation")).Return(nil)

	mockMessageRepo.On("Create", ctx, mock.AnythingOfType("*domain.Message")).Return(nil)

	pythonResponse := &PythonChatResponse{
		Message: ChatMessage{
			Role:    "assistant",
			Content: "Hello! How can I help you?",
		},
		RequestID: "test-req-id",
		Metadata:  map[string]interface{}{},
	}
	mockPythonClient.On("ProcessChat", ctx, mock.AnythingOfType("*PythonChatRequest")).Return(pythonResponse, nil)
	mockPythonClient.On("SendAnalytics", mock.Anything, mock.AnythingOfType("*PythonAnalyticsRequest")).Return(nil)

	// Выполнение теста
	response, err := service.ProcessChat(ctx, req, sessionID)

	// Проверки
	assert.NoError(t, err)
	assert.NotNil(t, response)
	assert.Equal(t, "assistant", response.Message.Role)
	assert.Equal(t, "Hello! How can I help you?", response.Message.Content)
	assert.Equal(t, "llama3.2:3b-instruct-q4_0", response.Model)

	// Проверяем, что все моки были вызваны
	mockModelRepo.AssertExpectations(t)
	mockSessionRepo.AssertExpectations(t)
	mockConversationRepo.AssertExpectations(t)
	mockMessageRepo.AssertExpectations(t)
	mockPythonClient.AssertExpectations(t)
}

func TestChatService_ProcessChat_InvalidModel(t *testing.T) {
	// Подготовка моков
	mockMessageRepo := &MockMessageRepository{}
	mockConversationRepo := &MockConversationRepository{}
	mockSessionRepo := &MockSessionRepository{}
	mockModelRepo := &MockModelRepository{}
	mockPythonClient := &MockPythonAnalyticsClient{}
	mockLogger := &MockLogger{}

	// Создание сервиса
	service := NewChatService(
		mockMessageRepo,
		mockConversationRepo,
		mockSessionRepo,
		mockModelRepo,
		mockPythonClient,
		mockLogger,
	)

	// Тестовые данные
	ctx := context.Background()
	sessionID := "test-session"

	req := &ChatRequest{
		Model:          "invalid-model",
		Messages:       []ChatMessage{{Role: "user", Content: "Hello"}},
		ConversationID: "test-conv",
		Stream:         false,
	}

	// Настройка ожиданий моков - модель не найдена
	mockModel := &domain.Model{
		Name:     "invalid-model",
		IsActive: false, // Неактивная модель
	}
	mockModelRepo.On("GetByName", ctx, "invalid-model").Return(mockModel, nil)

	// Выполнение теста
	response, err := service.ProcessChat(ctx, req, sessionID)

	// Проверки
	assert.Error(t, err)
	assert.Nil(t, response)
	assert.Contains(t, err.Error(), "Model is not active")

	// Проверяем, что мок был вызван
	mockModelRepo.AssertExpectations(t)
}
