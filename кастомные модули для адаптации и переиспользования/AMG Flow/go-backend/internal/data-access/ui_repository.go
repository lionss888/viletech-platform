package dataaccess

import (
	"context"
	"time"

	"amg-flow-backend/internal/domain"
	"amg-flow-backend/pkg/errors"

	"gorm.io/gorm"
)

// UIRepository реализация репозитория UI компонентов
type UIRepository struct {
	db *gorm.DB
}

// NewUIRepository создает новый репозиторий UI компонентов
func NewUIRepository(db *gorm.DB) domain.UIRepository {
	return &UIRepository{
		db: db,
	}
}

// GetComponents получает все активные UI компоненты
func (r *UIRepository) GetComponents(ctx context.Context) ([]*domain.UIComponent, error) {
	var components []*domain.UIComponent

	if err := r.db.WithContext(ctx).
		Where("is_active = ?", true).
		Order("name ASC").
		Find(&components).Error; err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get UI components")
	}

	return components, nil
}

// GetComponentByName получает UI компонент по имени
func (r *UIRepository) GetComponentByName(ctx context.Context, name string) (*domain.UIComponent, error) {
	var component domain.UIComponent

	if err := r.db.WithContext(ctx).
		Where("name = ? AND is_active = ?", name, true).
		First(&component).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New(errors.ErrCodeNotFound, "UI component not found")
		}
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get UI component")
	}

	return &component, nil
}

// GetForms получает все активные UI формы
func (r *UIRepository) GetForms(ctx context.Context) ([]*domain.UIForm, error) {
	var forms []*domain.UIForm

	if err := r.db.WithContext(ctx).
		Where("is_active = ?", true).
		Order("name ASC").
		Find(&forms).Error; err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get UI forms")
	}

	return forms, nil
}

// GetFormByName получает UI форму по имени
func (r *UIRepository) GetFormByName(ctx context.Context, name string) (*domain.UIForm, error) {
	var form domain.UIForm

	if err := r.db.WithContext(ctx).
		Where("name = ? AND is_active = ?", name, true).
		First(&form).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New(errors.ErrCodeNotFound, "UI form not found")
		}
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get UI form")
	}

	return &form, nil
}

// GetTabs получает все активные UI вкладки
func (r *UIRepository) GetTabs(ctx context.Context) ([]*domain.UITab, error) {
	var tabs []*domain.UITab

	if err := r.db.WithContext(ctx).
		Preload("Component").
		Where("is_active = ?", true).
		Order("\"order\" ASC, name ASC").
		Find(&tabs).Error; err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get UI tabs")
	}

	return tabs, nil
}

// GetTabByName получает UI вкладку по имени
func (r *UIRepository) GetTabByName(ctx context.Context, name string) (*domain.UITab, error) {
	var tab domain.UITab

	if err := r.db.WithContext(ctx).
		Preload("Component").
		Where("name = ? AND is_active = ?", name, true).
		First(&tab).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New(errors.ErrCodeNotFound, "UI tab not found")
		}
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get UI tab")
	}

	return &tab, nil
}

// GetUISchema получает полную схему UI по имени
func (r *UIRepository) GetUISchema(ctx context.Context, name string) (map[string]interface{}, error) {
	// Для базовых схем
	switch name {
	case "main-app":
		return r.getMainAppSchema(ctx)
	case "chat-interface":
		return r.getChatInterfaceSchema(ctx)
	case "analytics-dashboard":
		return r.getAnalyticsDashboardSchema(ctx)
	case "development-panel":
		return r.getDevelopmentPanelSchema(ctx)
	default:
		return nil, errors.New(errors.ErrCodeNotFound, "UI schema not found")
	}
}

// getMainAppSchema возвращает схему основного приложения
func (r *UIRepository) getMainAppSchema(ctx context.Context) (map[string]interface{}, error) {
	tabs, err := r.GetTabs(ctx)
	if err != nil {
		return nil, err
	}

	schema := map[string]interface{}{
		"name":   "main-app",
		"title":  "AMG Flow",
		"layout": "tabs",
		"tabs":   make([]map[string]interface{}, 0, len(tabs)),
	}

	for _, tab := range tabs {
		if tab.Component == nil {
			continue
		}

		tabSchema := map[string]interface{}{
			"id":    tab.Name,
			"title": tab.Title,
			"component": map[string]interface{}{
				"type":   tab.Component.Type,
				"schema": tab.Component.Schema,
			},
		}

		schema["tabs"] = append(schema["tabs"].([]map[string]interface{}), tabSchema)
	}

	return schema, nil
}

// getChatInterfaceSchema возвращает схему чат-интерфейса
func (r *UIRepository) getChatInterfaceSchema(ctx context.Context) (map[string]interface{}, error) {
	component, err := r.GetComponentByName(ctx, "main-chat")
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"name":      "chat-interface",
		"title":     "AI Chat",
		"component": component.Schema,
	}, nil
}

// getAnalyticsDashboardSchema возвращает схему панели аналитики
func (r *UIRepository) getAnalyticsDashboardSchema(ctx context.Context) (map[string]interface{}, error) {
	component, err := r.GetComponentByName(ctx, "analytics-dashboard")
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"name":      "analytics-dashboard",
		"title":     "Analytics Dashboard",
		"component": component.Schema,
	}, nil
}

// getDevelopmentPanelSchema возвращает схему панели разработки
func (r *UIRepository) getDevelopmentPanelSchema(ctx context.Context) (map[string]interface{}, error) {
	component, err := r.GetComponentByName(ctx, "development-panel")
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"name":      "development-panel",
		"title":     "Development Tools",
		"component": component.Schema,
	}, nil
}

// CreateComponent создает новый UI компонент
func (r *UIRepository) CreateComponent(ctx context.Context, component *domain.UIComponent) error {
	component.CreatedAt = time.Now()
	component.UpdatedAt = time.Now()

	if err := r.db.WithContext(ctx).Create(component).Error; err != nil {
		return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to create UI component")
	}

	return nil
}

// UpdateComponent обновляет UI компонент
func (r *UIRepository) UpdateComponent(ctx context.Context, component *domain.UIComponent) error {
	component.UpdatedAt = time.Now()

	if err := r.db.WithContext(ctx).Save(component).Error; err != nil {
		return errors.Wrap(err, errors.ErrCodeDatabase, "Failed to update UI component")
	}

	return nil
}
