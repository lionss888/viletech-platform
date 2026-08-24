package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// FeeType определяет тип комиссии
type FeeType string

const (
	FeeTypeFixed        FeeType = "fixed"        // Фиксированная комиссия
	FeeTypePercentage   FeeType = "percentage"   // Процентная комиссия
	FeeTypeTiered       FeeType = "tiered"       // Многоуровневая комиссия
	FeeTypeVolume       FeeType = "volume"       // Объемная комиссия
	FeeTypeTimeBased    FeeType = "time_based"   // Временная комиссия
	FeeTypeCountryBased FeeType = "country_based" // Страновая комиссия
)

// FeeCategory определяет категорию комиссии
type FeeCategory string

const (
	FeeCategoryCard        FeeCategory = "card"        // Карточные операции
	FeeCategoryTransfer    FeeCategory = "transfer"    // Переводы
	FeeCategoryCrypto      FeeCategory = "crypto"       // Криптовалютные операции
	FeeCategoryFX          FeeCategory = "fx"          // Валютный обмен
	FeeCategoryATM         FeeCategory = "atm"         // Банкоматы
	FeeCategoryOnline      FeeCategory = "online"      // Онлайн платежи
	FeeCategoryPOS         FeeCategory = "pos"         // POS терминалы
	FeeCategoryWithdrawal  FeeCategory = "withdrawal"  // Снятие наличных
	FeeCategoryDeposit     FeeCategory = "deposit"     // Пополнение
	FeeCategoryMaintenance FeeCategory = "maintenance" // Обслуживание
)

// FeeStatus определяет статус комиссии
type FeeStatus string

const (
	FeeStatusActive   FeeStatus = "active"   // Активная
	FeeStatusInactive FeeStatus = "inactive" // Неактивная
	FeeStatusPending  FeeStatus = "pending"  // На рассмотрении
	FeeStatusExpired  FeeStatus = "expired"  // Истекшая
)

// FeeConfig представляет конфигурацию комиссии
type FeeConfig struct {
	ID          uuid.UUID    `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name        string       `json:"name" gorm:"not null"`
	Description string       `json:"description"`
	FeeType     FeeType      `json:"fee_type" gorm:"not null"`
	Category    FeeCategory  `json:"category" gorm:"not null"`
	Amount      decimal.Decimal `json:"amount" gorm:"type:numeric(18,4);not null"`
	Percentage  decimal.Decimal `json:"percentage" gorm:"type:numeric(5,4)"` // До 4 знаков после запятой
	MinAmount   decimal.Decimal `json:"min_amount" gorm:"type:numeric(18,4)"`
	MaxAmount   decimal.Decimal `json:"max_amount" gorm:"type:numeric(18,4)"`
	Currency    string       `json:"currency" gorm:"not null"`
	Country     string       `json:"country,omitempty"`
	MCC         string       `json:"mcc,omitempty"` // Merchant Category Code
	UserTier    string       `json:"user_tier,omitempty"` // VIP, Premium, Standard
	IsActive    bool         `json:"is_active" gorm:"default:true"`
	Priority    int          `json:"priority" gorm:"default:0"`
	ValidFrom   time.Time    `json:"valid_from"`
	ValidTo     *time.Time   `json:"valid_to,omitempty"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`

	// Связи
	FeeTiers []FeeTier `json:"fee_tiers,omitempty" gorm:"foreignKey:FeeConfigID"`
}

// FeeTier представляет уровень комиссии
type FeeTier struct {
	ID          uuid.UUID       `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	FeeConfigID uuid.UUID       `json:"fee_config_id" gorm:"type:uuid;not null;index"`
	MinAmount   decimal.Decimal `json:"min_amount" gorm:"type:numeric(18,4);not null"`
	MaxAmount   decimal.Decimal `json:"max_amount" gorm:"type:numeric(18,4)"`
	Amount      decimal.Decimal `json:"amount" gorm:"type:numeric(18,4);not null"`
	Percentage  decimal.Decimal `json:"percentage" gorm:"type:numeric(5,4)"`
	Priority    int             `json:"priority" gorm:"default:0"`
	CreatedAt   time.Time       `json:"created_at"`

	// Связи
	FeeConfig *FeeConfig `json:"fee_config,omitempty" gorm:"foreignKey:FeeConfigID"`
}

// FeeCalculation представляет расчет комиссии
type FeeCalculation struct {
	ID            uuid.UUID       `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID        uuid.UUID       `json:"user_id" gorm:"type:uuid;not null;index"`
	TransactionID *uuid.UUID      `json:"transaction_id" gorm:"type:uuid;index"`
	FeeConfigID   uuid.UUID       `json:"fee_config_id" gorm:"type:uuid;not null;index"`
	Amount        decimal.Decimal `json:"amount" gorm:"type:numeric(18,4);not null"`
	Currency      string          `json:"currency" gorm:"not null"`
	FeeAmount     decimal.Decimal `json:"fee_amount" gorm:"type:numeric(18,4);not null"`
	FeePercentage decimal.Decimal `json:"fee_percentage" gorm:"type:numeric(5,4)"`
	AppliedTier   *uuid.UUID      `json:"applied_tier" gorm:"type:uuid"`
	Calculation   string          `json:"calculation" gorm:"type:jsonb"` // JSON с деталями расчета
	CreatedAt     time.Time       `json:"created_at"`

	// Связи
	User        *User     `json:"user,omitempty" gorm:"foreignKey:UserID"`
	FeeConfig   *FeeConfig `json:"fee_config,omitempty" gorm:"foreignKey:FeeConfigID"`
}

// SpreadConfig представляет конфигурацию спреда
type SpreadConfig struct {
	ID          uuid.UUID       `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name        string          `json:"name" gorm:"not null"`
	Description string          `json:"description"`
	FromCurrency string        `json:"from_currency" gorm:"not null"`
	ToCurrency   string        `json:"to_currency" gorm:"not null"`
	Spread      decimal.Decimal `json:"spread" gorm:"type:numeric(5,4);not null"` // Спред в процентах
	MinSpread   decimal.Decimal `json:"min_spread" gorm:"type:numeric(5,4)"`
	MaxSpread   decimal.Decimal `json:"max_spread" gorm:"type:numeric(5,4)"`
	Country     string          `json:"country,omitempty"`
	UserTier    string          `json:"user_tier,omitempty"`
	IsActive    bool            `json:"is_active" gorm:"default:true"`
	Priority    int             `json:"priority" gorm:"default:0"`
	ValidFrom   time.Time       `json:"valid_from"`
	ValidTo     *time.Time      `json:"valid_to,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

// SpreadCalculation представляет расчет спреда
type SpreadCalculation struct {
	ID            uuid.UUID       `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID        uuid.UUID       `json:"user_id" gorm:"type:uuid;not null;index"`
	TransactionID *uuid.UUID      `json:"transaction_id" gorm:"type:uuid;index"`
	SpreadConfigID uuid.UUID      `json:"spread_config_id" gorm:"type:uuid;not null;index"`
	FromCurrency  string          `json:"from_currency" gorm:"not null"`
	ToCurrency    string          `json:"to_currency" gorm:"not null"`
	Amount        decimal.Decimal `json:"amount" gorm:"type:numeric(18,4);not null"`
	ExchangeRate  decimal.Decimal `json:"exchange_rate" gorm:"type:numeric(18,8);not null"`
	Spread        decimal.Decimal `json:"spread" gorm:"type:numeric(5,4);not null"`
	SpreadAmount  decimal.Decimal `json:"spread_amount" gorm:"type:numeric(18,4);not null"`
	FinalAmount   decimal.Decimal `json:"final_amount" gorm:"type:numeric(18,4);not null"`
	Calculation   string          `json:"calculation" gorm:"type:jsonb"` // JSON с деталями расчета
	CreatedAt     time.Time       `json:"created_at"`

	// Связи
	User        *User         `json:"user,omitempty" gorm:"foreignKey:UserID"`
	SpreadConfig *SpreadConfig `json:"spread_config,omitempty" gorm:"foreignKey:SpreadConfigID"`
}

// FeeCalculationRequest представляет запрос на расчет комиссии
type FeeCalculationRequest struct {
	UserID        uuid.UUID       `json:"user_id"`
	TransactionID *uuid.UUID      `json:"transaction_id,omitempty"`
	Category      FeeCategory     `json:"category"`
	Amount        decimal.Decimal `json:"amount"`
	Currency      string          `json:"currency"`
	Country       string          `json:"country,omitempty"`
	MCC           string          `json:"mcc,omitempty"`
	UserTier      string          `json:"user_tier,omitempty"`
	MerchantID    string          `json:"merchant_id,omitempty"`
}

// FeeCalculationResponse представляет результат расчета комиссии
type FeeCalculationResponse struct {
	FeeAmount     decimal.Decimal `json:"fee_amount"`
	FeePercentage decimal.Decimal `json:"fee_percentage"`
	TotalAmount   decimal.Decimal `json:"total_amount"`
	NetAmount     decimal.Decimal `json:"net_amount"`
	AppliedConfig *FeeConfig      `json:"applied_config,omitempty"`
	AppliedTier   *FeeTier        `json:"applied_tier,omitempty"`
	Calculation   map[string]interface{} `json:"calculation"`
}

// SpreadCalculationRequest представляет запрос на расчет спреда
type SpreadCalculationRequest struct {
	UserID        uuid.UUID       `json:"user_id"`
	TransactionID *uuid.UUID      `json:"transaction_id,omitempty"`
	FromCurrency  string          `json:"from_currency"`
	ToCurrency    string          `json:"to_currency"`
	Amount        decimal.Decimal `json:"amount"`
	Country       string          `json:"country,omitempty"`
	UserTier      string          `json:"user_tier,omitempty"`
}

// SpreadCalculationResponse представляет результат расчета спреда
type SpreadCalculationResponse struct {
	ExchangeRate  decimal.Decimal `json:"exchange_rate"`
	Spread        decimal.Decimal `json:"spread"`
	SpreadAmount  decimal.Decimal `json:"spread_amount"`
	FinalAmount   decimal.Decimal `json:"final_amount"`
	AppliedConfig *SpreadConfig   `json:"applied_config,omitempty"`
	Calculation   map[string]interface{} `json:"calculation"`
}

// FeeStats представляет статистику комиссий
type FeeStats struct {
	UserID           uuid.UUID       `json:"user_id"`
	TotalFees        decimal.Decimal `json:"total_fees"`
	TotalTransactions int            `json:"total_transactions"`
	AverageFee       decimal.Decimal `json:"average_fee"`
	FeeByCategory    map[string]decimal.Decimal `json:"fee_by_category"`
	FeeByCurrency    map[string]decimal.Decimal `json:"fee_by_currency"`
	LastUpdated      time.Time       `json:"last_updated"`
}

// FeeTierConfig представляет конфигурацию многоуровневой комиссии
type FeeTierConfig struct {
	MinAmount   decimal.Decimal `json:"min_amount"`
	MaxAmount   decimal.Decimal `json:"max_amount"`
	Amount      decimal.Decimal `json:"amount"`
	Percentage  decimal.Decimal `json:"percentage"`
	Priority    int             `json:"priority"`
}

// FeeCalculationDetails представляет детали расчета комиссии
type FeeCalculationDetails struct {
	BaseAmount      decimal.Decimal `json:"base_amount"`
	FeeType         FeeType         `json:"fee_type"`
	AppliedTier     *FeeTierConfig  `json:"applied_tier,omitempty"`
	FixedAmount     decimal.Decimal `json:"fixed_amount"`
	PercentageAmount decimal.Decimal `json:"percentage_amount"`
	MinAmount       decimal.Decimal `json:"min_amount"`
	MaxAmount       decimal.Decimal `json:"max_amount"`
	FinalAmount     decimal.Decimal `json:"final_amount"`
	Calculation     string          `json:"calculation"`
}
