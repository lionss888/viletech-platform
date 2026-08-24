package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// LimitType определяет тип лимита
type LimitType string

const (
	LimitTypeDaily          LimitType = "daily"
	LimitTypeMonthly        LimitType = "monthly"
	LimitTypePerTransaction LimitType = "per_transaction"
	LimitTypeWeekly         LimitType = "weekly"
	LimitTypeYearly         LimitType = "yearly"
)

// LimitCategory определяет категорию лимита
type LimitCategory string

const (
	LimitCategoryCard     LimitCategory = "card"
	LimitCategoryTransfer LimitCategory = "transfer"
	LimitCategoryCrypto   LimitCategory = "crypto"
	LimitCategoryFX       LimitCategory = "fx"
	LimitCategoryATM      LimitCategory = "atm"
	LimitCategoryOnline   LimitCategory = "online"
	LimitCategoryPOS      LimitCategory = "pos"
)

// LimitConfig представляет конфигурацию лимита
type LimitConfig struct {
	ID          uuid.UUID       `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID      *uuid.UUID      `json:"user_id" gorm:"type:uuid;index"`
	LimitType   LimitType       `json:"limit_type" gorm:"not null"`
	Category    LimitCategory   `json:"category" gorm:"not null"`
	Amount      decimal.Decimal `json:"amount" gorm:"type:decimal(20,8);not null"`
	Currency    string          `json:"currency" gorm:"not null"`
	Country     string          `json:"country" gorm:"index"`
	MCC         string          `json:"mcc" gorm:"index"` // Merchant Category Code
	Description string          `json:"description"`
	IsActive    bool            `json:"is_active" gorm:"default:true"`
	Priority    int             `json:"priority" gorm:"default:0"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`

	// Связи
	User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// LimitUsage представляет использование лимита
type LimitUsage struct {
	ID            uuid.UUID       `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID        uuid.UUID       `json:"user_id" gorm:"type:uuid;not null;index"`
	LimitID       uuid.UUID       `json:"limit_id" gorm:"type:uuid;not null;index"`
	UsedAmount    decimal.Decimal `json:"used_amount" gorm:"type:decimal(20,8);not null"`
	Period        string          `json:"period" gorm:"not null;index"` // 2024-01-01, 2024-01
	TransactionID *uuid.UUID      `json:"transaction_id" gorm:"type:uuid;index"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`

	// Связи
	Limit *LimitConfig `json:"limit,omitempty" gorm:"foreignKey:LimitID"`
	User  *User        `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// LimitCheckRequest представляет запрос на проверку лимита
type LimitCheckRequest struct {
	UserID        uuid.UUID       `json:"user_id"`
	Amount        decimal.Decimal `json:"amount"`
	Currency      string          `json:"currency"`
	Category      LimitCategory   `json:"category"`
	Country       string          `json:"country,omitempty"`
	MCC           string          `json:"mcc,omitempty"`
	TransactionID *uuid.UUID      `json:"transaction_id,omitempty"`
}

// LimitCheckResponse представляет результат проверки лимита
type LimitCheckResponse struct {
	Allowed    bool             `json:"allowed"`
	Remaining  decimal.Decimal  `json:"remaining"`
	ExceededBy decimal.Decimal  `json:"exceeded_by"`
	Limits     []LimitInfo      `json:"limits"`
	Violations []LimitViolation `json:"violations"`
}

// LimitInfo представляет информацию о лимите
type LimitInfo struct {
	LimitID    uuid.UUID       `json:"limit_id"`
	LimitType  LimitType       `json:"limit_type"`
	Category   LimitCategory   `json:"category"`
	Amount     decimal.Decimal `json:"amount"`
	UsedAmount decimal.Decimal `json:"used_amount"`
	Remaining  decimal.Decimal `json:"remaining"`
	Period     string          `json:"period"`
}

// LimitViolation представляет нарушение лимита
type LimitViolation struct {
	LimitID     uuid.UUID       `json:"limit_id"`
	LimitType   LimitType       `json:"limit_type"`
	Category    LimitCategory   `json:"category"`
	Amount      decimal.Decimal `json:"amount"`
	UsedAmount  decimal.Decimal `json:"used_amount"`
	ExceededBy  decimal.Decimal `json:"exceeded_by"`
	Period      string          `json:"period"`
	Description string          `json:"description"`
}

// LimitStats представляет статистику по лимитам
type LimitStats struct {
	UserID         uuid.UUID       `json:"user_id"`
	TotalLimits    int             `json:"total_limits"`
	ActiveLimits   int             `json:"active_limits"`
	TotalUsed      decimal.Decimal `json:"total_used"`
	TotalRemaining decimal.Decimal `json:"total_remaining"`
	Violations     int             `json:"violations"`
	LastUpdated    time.Time       `json:"last_updated"`
}
