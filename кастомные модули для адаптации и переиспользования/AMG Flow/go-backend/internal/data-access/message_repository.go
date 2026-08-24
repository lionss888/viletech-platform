package dataaccess

import (
	"context"
	"time"

	"amg-flow-backend/internal/domain"
	"amg-flow-backend/pkg/errors"

	"gorm.io/gorm"
)

// MessageRepository реализация репозитория сообщений
type MessageRepository struct {
	db *gorm.DB
}

// NewMessageRepository создает новый репозиторий сообщений
func NewMessageRepository(db *gorm.DB) domain.MessageRepository {
	return &MessageRepository{
		db: db,
	}
}

// Create создает новое сообщение
func (r *MessageRepository) Create(ctx context.Context, message *domain.Message) error {
	message.CreatedAt = time.Now()
	message.UpdatedAt = time.Now()

	if err := r.db.WithContext(ctx).Create(message).Error; err != nil {
		return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to create message")
	}

	return nil
}

// GetByID получает сообщение по ID
func (r *MessageRepository) GetByID(ctx context.Context, id uint) (*domain.Message, error) {
	var message domain.Message

	if err := r.db.WithContext(ctx).First(&message, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New(errors.ErrCodeNotFound, "Message not found")
		}
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get message")
	}

	return &message, nil
}

// GetByConversationID получает сообщения по ID разговора
func (r *MessageRepository) GetByConversationID(ctx context.Context, conversationID uint, limit, offset int) ([]*domain.Message, error) {
	var messages []*domain.Message

	query := r.db.WithContext(ctx).
		Where("conversation_id = ?", conversationID).
		Order("created_at ASC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if offset > 0 {
		query = query.Offset(offset)
	}

	if err := query.Find(&messages).Error; err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get messages")
	}

	return messages, nil
}

// Update обновляет сообщение
func (r *MessageRepository) Update(ctx context.Context, message *domain.Message) error {
	message.UpdatedAt = time.Now()

	if err := r.db.WithContext(ctx).Save(message).Error; err != nil {
		return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to update message")
	}

	return nil
}

// Delete удаляет сообщение
func (r *MessageRepository) Delete(ctx context.Context, id uint) error {
	if err := r.db.WithContext(ctx).Delete(&domain.Message{}, id).Error; err != nil {
		return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to delete message")
	}

	return nil
}

// CountByConversationID подсчитывает количество сообщений в разговоре
func (r *MessageRepository) CountByConversationID(ctx context.Context, conversationID uint) (int64, error) {
	var count int64

	if err := r.db.WithContext(ctx).
		Model(&domain.Message{}).
		Where("conversation_id = ?", conversationID).
		Count(&count).Error; err != nil {
		return 0, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to count messages")
	}

	return count, nil
}
