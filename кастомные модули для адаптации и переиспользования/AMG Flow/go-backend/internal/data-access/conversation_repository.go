package dataaccess

import (
	"context"
	"time"

	"amg-flow-backend/internal/domain"
	"amg-flow-backend/pkg/errors"

	"gorm.io/gorm"
)

// ConversationRepository реализация репозитория разговоров
type ConversationRepository struct {
	db *gorm.DB
}

// NewConversationRepository создает новый репозиторий разговоров
func NewConversationRepository(db *gorm.DB) domain.ConversationRepository {
	return &ConversationRepository{
		db: db,
	}
}

// Create создает новый разговор
func (r *ConversationRepository) Create(ctx context.Context, conversation *domain.Conversation) error {
	conversation.CreatedAt = time.Now()
	conversation.UpdatedAt = time.Now()

	if err := r.db.WithContext(ctx).Create(conversation).Error; err != nil {
		return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to create conversation")
	}

	return nil
}

// GetByID получает разговор по ID
func (r *ConversationRepository) GetByID(ctx context.Context, id uint) (*domain.Conversation, error) {
	var conversation domain.Conversation

	if err := r.db.WithContext(ctx).First(&conversation, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New(errors.ErrCodeNotFound, "Conversation not found")
		}
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get conversation")
	}

	return &conversation, nil
}

// GetByExternalID получает разговор по внешнему ID
func (r *ConversationRepository) GetByExternalID(ctx context.Context, externalID string) (*domain.Conversation, error) {
	var conversation domain.Conversation

	if err := r.db.WithContext(ctx).
		Where("external_id = ?", externalID).
		First(&conversation).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New(errors.ErrCodeNotFound, "Conversation not found")
		}
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get conversation")
	}

	return &conversation, nil
}

// GetBySessionID получает разговоры по ID сессии
func (r *ConversationRepository) GetBySessionID(ctx context.Context, sessionID uint, limit, offset int) ([]*domain.Conversation, error) {
	var conversations []*domain.Conversation

	query := r.db.WithContext(ctx).
		Where("session_id = ?", sessionID).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if offset > 0 {
		query = query.Offset(offset)
	}

	if err := query.Find(&conversations).Error; err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get conversations")
	}

	return conversations, nil
}

// Update обновляет разговор
func (r *ConversationRepository) Update(ctx context.Context, conversation *domain.Conversation) error {
	conversation.UpdatedAt = time.Now()

	if err := r.db.WithContext(ctx).Save(conversation).Error; err != nil {
		return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to update conversation")
	}

	return nil
}

// Delete удаляет разговор
func (r *ConversationRepository) Delete(ctx context.Context, id uint) error {
	if err := r.db.WithContext(ctx).Delete(&domain.Conversation{}, id).Error; err != nil {
		return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to delete conversation")
	}

	return nil
}

// GetActiveBySessionID получает активные разговоры по ID сессии
func (r *ConversationRepository) GetActiveBySessionID(ctx context.Context, sessionID uint) ([]*domain.Conversation, error) {
	var conversations []*domain.Conversation

	if err := r.db.WithContext(ctx).
		Where("session_id = ? AND is_active = ?", sessionID, true).
		Order("updated_at DESC").
		Find(&conversations).Error; err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get active conversations")
	}

	return conversations, nil
}
