package service

import "time"

// UIRole представляет роль пользователя в системе
type UIRole string

const (
	UIRoleCustomer            UIRole = "customer"
	UIRoleCorporateCustomer   UIRole = "corporate_customer"
	UIRoleCorporateAdmin      UIRole = "corporate_admin"
	UIRoleTeller              UIRole = "teller"
	UIRoleCreditOfficer       UIRole = "credit_officer"
	UIRoleRelationshipManager UIRole = "relationship_manager"
	UIRoleSystemAdmin         UIRole = "system_admin"
	UIRoleSecurityAdmin       UIRole = "security_admin"
	UIRoleAuditor             UIRole = "auditor"
	UIRoleBranchManager       UIRole = "branch_manager"
	UIRoleCFO                 UIRole = "cfo"
	UIRoleCEO                 UIRole = "ceo"
)

// UIComponentType представляет тип UI компонента
type UIComponentType string

const (
	UIComponentTypeForm        UIComponentType = "form"
	UIComponentTypeTable       UIComponentType = "table"
	UIComponentTypeModal       UIComponentType = "modal"
	UIComponentTypeCard        UIComponentType = "card"
	UIComponentTypeButton      UIComponentType = "button"
	UIComponentTypeInput       UIComponentType = "input"
	UIComponentTypeSelect      UIComponentType = "select"
	UIComponentTypeTextarea    UIComponentType = "textarea"
	UIComponentTypeCheckbox    UIComponentType = "checkbox"
	UIComponentTypeRadio       UIComponentType = "radio"
	UIComponentTypeDatePicker  UIComponentType = "date_picker"
	UIComponentTypeFileUpload  UIComponentType = "file_upload"
	UIComponentTypeNavigation  UIComponentType = "navigation"
	UIComponentTypeTabs        UIComponentType = "tabs"
	UIComponentTypeAccordion   UIComponentType = "accordion"
	UIComponentTypeAlert       UIComponentType = "alert"
	UIComponentTypeProgress    UIComponentType = "progress"
	UIComponentTypeSpinner     UIComponentType = "spinner"
)

// UIComponent представляет UI компонент
type UIComponent struct {
	ID          string                 `json:"id"`
	Type        UIComponentType        `json:"type"`
	Title       string                 `json:"title,omitempty"`
	Description string                 `json:"description,omitempty"`
	Props       map[string]interface{} `json:"props"`
	Children    []*UIComponent         `json:"children,omitempty"`
	Validation  *UIValidation          `json:"validation,omitempty"`
	Permissions []UIRole               `json:"permissions,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

// UIValidation представляет правила валидации
type UIValidation struct {
	Required bool     `json:"required,omitempty"`
	Min      *int     `json:"min,omitempty"`
	Max      *int     `json:"max,omitempty"`
	Pattern  string   `json:"pattern,omitempty"`
	Options  []string `json:"options,omitempty"`
}

// UIForm представляет форму
type UIForm struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	Fields      []*UIComponent `json:"fields"`
	Actions     []*UIAction    `json:"actions"`
	Permissions []UIRole       `json:"permissions,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

// UIAction представляет действие формы
type UIAction struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"` // submit, cancel, reset, custom
	Label       string                 `json:"label"`
	Endpoint    string                 `json:"endpoint,omitempty"`
	Method      string                 `json:"method,omitempty"` // GET, POST, PUT, DELETE
	Props       map[string]interface{} `json:"props,omitempty"`
	Permissions []UIRole               `json:"permissions,omitempty"`
}

// UITab представляет вкладку
type UITab struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Label       string         `json:"label"`
	Icon        string         `json:"icon,omitempty"`
	Content     []*UIComponent `json:"content"`
	Permissions []UIRole       `json:"permissions,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

// UISchema представляет полную схему UI
type UISchema struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	Role        UIRole         `json:"role"`
	Page        string         `json:"page"`
	Components  []*UIComponent `json:"components"`
	Forms       []*UIForm      `json:"forms,omitempty"`
	Tabs        []*UITab       `json:"tabs,omitempty"`
	Navigation  *UIComponent   `json:"navigation,omitempty"`
	Permissions []UIRole       `json:"permissions,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

// UIComponentListResponse представляет ответ со списком компонентов
type UIComponentListResponse struct {
	Components []*UIComponent `json:"components"`
	Total      int            `json:"total"`
	Page       int            `json:"page"`
	Limit      int            `json:"limit"`
}

// UIFormListResponse представляет ответ со списком форм
type UIFormListResponse struct {
	Forms []*UIForm `json:"forms"`
	Total int       `json:"total"`
	Page  int       `json:"page"`
	Limit int       `json:"limit"`
}

// UITabListResponse представляет ответ со списком вкладок
type UITabListResponse struct {
	Tabs  []*UITab `json:"tabs"`
	Total int      `json:"total"`
	Page  int      `json:"page"`
	Limit int      `json:"limit"`
}

// UISchemaResponse представляет ответ со схемой UI
type UISchemaResponse struct {
	Schema *UISchema `json:"schema"`
}

// UIValidationRequest представляет запрос на валидацию UI схемы
type UIValidationRequest struct {
	Schema *UISchema `json:"schema"`
}

// UIValidationResponse представляет ответ валидации
type UIValidationResponse struct {
	Valid   bool     `json:"valid"`
	Errors  []string `json:"errors,omitempty"`
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
