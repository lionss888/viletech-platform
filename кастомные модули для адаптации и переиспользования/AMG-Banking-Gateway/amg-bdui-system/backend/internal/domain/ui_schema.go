package domain

import (
	"time"
)

// UISchema представляет схему UI для конкретной роли и страницы
type UISchema struct {
	ID          string                 `json:"id"`
	Role        string                 `json:"role"`
	Page        string                 `json:"page"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Layout      Layout                 `json:"layout"`
	Components  []UIComponent          `json:"components"`
	Permissions []string               `json:"permissions"`
	Metadata    map[string]interface{} `json:"metadata"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
	Version     int                    `json:"version"`
	IsActive    bool                   `json:"is_active"`
}

// Layout определяет структуру страницы
type Layout struct {
	Type        string                 `json:"type"` // grid, stack, sidebar, etc.
	Columns     int                    `json:"columns,omitempty"`
	Rows        int                    `json:"rows,omitempty"`
	Gap         string                 `json:"gap,omitempty"`
	Padding     string                 `json:"padding,omitempty"`
	Margin      string                 `json:"margin,omitempty"`
	Responsive  map[string]Layout      `json:"responsive,omitempty"` // mobile, tablet, desktop
	Properties  map[string]interface{} `json:"properties,omitempty"`
}

// UIComponent представляет компонент UI
type UIComponent struct {
	ID               string                 `json:"id"`
	Type             string                 `json:"type"` // data_table, form, chart, button, etc.
	Name             string                 `json:"name"`
	Title            string                 `json:"title,omitempty"`
	Description      string                 `json:"description,omitempty"`
	Position         Position               `json:"position"`
	Size             Size                   `json:"size"`
	Data             ComponentData          `json:"data,omitempty"`
	Actions          []Action               `json:"actions,omitempty"`
	Validation       Validation             `json:"validation,omitempty"`
	Permissions      []string               `json:"permissions,omitempty"`
	Conditions       []Condition            `json:"conditions,omitempty"`
	Properties       map[string]interface{} `json:"properties,omitempty"`
	Children         []UIComponent          `json:"children,omitempty"`
	IsVisible        bool                   `json:"is_visible"`
	IsDisabled       bool                   `json:"is_disabled"`
	IsRequired       bool                   `json:"is_required"`
	Order            int                    `json:"order"`
}

// Position определяет позицию компонента
type Position struct {
	X      int    `json:"x"`
	Y      int    `json:"y"`
	Z      int    `json:"z"`
	Align  string `json:"align,omitempty"`  // left, center, right
	Justify string `json:"justify,omitempty"` // start, center, end
}

// Size определяет размеры компонента
type Size struct {
	Width  string `json:"width,omitempty"`  // px, %, auto, etc.
	Height string `json:"height,omitempty"` // px, %, auto, etc.
	MinWidth  string `json:"min_width,omitempty"`
	MinHeight string `json:"min_height,omitempty"`
	MaxWidth  string `json:"max_width,omitempty"`
	MaxHeight string `json:"max_height,omitempty"`
}

// ComponentData содержит данные для компонента
type ComponentData struct {
	Source      string                 `json:"source,omitempty"`      // API endpoint
	Query       map[string]interface{} `json:"query,omitempty"`       // Query parameters
	Filters     []Filter               `json:"filters,omitempty"`
	Sorting     []Sort                 `json:"sorting,omitempty"`
	Pagination  Pagination             `json:"pagination,omitempty"`
	Transform   string                 `json:"transform,omitempty"`   // Data transformation function
	Cache       CacheConfig            `json:"cache,omitempty"`
	Refresh     RefreshConfig          `json:"refresh,omitempty"`
	DefaultData interface{}            `json:"default_data,omitempty"`
}

// Action определяет действие компонента
type Action struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"` // navigate, submit, delete, etc.
	Name        string                 `json:"name"`
	Label       string                 `json:"label"`
	Icon        string                 `json:"icon,omitempty"`
	URL         string                 `json:"url,omitempty"`
	Method      string                 `json:"method,omitempty"` // GET, POST, PUT, DELETE
	Payload     map[string]interface{} `json:"payload,omitempty"`
	Confirmation Confirmation          `json:"confirmation,omitempty"`
	Permissions []string               `json:"permissions,omitempty"`
	Conditions  []Condition            `json:"conditions,omitempty"`
	Success     ActionResult           `json:"success,omitempty"`
	Error       ActionResult           `json:"error,omitempty"`
}

// ActionResult определяет результат действия
type ActionResult struct {
	Type        string                 `json:"type"` // message, redirect, refresh, etc.
	Message     string                 `json:"message,omitempty"`
	URL         string                 `json:"url,omitempty"`
	Data        map[string]interface{} `json:"data,omitempty"`
	ShowToast   bool                   `json:"show_toast,omitempty"`
	ShowModal   bool                   `json:"show_modal,omitempty"`
}

// Validation определяет правила валидации
type Validation struct {
	Required    bool                   `json:"required,omitempty"`
	MinLength   int                    `json:"min_length,omitempty"`
	MaxLength   int                    `json:"max_length,omitempty"`
	MinValue    float64                `json:"min_value,omitempty"`
	MaxValue    float64                `json:"max_value,omitempty"`
	Pattern     string                 `json:"pattern,omitempty"`
	CustomRules []CustomRule           `json:"custom_rules,omitempty"`
	Messages    map[string]string      `json:"messages,omitempty"`
}

// CustomRule определяет пользовательское правило валидации
type CustomRule struct {
	Name    string                 `json:"name"`
	Message string                 `json:"message"`
	Function string                `json:"function"` // JavaScript function name
	Params  map[string]interface{} `json:"params,omitempty"`
}

// Condition определяет условие отображения/активации
type Condition struct {
	Field    string      `json:"field"`
	Operator string      `json:"operator"` // equals, not_equals, greater_than, etc.
	Value    interface{} `json:"value"`
	Logic    string      `json:"logic,omitempty"` // AND, OR
}

// Filter определяет фильтр данных
type Filter struct {
	Field    string      `json:"field"`
	Operator string      `json:"operator"`
	Value    interface{} `json:"value"`
}

// Sort определяет сортировку данных
type Sort struct {
	Field     string `json:"field"`
	Direction string `json:"direction"` // asc, desc
}

// Pagination определяет пагинацию
type Pagination struct {
	Page     int `json:"page"`
	PageSize int `json:"page_size"`
	Total    int `json:"total,omitempty"`
}

// CacheConfig определяет настройки кэширования
type CacheConfig struct {
	Enabled bool          `json:"enabled"`
	TTL     time.Duration `json:"ttl,omitempty"`
	Key     string        `json:"key,omitempty"`
}

// RefreshConfig определяет настройки обновления данных
type RefreshConfig struct {
	Enabled  bool          `json:"enabled"`
	Interval time.Duration `json:"interval,omitempty"`
	Auto     bool          `json:"auto,omitempty"`
}

// Confirmation определяет настройки подтверждения действия
type Confirmation struct {
	Required bool   `json:"required"`
	Title    string `json:"title,omitempty"`
	Message  string `json:"message,omitempty"`
	ConfirmText string `json:"confirm_text,omitempty"`
	CancelText  string `json:"cancel_text,omitempty"`
}

// UISchemaRepository определяет интерфейс репозитория UI схем
type UISchemaRepository interface {
	GetByRoleAndPage(role, page string) (*UISchema, error)
	GetByRole(role string) ([]*UISchema, error)
	GetAll() ([]*UISchema, error)
	Create(schema *UISchema) error
	Update(schema *UISchema) error
	Delete(id string) error
	GetActiveSchemas() ([]*UISchema, error)
}

// UISchemaService определяет интерфейс сервиса UI схем
type UISchemaService interface {
	GetSchema(role, page string, userPermissions []string) (*UISchema, error)
	ValidateSchema(schema *UISchema) error
	GenerateSchema(role, page string, userPermissions []string) (*UISchema, error)
	GetAvailableRoles() ([]string, error)
	GetSchemaStatus() (*SchemaStatus, error)
}

// SchemaStatus представляет статус UI схем
type SchemaStatus struct {
	TotalSchemas    int                    `json:"total_schemas"`
	ActiveSchemas   int                    `json:"active_schemas"`
	RolesCount      int                    `json:"roles_count"`
	LastUpdated     time.Time              `json:"last_updated"`
	CacheStatus     string                 `json:"cache_status"`
	DatabaseStatus  string                 `json:"database_status"`
	Metrics         map[string]interface{} `json:"metrics,omitempty"`
}
