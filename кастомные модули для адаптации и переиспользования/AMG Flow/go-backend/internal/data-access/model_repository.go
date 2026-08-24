package dataaccess

import (
	"context"
	"time"

	"amg-flow-backend/internal/domain"
	"amg-flow-backend/pkg/errors"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ModelRepository реализация репозитория моделей
type ModelRepository struct {
	db *gorm.DB
}

// NewModelRepository создает новый репозиторий моделей
func NewModelRepository(db *gorm.DB) domain.ModelRepository {
	return &ModelRepository{
		db: db,
	}
}

// Create создает новую модель
func (r *ModelRepository) Create(ctx context.Context, model *domain.Model) error {
	model.CreatedAt = time.Now()
	model.UpdatedAt = time.Now()

	if err := r.db.WithContext(ctx).Create(model).Error; err != nil {
		return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to create model")
	}

	return nil
}

// GetByID получает модель по ID
func (r *ModelRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Model, error) {
	var model domain.Model

	if err := r.db.WithContext(ctx).First(&model, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New(errors.ErrCodeNotFound, "Model not found")
		}
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get model")
	}

	return &model, nil
}

// GetByName получает модель по имени
func (r *ModelRepository) GetByName(ctx context.Context, name string) (*domain.Model, error) {
	var model domain.Model

	if err := r.db.WithContext(ctx).
		Where("name = ?", name).
		First(&model).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Создаем модель по умолчанию, если не найдена
			defaultModel := &domain.Model{
				Name:        name,
				DisplayName: name,
				IsActive:    true,
				ModelType:   "chat",
				Provider:    "ollama",
				Config:      "{}",
			}

			if err := r.Create(ctx, defaultModel); err != nil {
				return nil, err
			}

			return defaultModel, nil
		}
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get model")
	}

	return &model, nil
}

// GetAll получает все модели
func (r *ModelRepository) GetAll(ctx context.Context, limit, offset int) ([]*domain.Model, error) {
	var models []*domain.Model

	query := r.db.WithContext(ctx).Order("name ASC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if offset > 0 {
		query = query.Offset(offset)
	}

	if err := query.Find(&models).Error; err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get models")
	}

	return models, nil
}

// GetActive получает активные модели
func (r *ModelRepository) GetActive(ctx context.Context) ([]*domain.Model, error) {
	var models []*domain.Model

	if err := r.db.WithContext(ctx).
		Where("is_active = ?", true).
		Order("name ASC").
		Find(&models).Error; err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get active models")
	}

	return models, nil
}

// Update обновляет модель
func (r *ModelRepository) Update(ctx context.Context, model *domain.Model) error {
	model.UpdatedAt = time.Now()

	if err := r.db.WithContext(ctx).Save(model).Error; err != nil {
		return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to update model")
	}

	return nil
}

// Delete удаляет модель
func (r *ModelRepository) Delete(ctx context.Context, id uint) error {
	if err := r.db.WithContext(ctx).Delete(&domain.Model{}, id).Error; err != nil {
		return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to delete model")
	}

	return nil
}

// Activate активирует модель
func (r *ModelRepository) Activate(ctx context.Context, id uint) error {
	if err := r.db.WithContext(ctx).
		Model(&domain.Model{}).
		Where("id = ?", id).
		Update("is_active", true).Error; err != nil {
		return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to activate model")
	}

	return nil
}

// Deactivate деактивирует модель
func (r *ModelRepository) Deactivate(ctx context.Context, id uint) error {
	if err := r.db.WithContext(ctx).
		Model(&domain.Model{}).
		Where("id = ?", id).
		Update("is_active", false).Error; err != nil {
		return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to deactivate model")
	}

	return nil
}
