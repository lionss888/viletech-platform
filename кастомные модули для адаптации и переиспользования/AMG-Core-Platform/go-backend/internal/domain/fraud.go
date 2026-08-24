package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// FraudRuleType определяет тип правила фрод-контроля
type FraudRuleType string

const (
	FraudRuleTypeVelocity FraudRuleType = "velocity" // Скорость операций
	FraudRuleTypeAmount   FraudRuleType = "amount"   // Сумма операции
	FraudRuleTypeLocation FraudRuleType = "location" // Геолокация
	FraudRuleTypeTime     FraudRuleType = "time"     // Время операции
	FraudRuleTypeDevice   FraudRuleType = "device"   // Устройство
	FraudRuleTypeBehavior FraudRuleType = "behavior" // Поведенческий анализ
	FraudRuleTypeMerchant FraudRuleType = "merchant" // Торговая точка
	FraudRuleTypeCountry  FraudRuleType = "country"  // Страна
	FraudRuleTypeIP       FraudRuleType = "ip"       // IP адрес
	FraudRuleTypePattern  FraudRuleType = "pattern"  // Паттерн операций
)

// FraudAction определяет действие при срабатывании правила
type FraudAction string

const (
	FraudActionBlock   FraudAction = "block"   // Заблокировать
	FraudActionReview  FraudAction = "review"  // На рассмотрение
	FraudActionAlert   FraudAction = "alert"   // Уведомить
	FraudActionMonitor FraudAction = "monitor" // Мониторить
	FraudActionAllow   FraudAction = "allow"   // Разрешить
)

// FraudRiskLevel определяет уровень риска
type FraudRiskLevel string

const (
	FraudRiskLevelLow      FraudRiskLevel = "low"      // Низкий риск
	FraudRiskLevelMedium   FraudRiskLevel = "medium"   // Средний риск
	FraudRiskLevelHigh     FraudRiskLevel = "high"     // Высокий риск
	FraudRiskLevelCritical FraudRiskLevel = "critical" // Критический риск
)

// FraudStatus определяет статус проверки фрод-контроля
type FraudStatus string

const (
	FraudStatusPending  FraudStatus = "pending"  // На проверке
	FraudStatusApproved FraudStatus = "approved" // Одобрено
	FraudStatusRejected FraudStatus = "rejected" // Отклонено
	FraudStatusReview   FraudStatus = "review"   // На рассмотрении
	FraudStatusBlocked  FraudStatus = "blocked"  // Заблокировано
)

// FraudRule представляет правило фрод-контроля
type FraudRule struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name        string         `json:"name" gorm:"not null"`
	Description string         `json:"description"`
	RuleType    FraudRuleType  `json:"rule_type" gorm:"not null"`
	Conditions  string         `json:"conditions" gorm:"type:jsonb;not null"` // JSON с условиями
	Action      FraudAction    `json:"action" gorm:"not null"`
	RiskLevel   FraudRiskLevel `json:"risk_level" gorm:"not null"`
	Priority    int            `json:"priority" gorm:"default:0"`
	IsActive    bool           `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

// FraudCheck представляет проверку фрод-контроля
type FraudCheck struct {
	ID            uuid.UUID   `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID        uuid.UUID   `json:"user_id" gorm:"type:uuid;not null;index"`
	TransactionID *uuid.UUID  `json:"transaction_id" gorm:"type:uuid;index"`
	RuleID        uuid.UUID   `json:"rule_id" gorm:"type:uuid;not null;index"`
	RiskScore     int         `json:"risk_score" gorm:"not null"` // 0-100
	Status        FraudStatus `json:"status" gorm:"not null"`
	Details       string      `json:"details" gorm:"type:jsonb"` // JSON с деталями
	Reason        string      `json:"reason"`
	CreatedAt     time.Time   `json:"created_at"`
	UpdatedAt     time.Time   `json:"updated_at"`

	// Связи
	User *User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Rule *FraudRule `json:"rule,omitempty" gorm:"foreignKey:RuleID"`
}

// FraudEvent представляет событие фрод-контроля
type FraudEvent struct {
	ID          uuid.UUID   `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID      uuid.UUID   `json:"user_id" gorm:"type:uuid;not null;index"`
	EventType   string      `json:"event_type" gorm:"not null"`   // transaction, login, card_usage, etc.
	EventData   string      `json:"event_data" gorm:"type:jsonb"` // JSON с данными события
	RiskScore   int         `json:"risk_score" gorm:"not null"`
	Status      FraudStatus `json:"status" gorm:"not null"`
	ProcessedAt *time.Time  `json:"processed_at"`
	CreatedAt   time.Time   `json:"created_at"`

	// Связи
	User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// FraudAlert представляет алерт фрод-контроля
type FraudAlert struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID      uuid.UUID      `json:"user_id" gorm:"type:uuid;not null;index"`
	AlertType   string         `json:"alert_type" gorm:"not null"`
	Severity    FraudRiskLevel `json:"severity" gorm:"not null"`
	Title       string         `json:"title" gorm:"not null"`
	Description string         `json:"description"`
	Data        string         `json:"data" gorm:"type:jsonb"` // JSON с данными алерта
	IsResolved  bool           `json:"is_resolved" gorm:"default:false"`
	ResolvedAt  *time.Time     `json:"resolved_at"`
	ResolvedBy  *uuid.UUID     `json:"resolved_by" gorm:"type:uuid"`
	CreatedAt   time.Time      `json:"created_at"`

	// Связи
	User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// FraudCheckRequest представляет запрос на проверку фрод-контроля
type FraudCheckRequest struct {
	UserID        uuid.UUID              `json:"user_id"`
	TransactionID *uuid.UUID             `json:"transaction_id,omitempty"`
	EventType     string                 `json:"event_type"`
	Amount        decimal.Decimal        `json:"amount,omitempty"`
	Currency      string                 `json:"currency,omitempty"`
	Country       string                 `json:"country,omitempty"`
	IPAddress     string                 `json:"ip_address,omitempty"`
	DeviceID      string                 `json:"device_id,omitempty"`
	MerchantID    string                 `json:"merchant_id,omitempty"`
	MCC           string                 `json:"mcc,omitempty"`
	Latitude      *float64               `json:"latitude,omitempty"`
	Longitude     *float64               `json:"longitude,omitempty"`
	EventData     map[string]interface{} `json:"event_data,omitempty"`
}

// FraudCheckResponse представляет результат проверки фрод-контроля
type FraudCheckResponse struct {
	Allowed         bool             `json:"allowed"`
	RiskScore       int              `json:"risk_score"` // 0-100
	RiskLevel       FraudRiskLevel   `json:"risk_level"`
	Status          FraudStatus      `json:"status"`
	Rules           []FraudRuleInfo  `json:"rules"`
	Violations      []FraudViolation `json:"violations"`
	Recommendations []string         `json:"recommendations"`
}

// FraudRuleInfo представляет информацию о правиле
type FraudRuleInfo struct {
	RuleID      uuid.UUID      `json:"rule_id"`
	RuleName    string         `json:"rule_name"`
	RuleType    FraudRuleType  `json:"rule_type"`
	RiskLevel   FraudRiskLevel `json:"risk_level"`
	Score       int            `json:"score"`
	Description string         `json:"description"`
}

// FraudViolation представляет нарушение правила
type FraudViolation struct {
	RuleID      uuid.UUID              `json:"rule_id"`
	RuleName    string                 `json:"rule_name"`
	RuleType    FraudRuleType          `json:"rule_type"`
	RiskLevel   FraudRiskLevel         `json:"risk_level"`
	Score       int                    `json:"score"`
	Description string                 `json:"description"`
	Details     map[string]interface{} `json:"details"`
}

// FraudStats представляет статистику фрод-контроля
type FraudStats struct {
	UserID           uuid.UUID `json:"user_id"`
	TotalChecks      int       `json:"total_checks"`
	BlockedChecks    int       `json:"blocked_checks"`
	ReviewChecks     int       `json:"review_checks"`
	ApprovedChecks   int       `json:"approved_checks"`
	AverageRiskScore float64   `json:"average_risk_score"`
	HighRiskEvents   int       `json:"high_risk_events"`
	ActiveAlerts     int       `json:"active_alerts"`
	LastUpdated      time.Time `json:"last_updated"`
}

// FraudRuleCondition представляет условие правила
type FraudRuleCondition struct {
	Field    string      `json:"field"`
	Operator string      `json:"operator"` // eq, ne, gt, lt, gte, lte, in, not_in, contains, regex
	Value    interface{} `json:"value"`
}

// FraudRuleConditions представляет набор условий правила
type FraudRuleConditions struct {
	Operator   string                `json:"operator"` // and, or
	Conditions []FraudRuleCondition  `json:"conditions"`
	Groups     []FraudRuleConditions `json:"groups,omitempty"`
}

// CreateFraudRuleRequest представляет запрос на создание правила
type CreateFraudRuleRequest struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	RuleType    FraudRuleType  `json:"rule_type"`
	Conditions  string         `json:"conditions"`
	Action      FraudAction    `json:"action"`
	RiskLevel   FraudRiskLevel `json:"risk_level"`
	Priority    int            `json:"priority"`
	IsActive    bool           `json:"is_active"`
}

// UpdateFraudRuleRequest представляет запрос на обновление правила
type UpdateFraudRuleRequest struct {
	Name        string         `json:"name,omitempty"`
	Description string         `json:"description,omitempty"`
	RuleType    FraudRuleType  `json:"rule_type,omitempty"`
	Conditions  string         `json:"conditions,omitempty"`
	Action      FraudAction    `json:"action,omitempty"`
	RiskLevel   FraudRiskLevel `json:"risk_level,omitempty"`
	Priority    *int           `json:"priority,omitempty"`
	IsActive    *bool          `json:"is_active,omitempty"`
}
