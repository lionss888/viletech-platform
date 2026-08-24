package service

import (
	"amg-flow-backend/pkg/logger"
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

// SchemaBuilder построитель схем для BDUI
type SchemaBuilder struct {
	logger logger.Logger
}

// NewSchemaBuilder создает новый построитель схем
func NewSchemaBuilder(logger logger.Logger) *SchemaBuilder {
	return &SchemaBuilder{
		logger: logger,
	}
}

// SchemaTemplate шаблон схемы
type SchemaTemplate struct {
	Name        string                 `json:"name"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Type        string                 `json:"type"` // form, dashboard, workflow
	Fields      []FieldTemplate        `json:"fields"`
	Actions     []ActionTemplate       `json:"actions"`
	Layout      LayoutTemplate         `json:"layout"`
	Validation  map[string]interface{} `json:"validation"`
	Permissions []string               `json:"permissions"`
}

// FieldTemplate шаблон поля
type FieldTemplate struct {
	Name         string                 `json:"name"`
	Label        string                 `json:"label"`
	Type         string                 `json:"type"`
	Required     bool                   `json:"required"`
	Default      interface{}            `json:"default,omitempty"`
	Options      []OptionTemplate       `json:"options,omitempty"`
	Validation   map[string]interface{} `json:"validation,omitempty"`
	Props        map[string]interface{} `json:"props,omitempty"`
	BusinessRule string                 `json:"business_rule,omitempty"`
}

// OptionTemplate шаблон опции
type OptionTemplate struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

// ActionTemplate шаблон действия
type ActionTemplate struct {
	Name        string                 `json:"name"`
	Label       string                 `json:"label"`
	Type        string                 `json:"type"`
	Endpoint    string                 `json:"endpoint,omitempty"`
	Method      string                 `json:"method,omitempty"`
	Props       map[string]interface{} `json:"props,omitempty"`
	Permissions []string               `json:"permissions,omitempty"`
}

// LayoutTemplate шаблон макета
type LayoutTemplate struct {
	Type     string                 `json:"type"` // grid, flex, tabs, steps
	Columns  int                    `json:"columns,omitempty"`
	Gap      string                 `json:"gap,omitempty"`
	Props    map[string]interface{} `json:"props,omitempty"`
	Sections []SectionTemplate      `json:"sections,omitempty"`
}

// SectionTemplate шаблон секции
type SectionTemplate struct {
	Title  string                 `json:"title"`
	Fields []string               `json:"fields"`
	Layout LayoutTemplate         `json:"layout,omitempty"`
	Props  map[string]interface{} `json:"props,omitempty"`
}

// BuildFormFromTemplate создает форму из шаблона
func (sb *SchemaBuilder) BuildFormFromTemplate(ctx context.Context, template SchemaTemplate) (*UIForm, error) {
	sb.logger.Info("Building form from template", "name", template.Name)

	// Создаем поля формы
	var fields []*UIComponent
	for _, fieldTemplate := range template.Fields {
		field := sb.buildFieldFromTemplate(fieldTemplate)
		fields = append(fields, field)
	}

	// Создаем действия формы
	var actions []*UIAction
	for _, actionTemplate := range template.Actions {
		action := sb.buildActionFromTemplate(actionTemplate)
		actions = append(actions, action)
	}

	// Создаем форму
	form := &UIForm{
		ID:          template.Name,
		Name:        template.Name,
		Title:       template.Title,
		Description: template.Description,
		Fields:      fields,
		Actions:     actions,
		Permissions: sb.convertPermissions(template.Permissions),
	}

	return form, nil
}

// buildFieldFromTemplate создает поле из шаблона
func (sb *SchemaBuilder) buildFieldFromTemplate(template FieldTemplate) *UIComponent {
	// Создаем валидацию
	validation := sb.buildValidationFromTemplate(template.Validation, template.BusinessRule)

	// Создаем дочерние элементы для select
	var children []*UIComponent
	if template.Type == "select" && len(template.Options) > 0 {
		for _, option := range template.Options {
			child := &UIComponent{
				ID:   fmt.Sprintf("%s-option-%s", template.Name, option.Value),
				Type: "option",
				Props: map[string]interface{}{
					"value": option.Value,
					"label": option.Label,
				},
			}
			children = append(children, child)
		}
	}

	// Создаем пропсы
	props := make(map[string]interface{})
	if template.Props != nil {
		props = template.Props
	}
	props["placeholder"] = fmt.Sprintf("Введите %s", strings.ToLower(template.Label))
	props["default"] = template.Default

	// Создаем поле
	field := &UIComponent{
		ID:         template.Name,
		Type:       template.Type,
		Title:      template.Label,
		Props:      props,
		Children:   children,
		Validation: validation,
	}

	return field
}

// buildActionFromTemplate создает действие из шаблона
func (sb *SchemaBuilder) buildActionFromTemplate(template ActionTemplate) *UIAction {
	action := &UIAction{
		ID:          template.Name,
		Type:        template.Type,
		Label:       template.Label,
		Endpoint:    template.Endpoint,
		Method:      template.Method,
		Props:       template.Props,
		Permissions: sb.convertPermissions(template.Permissions),
	}

	return action
}

// buildValidationFromTemplate создает валидацию из шаблона
func (sb *SchemaBuilder) buildValidationFromTemplate(validation map[string]interface{}, businessRule string) *UIValidation {
	if validation == nil && businessRule == "" {
		return nil
	}

	uiValidation := &UIValidation{}

	// Обрабатываем стандартные правила валидации
	if validation != nil {
		if required, ok := validation["required"].(bool); ok {
			uiValidation.Required = required
		}
		if min, ok := validation["min"].(float64); ok {
			minInt := int(min)
			uiValidation.Min = &minInt
		}
		if max, ok := validation["max"].(float64); ok {
			maxInt := int(max)
			uiValidation.Max = &maxInt
		}
		if pattern, ok := validation["pattern"].(string); ok {
			uiValidation.Pattern = pattern
		}
		if options, ok := validation["options"].([]interface{}); ok {
			var optionStrings []string
			for _, option := range options {
				if optionStr, ok := option.(string); ok {
					optionStrings = append(optionStrings, optionStr)
				}
			}
			uiValidation.Options = optionStrings
		}
	}

	return uiValidation
}

// convertPermissions конвертирует разрешения
func (sb *SchemaBuilder) convertPermissions(permissions []string) []UIRole {
	var roles []UIRole
	for _, permission := range permissions {
		role := UIRole(permission)
		roles = append(roles, role)
	}
	return roles
}

// CreateLoanApplicationForm создает форму заявки на кредит
func (sb *SchemaBuilder) CreateLoanApplicationForm(ctx context.Context) (*UIForm, error) {
	template := SchemaTemplate{
		Name:        "loan-application",
		Title:       "Заявка на кредит",
		Description: "Заполните форму для подачи заявки на кредит",
		Type:        "form",
		Fields: []FieldTemplate{
			{
				Name:     "full_name",
				Label:    "ФИО",
				Type:     "text",
				Required: true,
				Validation: map[string]interface{}{
					"required": true,
					"min":      2,
					"max":      100,
				},
			},
			{
				Name:     "email",
				Label:    "Email",
				Type:     "email",
				Required: true,
				Validation: map[string]interface{}{
					"required": true,
					"pattern":  "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
				},
			},
			{
				Name:     "phone",
				Label:    "Телефон",
				Type:     "tel",
				Required: true,
				Validation: map[string]interface{}{
					"required": true,
					"pattern":  "^\\+?[1-9]\\d{1,14}$",
				},
			},
			{
				Name:     "loan_amount",
				Label:    "Сумма кредита",
				Type:     "number",
				Required: true,
				Default:  100000,
				Validation: map[string]interface{}{
					"required": true,
					"min":      10000,
					"max":      5000000,
				},
				BusinessRule: "credit_score_check",
			},
			{
				Name:     "income",
				Label:    "Ежемесячный доход",
				Type:     "number",
				Required: true,
				Validation: map[string]interface{}{
					"required": true,
					"min":      30000,
				},
				BusinessRule: "income_verification",
			},
			{
				Name:     "employment_type",
				Label:    "Тип занятости",
				Type:     "select",
				Required: true,
				Options: []OptionTemplate{
					{Value: "employed", Label: "Наемный работник"},
					{Value: "self_employed", Label: "Самозанятый"},
					{Value: "business_owner", Label: "Предприниматель"},
					{Value: "unemployed", Label: "Безработный"},
				},
			},
			{
				Name:     "credit_purpose",
				Label:    "Цель кредита",
				Type:     "select",
				Required: true,
				Options: []OptionTemplate{
					{Value: "consumer", Label: "Потребительский"},
					{Value: "mortgage", Label: "Ипотека"},
					{Value: "auto", Label: "Автокредит"},
					{Value: "business", Label: "Бизнес"},
				},
			},
		},
		Actions: []ActionTemplate{
			{
				Name:     "submit",
				Label:    "Подать заявку",
				Type:     "submit",
				Endpoint: "/api/v1/loans/apply",
				Method:   "POST",
			},
			{
				Name:  "reset",
				Label: "Очистить",
				Type:  "reset",
			},
		},
		Layout: LayoutTemplate{
			Type:    "grid",
			Columns: 2,
			Gap:     "16px",
			Sections: []SectionTemplate{
				{
					Title:  "Личная информация",
					Fields: []string{"full_name", "email", "phone"},
				},
				{
					Title:  "Финансовая информация",
					Fields: []string{"loan_amount", "income", "employment_type"},
				},
				{
					Title:  "Дополнительная информация",
					Fields: []string{"credit_purpose"},
				},
			},
		},
		Permissions: []string{"user", "loan_officer"},
	}

	return sb.BuildFormFromTemplate(ctx, template)
}

// CreateUserProfileForm создает форму профиля пользователя
func (sb *SchemaBuilder) CreateUserProfileForm(ctx context.Context) (*UIForm, error) {
	template := SchemaTemplate{
		Name:        "user-profile",
		Title:       "Профиль пользователя",
		Description: "Обновите информацию в вашем профиле",
		Type:        "form",
		Fields: []FieldTemplate{
			{
				Name:     "first_name",
				Label:    "Имя",
				Type:     "text",
				Required: true,
				Validation: map[string]interface{}{
					"required": true,
					"min":      2,
					"max":      50,
				},
			},
			{
				Name:     "last_name",
				Label:    "Фамилия",
				Type:     "text",
				Required: true,
				Validation: map[string]interface{}{
					"required": true,
					"min":      2,
					"max":      50,
				},
			},
			{
				Name:     "email",
				Label:    "Email",
				Type:     "email",
				Required: true,
				Validation: map[string]interface{}{
					"required": true,
				},
			},
			{
				Name:     "phone",
				Label:    "Телефон",
				Type:     "tel",
				Required: false,
			},
			{
				Name:         "date_of_birth",
				Label:        "Дата рождения",
				Type:         "date",
				Required:     true,
				BusinessRule: "age_verification",
			},
			{
				Name:     "address",
				Label:    "Адрес",
				Type:     "textarea",
				Required: false,
				Props: map[string]interface{}{
					"rows": 3,
				},
			},
		},
		Actions: []ActionTemplate{
			{
				Name:     "save",
				Label:    "Сохранить",
				Type:     "submit",
				Endpoint: "/api/v1/profile/update",
				Method:   "PUT",
			},
			{
				Name:  "cancel",
				Label: "Отмена",
				Type:  "button",
			},
		},
		Layout: LayoutTemplate{
			Type:    "grid",
			Columns: 2,
			Gap:     "16px",
		},
		Permissions: []string{"user"},
	}

	return sb.BuildFormFromTemplate(ctx, template)
}

// CreateDashboardSchema создает схему дашборда
func (sb *SchemaBuilder) CreateDashboardSchema(ctx context.Context) (*UISchema, error) {
	schema := &UISchema{
		ID:          "dashboard",
		Name:        "dashboard",
		Title:       "Панель управления",
		Description: "Основная панель управления системой",
		Type:        "dashboard",
		Version:     "1.0",
		Components: []UIComponent{
			{
				ID:   "stats-cards",
				Type: "stats",
				Props: map[string]interface{}{
					"title": "Статистика",
					"cards": []map[string]interface{}{
						{
							"title": "Всего пользователей",
							"value": "{{user_count}}",
							"icon":  "users",
						},
						{
							"title": "Активные сессии",
							"value": "{{active_sessions}}",
							"icon":  "activity",
						},
						{
							"title": "Обработано запросов",
							"value": "{{processed_requests}}",
							"icon":  "requests",
						},
					},
				},
			},
			{
				ID:   "recent-activity",
				Type: "table",
				Props: map[string]interface{}{
					"title":    "Последняя активность",
					"endpoint": "/api/v1/analytics/recent",
					"columns": []map[string]interface{}{
						{"key": "user", "label": "Пользователь"},
						{"key": "action", "label": "Действие"},
						{"key": "timestamp", "label": "Время"},
					},
				},
			},
		},
		Tabs: []UITab{
			{
				ID:    "overview",
				Label: "Обзор",
				Content: UIComponent{
					ID:   "overview-content",
					Type: "overview",
				},
				Active: true,
			},
			{
				ID:    "analytics",
				Label: "Аналитика",
				Content: UIComponent{
					ID:   "analytics-content",
					Type: "analytics",
				},
			},
			{
				ID:    "settings",
				Label: "Настройки",
				Content: UIComponent{
					ID:   "settings-content",
					Type: "settings",
				},
			},
		},
		Metadata: map[string]interface{}{
			"refresh_interval": 30000, // 30 секунд
			"auto_refresh":     true,
		},
	}

	return schema, nil
}

// GenerateSchemaFromJSON генерирует схему из JSON
func (sb *SchemaBuilder) GenerateSchemaFromJSON(ctx context.Context, jsonData []byte) (*UISchema, error) {
	var template SchemaTemplate
	if err := json.Unmarshal(jsonData, &template); err != nil {
		return nil, fmt.Errorf("failed to unmarshal template: %w", err)
	}

	// Создаем схему из шаблона
	schema := &UISchema{
		ID:          template.Name,
		Name:        template.Name,
		Title:       template.Title,
		Description: template.Description,
		Type:        template.Type,
		Version:     "1.0",
		Metadata: map[string]interface{}{
			"template": true,
		},
	}

	// Если это форма, создаем форму
	if template.Type == "form" {
		form, err := sb.BuildFormFromTemplate(ctx, template)
		if err != nil {
			return nil, fmt.Errorf("failed to build form: %w", err)
		}
		schema.Forms = []UIForm{*form}
	}

	return schema, nil
}
