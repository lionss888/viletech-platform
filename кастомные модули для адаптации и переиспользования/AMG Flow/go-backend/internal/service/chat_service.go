package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"amg-flow-backend/internal/domain"
	"amg-flow-backend/pkg/errors"
	"amg-flow-backend/pkg/logger"
)

// ChatService сервис для работы с чатом
type ChatService struct {
	messageRepo      domain.MessageRepository
	conversationRepo domain.ConversationRepository
	sessionRepo      domain.SessionRepository
	modelRepo        domain.ModelRepository
	pythonClient     *PythonAnalyticsClient
	logger           logger.Logger
}

// NewChatService создает новый сервис чата
func NewChatService(
	messageRepo domain.MessageRepository,
	conversationRepo domain.ConversationRepository,
	sessionRepo domain.SessionRepository,
	modelRepo domain.ModelRepository,
	pythonClient *PythonAnalyticsClient,
	logger logger.Logger,
) *ChatService {
	return &ChatService{
		messageRepo:      messageRepo,
		conversationRepo: conversationRepo,
		sessionRepo:      sessionRepo,
		modelRepo:        modelRepo,
		pythonClient:     pythonClient,
		logger:           logger,
	}
}

// ChatRequest представляет запрос на чат
type ChatRequest struct {
	Model           string                 `json:"model" binding:"required"`
	Messages        []ChatMessage          `json:"messages" binding:"required"`
	ConversationID  string                 `json:"conversation_id" binding:"required"`
	Stream          bool                   `json:"stream"`
	SystemPrompt    string                 `json:"system_prompt,omitempty"`
	UseRAG          bool                   `json:"use_rag"`
	UseSmartPrompts bool                   `json:"use_smart_prompts"`
	Metadata        map[string]interface{} `json:"metadata,omitempty"`
}

// ChatMessage представляет сообщение в чате
type ChatMessage struct {
	Role    string `json:"role" binding:"required"`
	Content string `json:"content" binding:"required"`
}

// ChatResponse представляет ответ чата
type ChatResponse struct {
	Model          string                 `json:"model"`
	Message        ChatMessage            `json:"message"`
	ConversationID string                 `json:"conversation_id"`
	RequestID      string                 `json:"request_id"`
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
}

// ProcessChat обрабатывает запрос чата
func (s *ChatService) ProcessChat(ctx context.Context, req *ChatRequest, sessionID string) (*ChatResponse, error) {
	// Валидация модели
	model, err := s.modelRepo.GetByName(ctx, req.Model)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeValidation, "Invalid model")
	}
	if !model.IsActive {
		return nil, errors.New(errors.ErrCodeValidation, "Model is not active")
	}

	// Получаем или создаем разговор
	conversation, err := s.getOrCreateConversation(ctx, req.ConversationID, sessionID)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get conversation")
	}

	// Сохраняем пользовательские сообщения
	for _, msg := range req.Messages {
		if msg.Role == "user" {
			message := &domain.Message{
				ConversationID: conversation.ID,
				Role:           msg.Role,
				Content:        msg.Content,
			}
			if err := s.messageRepo.Create(ctx, message); err != nil {
				s.logger.Errorf("Failed to save user message: %v", err)
			}
		}
	}

	// Отправляем запрос в Python сервис для AI обработки
	aiResponse, err := s.pythonClient.ProcessChat(ctx, &PythonChatRequest{
		Model:           req.Model,
		Messages:        req.Messages,
		ConversationID:  req.ConversationID,
		UseRAG:          req.UseRAG,
		UseSmartPrompts: req.UseSmartPrompts,
		SystemPrompt:    req.SystemPrompt,
	})
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrCodePythonService, "Failed to process chat with AI")
	}

	// Сохраняем ответ ассистента
	assistantMessage := &domain.Message{
		ConversationID: conversation.ID,
		Role:           "assistant",
		Content:        aiResponse.Message.Content,
		Metadata:       s.marshalMetadata(aiResponse.Metadata),
	}
	if err := s.messageRepo.Create(ctx, assistantMessage); err != nil {
		s.logger.Errorf("Failed to save assistant message: %v", err)
	}

	// Отправляем аналитику в Python сервис
	go s.sendAnalytics(context.Background(), sessionID, req.ConversationID, req, aiResponse)

	return &ChatResponse{
		Model:          req.Model,
		Message:        aiResponse.Message,
		ConversationID: req.ConversationID,
		RequestID:      aiResponse.RequestID,
		Metadata:       aiResponse.Metadata,
	}, nil
}

// getOrCreateConversation получает или создает разговор
func (s *ChatService) getOrCreateConversation(ctx context.Context, conversationID, sessionID string) (*domain.Conversation, error) {
	// Пытаемся найти существующий разговор
	// В реальной реализации здесь будет поиск по conversationID
	
	// Создаем новый разговор
	session, err := s.sessionRepo.GetBySessionID(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	conversation := &domain.Conversation{
		SessionID: session.ID,
		Title:     "New Conversation",
		IsActive:  true,
		StartedAt: time.Now(),
	}

	if err := s.conversationRepo.Create(ctx, conversation); err != nil {
		return nil, err
	}

	return conversation, nil
}

// sendAnalytics отправляет аналитику в Python сервис
func (s *ChatService) sendAnalytics(ctx context.Context, sessionID, conversationID string, req *ChatRequest, resp *PythonChatResponse) {
	analyticsReq := &PythonAnalyticsRequest{
		SessionID:      sessionID,
		ConversationID: conversationID,
		EventType:      "chat_message",
		Data: map[string]interface{}{
			"model":           req.Model,
			"message_count":   len(req.Messages),
			"use_rag":         req.UseRAG,
			"use_smart_prompts": req.UseSmartPrompts,
			"response_length": len(resp.Message.Content),
		},
	}

	if err := s.pythonClient.SendAnalytics(ctx, analyticsReq); err != nil {
		s.logger.Errorf("Failed to send analytics: %v", err)
	}
}

// marshalMetadata маршалит метаданные в JSON
func (s *ChatService) marshalMetadata(metadata map[string]interface{}) string {
	if metadata == nil {
		return ""
	}
	
	data, err := json.Marshal(metadata)
	if err != nil {
		s.logger.Errorf("Failed to marshal metadata: %v", err)
		return ""
	}
	
	return string(data)
}
