package service

import (
	"context"
	"time"

	"amg-flow-backend/internal/domain"
	"amg-flow-backend/pkg/errors"
	"amg-flow-backend/pkg/logger"
	"github.com/google/uuid"
)

// SessionService сервис для работы с сессиями и разговорами
type SessionService struct {
	sessionRepo      domain.SessionRepository
	conversationRepo domain.ConversationRepository
	messageRepo      domain.MessageRepository
	logger           logger.Logger
}

// NewSessionService создает новый сервис сессий
func NewSessionService(
	sessionRepo domain.SessionRepository,
	conversationRepo domain.ConversationRepository,
	messageRepo domain.MessageRepository,
	logger logger.Logger,
) *SessionService {
	return &SessionService{
		sessionRepo:      sessionRepo,
		conversationRepo: conversationRepo,
		messageRepo:      messageRepo,
		logger:           logger,
	}
}

// SessionInfo представляет информацию о сессии
type SessionInfo struct {
	ID        string    `json:"id"`
	SessionID string    `json:"session_id"`
	UserID    *string   `json:"user_id,omitempty"`
	IPAddress string    `json:"ip_address"`
	UserAgent string    `json:"user_agent"`
	IsActive  bool      `json:"is_active"`
	StartedAt time.Time `json:"started_at"`
	EndedAt   *time.Time `json:"ended_at,omitempty"`
}

// ConversationInfo представляет информацию о разговоре
type ConversationInfo struct {
	ID        string    `json:"id"`
	SessionID string    `json:"session_id"`
	Title     string    `json:"title"`
	IsActive  bool      `json:"is_active"`
	StartedAt time.Time `json:"started_at"`
	EndedAt   *time.Time `json:"ended_at,omitempty"`
	MessageCount int    `json:"message_count"`
}

// CreateSessionRequest представляет запрос на создание сессии
type CreateSessionRequest struct {
	SessionID string  `json:"session_id" binding:"required"`
	UserID    *string `json:"user_id,omitempty"`
	IPAddress string  `json:"ip_address"`
	UserAgent string  `json:"user_agent"`
}

// CreateConversationRequest представляет запрос на создание разговора
type CreateConversationRequest struct {
	SessionID string `json:"session_id" binding:"required"`
	Title     string `json:"title"`
}

// GetConversationHistoryRequest представляет запрос на получение истории
type GetConversationHistoryRequest struct {
	ConversationID string `json:"conversation_id" binding:"required"`
	Limit          int    `json:"limit"`
	Offset         int    `json:"offset"`
}

// MessageInfo представляет информацию о сообщении
type MessageInfo struct {
	ID             string    `json:"id"`
	ConversationID string    `json:"conversation_id"`
	Role           string    `json:"role"`
	Content        string    `json:"content"`
	Metadata       string    `json:"metadata,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

// CreateSession создает новую сессию
func (s *SessionService) CreateSession(ctx context.Context, req *CreateSessionRequest) (*SessionInfo, error) {
	// Валидация
	if req.SessionID == "" {
		return nil, errors.New(errors.ErrCodeValidation, "Session ID is required")
	}

	// Проверяем, не существует ли уже сессия с таким ID
	existingSession, err := s.sessionRepo.GetBySessionID(ctx, req.SessionID)
	if err == nil && existingSession != nil {
		// Если сессия существует и активна, возвращаем её
		if existingSession.IsActive {
			return s.convertSessionToInfo(existingSession), nil
		}
		// Если сессия неактивна, создаем новую
	}

	// Создаем новую сессию
	session := &domain.Session{
		SessionID: req.SessionID,
		UserID:    s.convertStringToUUID(req.UserID),
		IPAddress: req.IPAddress,
		UserAgent: req.UserAgent,
		IsActive:  true,
		StartedAt: time.Now(),
	}

	if err := s.sessionRepo.Create(ctx, session); err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to create session")
	}

	return s.convertSessionToInfo(session), nil
}

// GetSession получает сессию по ID
func (s *SessionService) GetSession(ctx context.Context, sessionID string) (*SessionInfo, error) {
	if sessionID == "" {
		return nil, errors.New(errors.ErrCodeValidation, "Session ID is required")
	}

	session, err := s.sessionRepo.GetBySessionID(ctx, sessionID)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get session")
	}

	if session == nil {
		return nil, errors.New(errors.ErrCodeNotFound, "Session not found")
	}

	return s.convertSessionToInfo(session), nil
}

// CreateConversation создает новый разговор
func (s *SessionService) CreateConversation(ctx context.Context, req *CreateConversationRequest) (*ConversationInfo, error) {
	// Валидация
	if req.SessionID == "" {
		return nil, errors.New(errors.ErrCodeValidation, "Session ID is required")
	}

	// Получаем сессию
	session, err := s.sessionRepo.GetBySessionID(ctx, req.SessionID)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get session")
	}

	if session == nil {
		return nil, errors.New(errors.ErrCodeNotFound, "Session not found")
	}

	// Генерируем заголовок, если не указан
	title := req.Title
	if title == "" {
		title = "New Conversation"
	}

	// Создаем разговор
	conversation := &domain.Conversation{
		SessionID: session.ID,
		Title:     title,
		IsActive:  true,
		StartedAt: time.Now(),
	}

	if err := s.conversationRepo.Create(ctx, conversation); err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to create conversation")
	}

	return s.convertConversationToInfo(conversation), nil
}

// GetConversation получает разговор по ID
func (s *SessionService) GetConversation(ctx context.Context, conversationID string) (*ConversationInfo, error) {
	if conversationID == "" {
		return nil, errors.New(errors.ErrCodeValidation, "Conversation ID is required")
	}

	conversation, err := s.conversationRepo.GetByID(ctx, conversationID)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get conversation")
	}

	if conversation == nil {
		return nil, errors.New(errors.ErrCodeNotFound, "Conversation not found")
	}

	return s.convertConversationToInfo(conversation), nil
}

// GetConversationHistory получает историю разговора
func (s *SessionService) GetConversationHistory(ctx context.Context, req *GetConversationHistoryRequest) ([]MessageInfo, int, error) {
	// Валидация
	if req.ConversationID == "" {
		return nil, 0, errors.New(errors.ErrCodeValidation, "Conversation ID is required")
	}

	// Устанавливаем значения по умолчанию
	limit := req.Limit
	if limit <= 0 {
		limit = 50
	}
	offset := req.Offset
	if offset < 0 {
		offset = 0
	}

	// Получаем сообщения
	messages, err := s.messageRepo.GetByConversationID(ctx, req.ConversationID, limit, offset)
	if err != nil {
		return nil, 0, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get messages")
	}

	// Получаем общее количество сообщений
	total, err := s.messageRepo.CountByConversationID(ctx, req.ConversationID)
	if err != nil {
		s.logger.Errorf("Failed to count messages: %v", err)
		total = len(messages) // Fallback
	}

	// Конвертируем в MessageInfo
	var messageInfos []MessageInfo
	for _, msg := range messages {
		messageInfos = append(messageInfos, MessageInfo{
			ID:             msg.ID.String(),
			ConversationID: msg.ConversationID.String(),
			Role:           msg.Role,
			Content:        msg.Content,
			Metadata:       msg.Metadata,
			CreatedAt:      msg.CreatedAt,
		})
	}

	return messageInfos, total, nil
}

// EndSession завершает сессию
func (s *SessionService) EndSession(ctx context.Context, sessionID string) error {
	if sessionID == "" {
		return errors.New(errors.ErrCodeValidation, "Session ID is required")
	}

	session, err := s.sessionRepo.GetBySessionID(ctx, sessionID)
	if err != nil {
		return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get session")
	}

	if session == nil {
		return errors.New(errors.ErrCodeNotFound, "Session not found")
	}

	// Завершаем сессию
	now := time.Now()
	session.IsActive = false
	session.EndedAt = &now

	if err := s.sessionRepo.Update(ctx, session); err != nil {
		return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to end session")
	}

	return nil
}

// EndConversation завершает разговор
func (s *SessionService) EndConversation(ctx context.Context, conversationID string) error {
	if conversationID == "" {
		return errors.New(errors.ErrCodeValidation, "Conversation ID is required")
	}

	conversation, err := s.conversationRepo.GetByID(ctx, conversationID)
	if err != nil {
		return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get conversation")
	}

	if conversation == nil {
		return errors.New(errors.ErrCodeNotFound, "Conversation not found")
	}

	// Завершаем разговор
	now := time.Now()
	conversation.IsActive = false
	conversation.EndedAt = &now

	if err := s.conversationRepo.Update(ctx, conversation); err != nil {
		return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to end conversation")
	}

	return nil
}

// convertSessionToInfo конвертирует доменную сессию в SessionInfo
func (s *SessionService) convertSessionToInfo(session *domain.Session) *SessionInfo {
	var userID *string
	if session.UserID != nil {
		id := session.UserID.String()
		userID = &id
	}

	return &SessionInfo{
		ID:        session.ID.String(),
		SessionID: session.SessionID,
		UserID:    userID,
		IPAddress: session.IPAddress,
		UserAgent: session.UserAgent,
		IsActive:  session.IsActive,
		StartedAt: session.StartedAt,
		EndedAt:   session.EndedAt,
	}
}

// convertConversationToInfo конвертирует доменный разговор в ConversationInfo
func (s *SessionService) convertConversationToInfo(conversation *domain.Conversation) *ConversationInfo {
	return &ConversationInfo{
		ID:           conversation.ID.String(),
		SessionID:    conversation.SessionID.String(),
		Title:        conversation.Title,
		IsActive:     conversation.IsActive,
		StartedAt:    conversation.StartedAt,
		EndedAt:      conversation.EndedAt,
		MessageCount: len(conversation.Messages),
	}
}

// convertStringToUUID конвертирует строку в UUID
func (s *SessionService) convertStringToUUID(str *string) *uuid.UUID {
	if str == nil || *str == "" {
		return nil
	}

	if id, err := uuid.Parse(*str); err == nil {
		return &id
	}

	return nil
}
