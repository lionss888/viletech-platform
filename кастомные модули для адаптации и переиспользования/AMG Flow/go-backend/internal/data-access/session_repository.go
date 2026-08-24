package dataaccess

import (
	"context"
	"time"

	"amg-flow-backend/internal/domain"
	"amg-flow-backend/pkg/errors"

	"gorm.io/gorm"
)

// SessionRepository реализация репозитория сессий
type SessionRepository struct {
	db *gorm.DB
}

// NewSessionRepository создает новый репозиторий сессий
func NewSessionRepository(db *gorm.DB) domain.SessionRepository {
	return &SessionRepository{
		db: db,
	}
}

// Create создает новую сессию
func (r *SessionRepository) Create(ctx context.Context, session *domain.Session) error {
	session.CreatedAt = time.Now()
	session.UpdatedAt = time.Now()

	if err := r.db.WithContext(ctx).Create(session).Error; err != nil {
		return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to create session")
	}

	return nil
}

// GetByID получает сессию по ID
func (r *SessionRepository) GetByID(ctx context.Context, id uint) (*domain.Session, error) {
	var session domain.Session

	if err := r.db.WithContext(ctx).First(&session, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New(errors.ErrCodeNotFound, "Session not found")
		}
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get session")
	}

	return &session, nil
}

// GetBySessionID получает сессию по session ID
func (r *SessionRepository) GetBySessionID(ctx context.Context, sessionID string) (*domain.Session, error) {
	var session domain.Session

	if err := r.db.WithContext(ctx).
		Where("session_id = ?", sessionID).
		First(&session).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Создаем новую сессию, если не найдена
			newSession := &domain.Session{
				SessionID: sessionID,
				IsActive:  true,
				StartedAt: time.Now(),
			}

			if err := r.Create(ctx, newSession); err != nil {
				return nil, err
			}

			return newSession, nil
		}
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get session")
	}

	return &session, nil
}

// Update обновляет сессию
func (r *SessionRepository) Update(ctx context.Context, session *domain.Session) error {
	session.UpdatedAt = time.Now()

	if err := r.db.WithContext(ctx).Save(session).Error; err != nil {
		return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to update session")
	}

	return nil
}

// Delete удаляет сессию
func (r *SessionRepository) Delete(ctx context.Context, id uint) error {
	if err := r.db.WithContext(ctx).Delete(&domain.Session{}, id).Error; err != nil {
		return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to delete session")
	}

	return nil
}

// GetActiveSessions получает активные сессии
func (r *SessionRepository) GetActiveSessions(ctx context.Context, limit, offset int) ([]*domain.Session, error) {
	var sessions []*domain.Session

	query := r.db.WithContext(ctx).
		Where("is_active = ?", true).
		Order("updated_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if offset > 0 {
		query = query.Offset(offset)
	}

	if err := query.Find(&sessions).Error; err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get active sessions")
	}

	return sessions, nil
}

// DeactivateSession деактивирует сессию
func (r *SessionRepository) DeactivateSession(ctx context.Context, sessionID string) error {
	if err := r.db.WithContext(ctx).
		Model(&domain.Session{}).
		Where("session_id = ?", sessionID).
		Update("is_active", false).Error; err != nil {
		return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to deactivate session")
	}

	return nil
}
