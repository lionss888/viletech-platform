package service

import (
	"context"
	"encoding/json"

	"amg-flow-backend/internal/domain"
	"amg-flow-backend/pkg/errors"
	"amg-flow-backend/pkg/logger"
)

// UIService сервис для работы с UI компонентами
type UIService struct {
	uiRepo domain.UIRepository
	logger logger.Logger
}

// NewUIService создает новый UI сервис
func NewUIService(uiRepo domain.UIRepository, logger logger.Logger) *UIService {
	return &UIService{
		uiRepo: uiRepo,
		logger: logger,
	}
}

// UIComponentResponse представляет ответ с UI компонентом
type UIComponentResponse struct {
	ID     string                 `json:"id"`
	Name   string                 `json:"name"`
	Type   string                 `json:"type"`
	Schema map[string]interface{} `json:"schema"`
}

// UIFormResponse представляет ответ с UI формой
type UIFormResponse struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Schema      map[string]interface{} `json:"schema"`
	Validation  map[string]interface{} `json:"validation"`
}

// UITabResponse представляет ответ с UI вкладкой
type UITabResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Title       string `json:"title"`
	Description string `json:"description"`
	ComponentID string `json:"component_id"`
	Order       int    `json:"order"`
}

// GetComponents получает все UI компоненты
func (s *UIService) GetComponents(ctx context.Context) ([]*UIComponentResponse, error) {
	// Если репозиторий не инициализирован, возвращаем заглушку
	if s.uiRepo == nil {
		return s.getMockComponents(), nil
	}

	components, err := s.uiRepo.GetComponents(ctx)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get UI components")
	}

	result := make([]*UIComponentResponse, 0, len(components))
	for _, component := range components {
		schema := make(map[string]interface{})
		if component.Schema != "" {
			if err := json.Unmarshal([]byte(component.Schema), &schema); err != nil {
				s.logger.Errorf("Failed to unmarshal component schema %s: %v", component.Name, err)
				continue
			}
		}

		result = append(result, &UIComponentResponse{
			ID:     component.ID.String(),
			Name:   component.Name,
			Type:   component.Type,
			Schema: schema,
		})
	}

	return result, nil
}

// GetComponentByName получает UI компонент по имени
func (s *UIService) GetComponentByName(ctx context.Context, name string) (*UIComponentResponse, error) {
	// Если репозиторий не инициализирован, возвращаем заглушку
	if s.uiRepo == nil {
		components := s.getMockComponents()
		for _, component := range components {
			if component.Name == name {
				return component, nil
			}
		}
		return nil, errors.New(errors.ErrCodeNotFound, "UI component not found")
	}

	component, err := s.uiRepo.GetComponentByName(ctx, name)
	if err != nil {
		return nil, err
	}

	schema := make(map[string]interface{})
	if component.Schema != "" {
		if err := json.Unmarshal([]byte(component.Schema), &schema); err != nil {
			return nil, errors.Wrap(err, errors.ErrCodeValidation, "Failed to parse component schema")
		}
	}

	return &UIComponentResponse{
		ID:     component.ID.String(),
		Name:   component.Name,
		Type:   component.Type,
		Schema: schema,
	}, nil
}

// GetForms получает все UI формы
func (s *UIService) GetForms(ctx context.Context) ([]*UIFormResponse, error) {
	// Если репозиторий не инициализирован, возвращаем заглушку
	if s.uiRepo == nil {
		return s.getMockForms(), nil
	}

	forms, err := s.uiRepo.GetForms(ctx)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get UI forms")
	}

	result := make([]*UIFormResponse, 0, len(forms))
	for _, form := range forms {
		schema := make(map[string]interface{})
		if form.Schema != "" {
			if err := json.Unmarshal([]byte(form.Schema), &schema); err != nil {
				s.logger.Errorf("Failed to unmarshal form schema %s: %v", form.Name, err)
				continue
			}
		}

		validation := make(map[string]interface{})
		if form.Validation != "" {
			if err := json.Unmarshal([]byte(form.Validation), &validation); err != nil {
				s.logger.Errorf("Failed to unmarshal form validation %s: %v", form.Name, err)
			}
		}

		result = append(result, &UIFormResponse{
			ID:          form.ID.String(),
			Name:        form.Name,
			Title:       form.Title,
			Description: form.Description,
			Schema:      schema,
			Validation:  validation,
		})
	}

	return result, nil
}

// GetTabs получает все UI вкладки
func (s *UIService) GetTabs(ctx context.Context) ([]*UITabResponse, error) {
	// Если репозиторий не инициализирован, возвращаем заглушку
	if s.uiRepo == nil {
		return s.getMockTabs(), nil
	}

	tabs, err := s.uiRepo.GetTabs(ctx)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeDatabase, "Failed to get UI tabs")
	}

	result := make([]*UITabResponse, 0, len(tabs))
	for _, tab := range tabs {
		result = append(result, &UITabResponse{
			ID:          tab.ID.String(),
			Name:        tab.Name,
			Title:       tab.Title,
			Description: tab.Description,
			ComponentID: tab.ComponentID.String(),
			Order:       tab.Order,
		})
	}

	return result, nil
}

// GetUISchema получает полную схему UI по имени
func (s *UIService) GetUISchema(ctx context.Context, name string) (map[string]interface{}, error) {
	// Если репозиторий не инициализирован, возвращаем заглушку
	if s.uiRepo == nil {
		return s.getMockUISchema(name), nil
	}

	schema, err := s.uiRepo.GetUISchema(ctx, name)
	if err != nil {
		return nil, err
	}

	return schema, nil
}

// getMockComponents возвращает заглушку компонентов
func (s *UIService) getMockComponents() []*UIComponentResponse {
	return []*UIComponentResponse{
		{
			ID:   "1",
			Name: "main-chat",
			Type: "chat",
			Schema: map[string]interface{}{
				"title":       "AI Chat",
				"description": "Main chat interface component",
				"props": map[string]interface{}{
					"placeholder":     "Type your message...",
					"useRag":          true,
					"useSmartPrompts": true,
				},
			},
		},
		{
			ID:   "2",
			Name: "analytics-dashboard",
			Type: "dashboard",
			Schema: map[string]interface{}{
				"title":       "Analytics Dashboard",
				"description": "Analytics and metrics dashboard",
				"props": map[string]interface{}{
					"showMetrics":  true,
					"enableExport": true,
				},
			},
		},
		{
			ID:   "3",
			Name: "development-panel",
			Type: "panel",
			Schema: map[string]interface{}{
				"title":       "Development Tools",
				"description": "Development and automation tools",
				"props": map[string]interface{}{
					"tools": []string{"refactor", "test", "document"},
				},
			},
		},
		{
			ID:   "4",
			Name: "workflow-manager",
			Type: "workflow",
			Schema: map[string]interface{}{
				"title":       "Workflow Manager",
				"description": "Workflow automation and management",
				"props": map[string]interface{}{
					"enableAutomation": true,
				},
			},
		},
	}
}

// getMockForms возвращает заглушку форм
func (s *UIService) getMockForms() []*UIFormResponse {
	return []*UIFormResponse{
		{
			ID:          "1",
			Name:        "chat-form",
			Title:       "Chat Form",
			Description: "Form for chat input",
			Schema: map[string]interface{}{
				"fields": []map[string]interface{}{
					{
						"name":        "message",
						"type":        "textarea",
						"label":       "Message",
						"required":    true,
						"placeholder": "Enter your message",
					},
				},
			},
		},
		{
			ID:          "2",
			Name:        "model-selection",
			Title:       "Model Selection",
			Description: "Form for selecting AI model",
			Schema: map[string]interface{}{
				"fields": []map[string]interface{}{
					{
						"name":    "model",
						"type":    "select",
						"label":   "AI Model",
						"options": []string{"llama3.2:3b-instruct-q4_0", "codellama:7b-instruct"},
					},
				},
			},
		},
	}
}

// getMockTabs возвращает заглушку вкладок
func (s *UIService) getMockTabs() []*UITabResponse {
	return []*UITabResponse{
		{
			ID:          "1",
			Name:        "chat-tab",
			Title:       "Chat",
			Description: "AI Chat Interface",
			ComponentID: "1",
			Order:       1,
		},
		{
			ID:          "2",
			Name:        "analytics-tab",
			Title:       "Analytics",
			Description: "Analytics Dashboard",
			ComponentID: "2",
			Order:       2,
		},
		{
			ID:          "3",
			Name:        "development-tab",
			Title:       "Development",
			Description: "Development Tools",
			ComponentID: "3",
			Order:       3,
		},
		{
			ID:          "4",
			Name:        "workflow-tab",
			Title:       "Workflows",
			Description: "Workflow Manager",
			ComponentID: "4",
			Order:       4,
		},
	}
}

// getMockUISchema возвращает заглушку UI схемы
func (s *UIService) getMockUISchema(name string) map[string]interface{} {
	switch name {
	case "main-app":
		return map[string]interface{}{
			"name":   "main-app",
			"title":  "AMG Flow",
			"layout": "tabs",
			"tabs": []map[string]interface{}{
				{
					"id":    "chat-tab",
					"title": "Chat",
					"component": map[string]interface{}{
						"type": "chat",
						"props": map[string]interface{}{
							"placeholder":     "Type your message...",
							"useRag":          true,
							"useSmartPrompts": true,
						},
					},
				},
				{
					"id":    "analytics-tab",
					"title": "Analytics",
					"component": map[string]interface{}{
						"type": "dashboard",
						"props": map[string]interface{}{
							"showMetrics":  true,
							"enableExport": true,
						},
					},
				},
				{
					"id":    "development-tab",
					"title": "Development",
					"component": map[string]interface{}{
						"type": "panel",
						"props": map[string]interface{}{
							"tools": []string{"refactor", "test", "document"},
						},
					},
				},
				{
					"id":    "workflow-tab",
					"title": "Workflows",
					"component": map[string]interface{}{
						"type": "workflow",
						"props": map[string]interface{}{
							"enableAutomation": true,
						},
					},
				},
			},
		}
	default:
		return map[string]interface{}{
			"name":        name,
			"title":       "Dynamic UI Schema",
			"description": "Generated UI schema for " + name,
			"component": map[string]interface{}{
				"type": "container",
				"props": map[string]interface{}{
					"title":   "Welcome to " + name,
					"content": "This is dynamically generated content",
				},
			},
		}
	}
}
