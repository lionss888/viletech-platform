package striga

import (
	"fmt"
	"time"

	"amg-flow-backend/internal/integrations/common"

	"github.com/shopspring/decimal"
)

// User - модель пользователя Striga
type User struct {
	ID               string                 `json:"id"`
	Email            string                 `json:"email"`
	FirstName        string                 `json:"first_name"`
	LastName         string                 `json:"last_name"`
	DateOfBirth      string                 `json:"date_of_birth"`
	Country          string                 `json:"country"`
	Phone            string                 `json:"phone"`
	Status           common.Status          `json:"status"`
	KYCLevel         string                 `json:"kyc_level"`
	KYCStatus        string                 `json:"kyc_status"`         // PENDING, APPROVED, REJECTED
	RiskLevel        string                 `json:"risk_level"`         // LOW, MEDIUM, HIGH
	ComplianceStatus string                 `json:"compliance_status"`  // PENDING, APPROVED, REJECTED
	ComplianceID     string                 `json:"compliance_id"`      // SumSub applicant ID
	IPWhitelist      []string               `json:"ip_whitelist"`       // Разрешённые IP адреса
	TwoFactorEnabled bool                   `json:"two_factor_enabled"` // 2FA включена
	EmailVerified    bool                   `json:"email_verified"`     // Email подтверждён
	PhoneVerified    bool                   `json:"phone_verified"`     // Телефон подтверждён
	CreatedAt        time.Time              `json:"created_at"`
	UpdatedAt        time.Time              `json:"updated_at"`
	LastLoginAt      *time.Time             `json:"last_login_at,omitempty"`
	Metadata         map[string]interface{} `json:"metadata,omitempty"`
}

// CreateUserRequest - запрос на создание пользователя
type CreateUserRequest struct {
	Email       string                 `json:"email" validate:"required,email"`
	FirstName   string                 `json:"first_name" validate:"required"`
	LastName    string                 `json:"last_name" validate:"required"`
	DateOfBirth string                 `json:"date_of_birth" validate:"required"`
	Country     string                 `json:"country" validate:"required"`
	Phone       string                 `json:"phone"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// UpdateUserRequest - запрос на обновление пользователя
type UpdateUserRequest struct {
	FirstName string                 `json:"first_name,omitempty"`
	LastName  string                 `json:"last_name,omitempty"`
	Phone     string                 `json:"phone,omitempty"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// Wallet - модель кошелька Striga
type Wallet struct {
	ID        string          `json:"id"`
	UserID    string          `json:"user_id"`
	Currency  string          `json:"currency"`
	Balance   decimal.Decimal `json:"balance"`
	Available decimal.Decimal `json:"available"`
	Reserved  decimal.Decimal `json:"reserved"`
	Status    common.Status   `json:"status"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

// CreateWalletRequest - запрос на создание кошелька
type CreateWalletRequest struct {
	UserID   string `json:"user_id" validate:"required"`
	Currency string `json:"currency" validate:"required"`
}

// Card - модель карты Striga
type Card struct {
	ID          string                 `json:"id"`
	UserID      string                 `json:"user_id"`
	WalletID    string                 `json:"wallet_id"`
	CardNumber  string                 `json:"card_number"`
	ExpiryMonth int                    `json:"expiry_month"`
	ExpiryYear  int                    `json:"expiry_year"`
	CVV         string                 `json:"cvv,omitempty"`
	CardType    string                 `json:"card_type"` // virtual, physical
	Currency    string                 `json:"currency"`
	Status      common.Status          `json:"status"`
	Limits      *CardLimits            `json:"limits,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// CardLimits - лимиты карты
type CardLimits struct {
	DailySpend       decimal.Decimal `json:"daily_spend"`
	MonthlySpend     decimal.Decimal `json:"monthly_spend"`
	ATMDaily         decimal.Decimal `json:"atm_daily"`
	ATMMonthly       decimal.Decimal `json:"atm_monthly"`
	OnlineSpend      decimal.Decimal `json:"online_spend"`
	ContactlessLimit decimal.Decimal `json:"contactless_limit"`
}

// CreateCardRequest - запрос на создание карты
type CreateCardRequest struct {
	UserID   string      `json:"user_id" validate:"required"`
	WalletID string      `json:"wallet_id" validate:"required"`
	CardType string      `json:"card_type" validate:"required"` // virtual, physical
	Limits   *CardLimits `json:"limits,omitempty"`
}

// UpdateCardRequest - запрос на обновление карты
type UpdateCardRequest struct {
	Status common.Status `json:"status,omitempty"`
	Limits *CardLimits   `json:"limits,omitempty"`
}

// Transaction - модель транзакции Striga
type Transaction struct {
	ID           string          `json:"id"`
	UserID       string          `json:"user_id"`
	WalletID     string          `json:"wallet_id"`
	CardID       string          `json:"card_id,omitempty"`
	Type         string          `json:"type"` // deposit, withdrawal, transfer, card_payment
	Amount       decimal.Decimal `json:"amount"`
	Currency     string          `json:"currency"`
	Description  string          `json:"description"`
	Reference    string          `json:"reference"`
	Status       common.Status   `json:"status"`
	ProcessedAt  *time.Time      `json:"processed_at,omitempty"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
	ExternalRef  string          `json:"external_ref,omitempty"`
	Fee          decimal.Decimal `json:"fee,omitempty"`
	ExchangeRate decimal.Decimal `json:"exchange_rate,omitempty"`
}

// CreateTransactionRequest - запрос на создание транзакции
type CreateTransactionRequest struct {
	UserID      string          `json:"user_id" validate:"required"`
	WalletID    string          `json:"wallet_id" validate:"required"`
	Type        string          `json:"type" validate:"required"`
	Amount      decimal.Decimal `json:"amount" validate:"required"`
	Currency    string          `json:"currency" validate:"required"`
	Description string          `json:"description"`
	Reference   string          `json:"reference"`
	ExternalRef string          `json:"external_ref,omitempty"`
}

// KYC - модель KYC процесса
type KYC struct {
	ID               string        `json:"id"`
	UserID           string        `json:"user_id"`
	Status           common.Status `json:"status"`
	Level            string        `json:"level"`
	Documents        []KYCDocument `json:"documents"`
	RejectionReasons []string      `json:"rejection_reasons,omitempty"`
	CreatedAt        time.Time     `json:"created_at"`
	UpdatedAt        time.Time     `json:"updated_at"`
}

// KYCDocument - документ для KYC
type KYCDocument struct {
	ID          string        `json:"id"`
	Type        string        `json:"type"`
	Status      common.Status `json:"status"`
	FileName    string        `json:"file_name"`
	ContentType string        `json:"content_type"`
	UploadedAt  time.Time     `json:"uploaded_at"`
}

// CreateKYCRequest - запрос на создание KYC
type CreateKYCRequest struct {
	UserID    string                 `json:"user_id" validate:"required"`
	Level     string                 `json:"level" validate:"required"`
	Documents []KYCDocumentRequest   `json:"documents,omitempty"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// KYCDocumentRequest - запрос на загрузку документа
type KYCDocumentRequest struct {
	Type        string `json:"type" validate:"required"`
	FileURL     string `json:"file_url" validate:"required"`
	FileName    string `json:"file_name" validate:"required"`
	ContentType string `json:"content_type" validate:"required"`
}

// Webhook - модель webhook события
type WebhookEvent struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	UserID    string                 `json:"user_id,omitempty"`
	Data      map[string]interface{} `json:"data"`
	Timestamp time.Time              `json:"timestamp"`
	Signature string                 `json:"signature"`
}

// Поддерживаемые типы webhook событий
const (
	WebhookUserCreated        = "user.created"
	WebhookUserUpdated        = "user.updated"
	WebhookUserKYCUpdated     = "user.kyc.updated"
	WebhookWalletCreated      = "wallet.created"
	WebhookWalletUpdated      = "wallet.updated"
	WebhookCardCreated        = "card.created"
	WebhookCardUpdated        = "card.updated"
	WebhookCardActivated      = "card.activated"
	WebhookCardBlocked        = "card.blocked"
	WebhookTransactionCreated = "transaction.created"
	WebhookTransactionUpdated = "transaction.updated"
	WebhookTransactionFailed  = "transaction.failed"
)

// Response wrappers для API ответов
type UserResponse struct {
	User *User `json:"user"`
}

type UsersResponse struct {
	Users []User `json:"users"`
	Total int    `json:"total"`
}

type WalletResponse struct {
	Wallet *Wallet `json:"wallet"`
}

type WalletsResponse struct {
	Wallets []Wallet `json:"wallets"`
	Total   int      `json:"total"`
}

type CardResponse struct {
	Card *Card `json:"card"`
}

type CardsResponse struct {
	Cards []Card `json:"cards"`
	Total int    `json:"total"`
}

type TransactionResponse struct {
	Transaction *Transaction `json:"transaction"`
}

type TransactionsResponse struct {
	Transactions []Transaction `json:"transactions"`
	Total        int           `json:"total"`
	HasMore      bool          `json:"has_more"`
}

type KYCResponse struct {
	KYC *KYC `json:"kyc"`
}

// Ошибки Striga API
type StrigaError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

func (e StrigaError) Error() string {
	if e.Details != "" {
		return fmt.Sprintf("Striga API error %s: %s (%s)", e.Code, e.Message, e.Details)
	}
	return fmt.Sprintf("Striga API error %s: %s", e.Code, e.Message)
}

// Константы для статусов и типов
const (
	// Статусы пользователей
	UserStatusActive    = "active"
	UserStatusInactive  = "inactive"
	UserStatusSuspended = "suspended"

	// Уровни KYC
	KYCLevelBasic    = "basic"
	KYCLevelStandard = "standard"
	KYCLevelEnhanced = "enhanced"

	// Статусы KYC
	KYCStatusPending  = "pending"
	KYCStatusApproved = "approved"
	KYCStatusRejected = "rejected"

	// Уровни риска
	RiskLevelLow    = "low"
	RiskLevelMedium = "medium"
	RiskLevelHigh   = "high"

	// Статусы compliance
	ComplianceStatusPending  = "pending"
	ComplianceStatusApproved = "approved"
	ComplianceStatusRejected = "rejected"

	// Типы карт
	CardTypeVirtual  = "virtual"
	CardTypePhysical = "physical"

	// Типы транзакций
	TransactionTypeDeposit     = "deposit"
	TransactionTypeWithdrawal  = "withdrawal"
	TransactionTypeTransfer    = "transfer"
	TransactionTypeCardPayment = "card_payment"
	TransactionTypeFee         = "fee"

	// Статусы транзакций
	TransactionStatusPending   = "pending"
	TransactionStatusCompleted = "completed"
	TransactionStatusFailed    = "failed"
	TransactionStatusCancelled = "cancelled"
)
