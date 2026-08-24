package service

import (
	"context"
	"fmt"
	"time"

	"amg-flow-backend/pkg/errors"
	"amg-flow-backend/pkg/logger"
)

// UIService сервис для Backend-Driven UI
type UIService struct {
	logger logger.Logger
}

// NewUIService создает новый сервис UI
func NewUIService(logger logger.Logger) *UIService {
	return &UIService{
		logger: logger,
	}
}

// UIComponent представляет UI компонент
type UIComponent struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Type        string                 `json:"type"`
	Props       map[string]interface{} `json:"props"`
	Children    []UIComponent          `json:"children,omitempty"`
	Validation  map[string]interface{} `json:"validation,omitempty"`
	Permissions []string               `json:"permissions,omitempty"`
}

// UIForm представляет UI форму
type UIForm struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Fields      []UIFormField          `json:"fields"`
	Actions     []UIAction             `json:"actions"`
	Validation  map[string]interface{} `json:"validation,omitempty"`
	Layout      string                 `json:"layout,omitempty"`
}

// UIFormField представляет поле формы
type UIFormField struct {
	Name       string                 `json:"name"`
	Label      string                 `json:"label"`
	Type       string                 `json:"type"`
	Required   bool                   `json:"required"`
	Default    interface{}            `json:"default,omitempty"`
	Options    []UIOption             `json:"options,omitempty"`
	Validation map[string]interface{} `json:"validation,omitempty"`
	Props      map[string]interface{} `json:"props,omitempty"`
}

// UIOption представляет опцию для поля
type UIOption struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

// UIAction представляет действие формы
type UIAction struct {
	ID     string                 `json:"id"`
	Label  string                 `json:"label"`
	Type   string                 `json:"type"`
	Method string                 `json:"method"`
	URL    string                 `json:"url"`
	Props  map[string]interface{} `json:"props,omitempty"`
}

// UITab представляет UI вкладку
type UITab struct {
	ID       string      `json:"id"`
	Label    string      `json:"label"`
	Icon     string      `json:"icon,omitempty"`
	Content  UIComponent `json:"content"`
	Active   bool        `json:"active"`
	Disabled bool        `json:"disabled"`
}

// UISchema представляет UI схему
type UISchema struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Type        string                 `json:"type"`
	Version     string                 `json:"version"`
	Components  []UIComponent          `json:"components,omitempty"`
	Forms       []UIForm               `json:"forms,omitempty"`
	Tabs        []UITab                `json:"tabs,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// GetUIComponents получает список UI компонентов
func (s *UIService) GetUIComponents(ctx context.Context) ([]UIComponent, error) {
	// Получаем компоненты из базы данных
	// Пока возвращаем предопределенные компоненты + из БД
	components := []UIComponent{
		{
			ID:   "chat-input",
			Name: "ChatInput",
			Type: "input",
			Props: map[string]interface{}{
				"placeholder": "Введите ваше сообщение...",
				"multiline":   true,
				"rows":        3,
			},
			Validation: map[string]interface{}{
				"required":  true,
				"minLength": 1,
				"maxLength": 1000,
			},
		},
		{
			ID:   "model-selector",
			Name: "ModelSelector",
			Type: "select",
			Props: map[string]interface{}{
				"placeholder": "Выберите модель",
			},
			Children: []UIComponent{
				{
					ID:   "model-option-llama",
					Name: "ModelOption",
					Type: "option",
					Props: map[string]interface{}{
						"value": "llama3.2:3b-instruct-q4_0",
						"label": "Llama 3.2 3B",
					},
				},
				{
					ID:   "model-option-codellama",
					Name: "ModelOption",
					Type: "option",
					Props: map[string]interface{}{
						"value": "codellama:7b",
						"label": "Code Llama 7B",
					},
				},
			},
		},
		{
			ID:   "chat-message",
			Name: "ChatMessage",
			Type: "message",
			Props: map[string]interface{}{
				"showTimestamp": true,
				"showAvatar":    true,
			},
		},
	}

	return components, nil
}

// CreateUIComponent создает новый UI компонент
func (s *UIService) CreateUIComponent(ctx context.Context, component UIComponent) (*UIComponent, error) {
	// TODO: Сохранить в базу данных
	s.logger.Info("Creating UI component", "name", component.Name, "type", component.Type)
	return &component, nil
}

// UpdateUIComponent обновляет UI компонент
func (s *UIService) UpdateUIComponent(ctx context.Context, id string, component UIComponent) (*UIComponent, error) {
	// TODO: Обновить в базе данных
	s.logger.Info("Updating UI component", "id", id, "name", component.Name)
	return &component, nil
}

// DeleteUIComponent удаляет UI компонент
func (s *UIService) DeleteUIComponent(ctx context.Context, id string) error {
	// TODO: Удалить из базы данных
	s.logger.Info("Deleting UI component", "id", id)
	return nil
}

// GetUIForms получает список UI форм
func (s *UIService) GetUIForms(ctx context.Context) ([]UIForm, error) {
	// Предопределенные формы
	forms := []UIForm{
		{
			ID:          "chat-settings",
			Name:        "ChatSettings",
			Title:       "Настройки чата",
			Description: "Настройте параметры чата и AI модели",
			Layout:      "vertical",
			Fields: []UIFormField{
				{
					Name:     "model",
					Label:    "Модель AI",
					Type:     "select",
					Required: true,
					Options: []UIOption{
						{Value: "llama3.2:3b-instruct-q4_0", Label: "Llama 3.2 3B Instruct"},
						{Value: "llama3.2:7b-instruct-q4_0", Label: "Llama 3.2 7B Instruct"},
						{Value: "codellama:7b", Label: "Code Llama 7B"},
					},
					Props: map[string]interface{}{
						"placeholder": "Выберите модель",
					},
				},
				{
					Name:     "use_rag",
					Label:    "Использовать RAG",
					Type:     "checkbox",
					Required: false,
					Default:  true,
				},
				{
					Name:     "use_smart_prompts",
					Label:    "Умные промпты",
					Type:     "checkbox",
					Required: false,
					Default:  true,
				},
				{
					Name:     "temperature",
					Label:    "Температура",
					Type:     "number",
					Required: false,
					Default:  0.7,
					Props: map[string]interface{}{
						"min":  0.0,
						"max":  2.0,
						"step": 0.1,
					},
				},
			},
			Actions: []UIAction{
				{
					ID:     "save",
					Label:  "Сохранить",
					Type:   "primary",
					Method: "POST",
					URL:    "/api/v1/settings/chat",
				},
				{
					ID:     "reset",
					Label:  "Сбросить",
					Type:   "secondary",
					Method: "POST",
					URL:    "/api/v1/settings/chat/reset",
				},
			},
		},
		{
			ID:          "workflow-create",
			Name:        "WorkflowCreate",
			Title:       "Создать рабочий процесс",
			Description: "Создайте новый рабочий процесс для автоматизации задач",
			Layout:      "vertical",
			Fields: []UIFormField{
				{
					Name:     "name",
					Label:    "Название",
					Type:     "text",
					Required: true,
					Validation: map[string]interface{}{
						"minLength": 3,
						"maxLength": 100,
					},
				},
				{
					Name:     "description",
					Label:    "Описание",
					Type:     "textarea",
					Required: false,
					Props: map[string]interface{}{
						"rows": 3,
					},
				},
				{
					Name:     "definition",
					Label:    "Определение",
					Type:     "json",
					Required: true,
					Props: map[string]interface{}{
						"placeholder": `{
  "steps": [
    {
      "name": "step1",
      "type": "data_collection",
      "config": {}
    }
  ]
}`,
					},
				},
			},
			Actions: []UIAction{
				{
					ID:     "create",
					Label:  "Создать",
					Type:   "primary",
					Method: "POST",
					URL:    "/api/v1/workflows",
				},
			},
		},
	}

	return forms, nil
}

// GetUITabs получает список UI вкладок
func (s *UIService) GetUITabs(ctx context.Context) ([]UITab, error) {
	// Предопределенные вкладки
	tabs := []UITab{
		{
			ID:     "chat",
			Label:  "Чат",
			Icon:   "message",
			Active: true,
			Content: UIComponent{
				ID:   "chat-container",
				Name: "ChatContainer",
				Type: "container",
				Children: []UIComponent{
					{
						ID:   "chat-messages",
						Name: "ChatMessages",
						Type: "list",
					},
					{
						ID:   "chat-input",
						Name: "ChatInput",
						Type: "input",
					},
				},
			},
		},
		{
			ID:     "workflows",
			Label:  "Процессы",
			Icon:   "workflow",
			Active: false,
			Content: UIComponent{
				ID:   "workflows-container",
				Name: "WorkflowsContainer",
				Type: "container",
				Children: []UIComponent{
					{
						ID:   "workflows-list",
						Name: "WorkflowsList",
						Type: "list",
					},
					{
						ID:   "workflow-create-button",
						Name: "Button",
						Type: "button",
						Props: map[string]interface{}{
							"label":  "Создать процесс",
							"action": "create_workflow",
						},
					},
				},
			},
		},
		{
			ID:     "analytics",
			Label:  "Аналитика",
			Icon:   "chart",
			Active: false,
			Content: UIComponent{
				ID:   "analytics-container",
				Name: "AnalyticsContainer",
				Type: "container",
				Children: []UIComponent{
					{
						ID:   "analytics-charts",
						Name: "AnalyticsCharts",
						Type: "charts",
					},
				},
			},
		},
		{
			ID:     "settings",
			Label:  "Настройки",
			Icon:   "settings",
			Active: false,
			Content: UIComponent{
				ID:   "settings-container",
				Name: "SettingsContainer",
				Type: "container",
				Children: []UIComponent{
					{
						ID:   "chat-settings-form",
						Name: "ChatSettingsForm",
						Type: "form",
						Props: map[string]interface{}{
							"formId": "chat-settings",
						},
					},
				},
			},
		},
	}

	return tabs, nil
}

// GetUISchema получает UI схему по имени
func (s *UIService) GetUISchema(ctx context.Context, name string) (*UISchema, error) {
	if name == "" {
		return nil, errors.New(errors.ErrCodeValidation, "Schema name is required")
	}

	// Получаем компоненты, формы и вкладки
	components, err := s.GetUIComponents(ctx)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeInternal, "Failed to get components")
	}

	forms, err := s.GetUIForms(ctx)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeInternal, "Failed to get forms")
	}

	tabs, err := s.GetUITabs(ctx)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeInternal, "Failed to get tabs")
	}

	// Определяем тип схемы по имени
	schemaType := "full"
	if name == "components" {
		schemaType = "components"
	} else if name == "forms" {
		schemaType = "forms"
	} else if name == "tabs" {
		schemaType = "tabs"
	}

	schema := &UISchema{
		ID:          fmt.Sprintf("schema-%s", name),
		Name:        name,
		Title:       fmt.Sprintf("UI Schema: %s", name),
		Description: fmt.Sprintf("UI схема для %s", name),
		Type:        schemaType,
		Version:     "1.0.0",
		Components:  components,
		Forms:       forms,
		Tabs:        tabs,
		Metadata: map[string]interface{}{
			"generated_at": "2024-01-01T00:00:00Z",
			"generator":    "go-backend",
		},
	}

	return schema, nil
}

// GetUISchemaByRole получает UI схему для конкретной роли и страницы
func (s *UIService) GetUISchemaByRole(ctx context.Context, role, page string) (*UISchema, error) {
	if role == "" || page == "" {
		return nil, errors.New(errors.ErrCodeValidation, "Role and page are required")
	}

	// Получаем базовые компоненты
	components, err := s.GetUIComponents(ctx)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeInternal, "Failed to get components")
	}

	// Фильтруем компоненты по роли
	filteredComponents := s.filterComponentsByRole(components, role)

	// Получаем формы для роли
	forms, err := s.GetUIFormsByRole(ctx, role)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeInternal, "Failed to get forms for role")
	}

	// Получаем вкладки для роли
	tabs, err := s.GetUITabsByRole(ctx, role)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrCodeInternal, "Failed to get tabs for role")
	}

	// Создаем схему для роли
	schema := &UISchema{
		ID:          fmt.Sprintf("schema-%s-%s", role, page),
		Name:        fmt.Sprintf("%s-%s", role, page),
		Title:       fmt.Sprintf("UI Schema for %s - %s", role, page),
		Description: fmt.Sprintf("UI схема для роли %s на странице %s", role, page),
		Type:        "role-based",
		Version:     "1.0.0",
		Components:  filteredComponents,
		Forms:       forms,
		Tabs:        tabs,
		Metadata: map[string]interface{}{
			"role":         role,
			"page":         page,
			"generated_at": time.Now().Format(time.RFC3339),
			"generator":    "go-backend",
		},
	}

	return schema, nil
}

// GetUIFormsByRole получает формы для конкретной роли
func (s *UIService) GetUIFormsByRole(ctx context.Context, role string) ([]UIForm, error) {
	allForms, err := s.GetUIForms(ctx)
	if err != nil {
		return nil, err
	}

	// Фильтруем формы по роли
	var filteredForms []UIForm
	for _, form := range allForms {
		if s.hasPermission(form.Permissions, role) {
			filteredForms = append(filteredForms, form)
		}
	}

	return filteredForms, nil
}

// GetUITabsByRole получает вкладки для конкретной роли
func (s *UIService) GetUITabsByRole(ctx context.Context, role string) ([]UITab, error) {
	allTabs, err := s.GetUITabs(ctx)
	if err != nil {
		return nil, err
	}

	// Фильтруем вкладки по роли
	var filteredTabs []UITab
	for _, tab := range allTabs {
		if s.hasPermission(tab.Permissions, role) {
			filteredTabs = append(filteredTabs, tab)
		}
	}

	return filteredTabs, nil
}

// ValidateUISchema валидирует UI схему
func (s *UIService) ValidateUISchema(ctx context.Context, schema *UISchema) (*UIValidationResponse, error) {
	var errors []string
	var warnings []string

	// Проверяем обязательные поля
	if schema.ID == "" {
		errors = append(errors, "Schema ID is required")
	}
	if schema.Name == "" {
		errors = append(errors, "Schema name is required")
	}
	if schema.Type == "" {
		errors = append(errors, "Schema type is required")
	}

	// Проверяем компоненты
	for i, component := range schema.Components {
		if component.ID == "" {
			errors = append(errors, fmt.Sprintf("Component %d: ID is required", i))
		}
		if component.Type == "" {
			errors = append(errors, fmt.Sprintf("Component %d: Type is required", i))
		}
	}

	// Проверяем формы
	for i, form := range schema.Forms {
		if form.ID == "" {
			errors = append(errors, fmt.Sprintf("Form %d: ID is required", i))
		}
		if form.Name == "" {
			errors = append(errors, fmt.Sprintf("Form %d: Name is required", i))
		}
	}

	// Проверяем вкладки
	for i, tab := range schema.Tabs {
		if tab.ID == "" {
			errors = append(errors, fmt.Sprintf("Tab %d: ID is required", i))
		}
		if tab.Label == "" {
			warnings = append(warnings, fmt.Sprintf("Tab %d: Label is recommended", i))
		}
	}

	valid := len(errors) == 0

	return &UIValidationResponse{
		Valid:    valid,
		Errors:   errors,
		Warnings: warnings,
	}, nil
}

// GetUIStatus получает статус UI сервиса
func (s *UIService) GetUIStatus(ctx context.Context) (*UIStatusResponse, error) {
	components, err := s.GetUIComponents(ctx)
	if err != nil {
		return nil, err
	}

	forms, err := s.GetUIForms(ctx)
	if err != nil {
		return nil, err
	}

	tabs, err := s.GetUITabs(ctx)
	if err != nil {
		return nil, err
	}

	return &UIStatusResponse{
		Status:      "healthy",
		Components:  len(components),
		Forms:       len(forms),
		Tabs:        len(tabs),
		Schemas:     1, // Пока одна схема
		LastUpdated: time.Now().Format(time.RFC3339),
	}, nil
}

// filterComponentsByRole фильтрует компоненты по роли
func (s *UIService) filterComponentsByRole(components []UIComponent, role string) []UIComponent {
	var filtered []UIComponent
	for _, component := range components {
		if s.hasPermission(component.Permissions, role) {
			filtered = append(filtered, component)
		}
	}
	return filtered
}

// hasPermission проверяет, есть ли у роли разрешение
func (s *UIService) hasPermission(permissions []string, role string) bool {
	if len(permissions) == 0 {
		return true // Если нет ограничений, доступно всем
	}

	for _, permission := range permissions {
		if permission == role {
			return true
		}
	}
	return false
}

// UIValidationResponse представляет ответ валидации
type UIValidationResponse struct {
	Valid    bool     `json:"valid"`
	Errors   []string `json:"errors,omitempty"`
	Warnings []string `json:"warnings,omitempty"`
}

// UIStatusResponse представляет статус UI сервиса
type UIStatusResponse struct {
	Status      string `json:"status"`
	Components  int    `json:"components"`
	Forms       int    `json:"forms"`
	Tabs        int    `json:"tabs"`
	Schemas     int    `json:"schemas"`
	LastUpdated string `json:"last_updated"`
}
