package railsr

import (
	"fmt"
	"time"

	"github.com/shopspring/decimal"
)

// RailsRResponse - стандартный формат ответа RailsR API (JSON:API)
type RailsRResponse struct {
	Data     interface{}      `json:"data"`
	Included []ResourceObject `json:"included,omitempty"`
	Links    *Links           `json:"links,omitempty"`
	Meta     *Meta            `json:"meta,omitempty"`
	Errors   []RailsRError    `json:"errors,omitempty"`
}

// ResourceObject - объект ресурса в JSON:API формате
type ResourceObject struct {
	Type          string                 `json:"type"`
	ID            string                 `json:"id"`
	Attributes    map[string]interface{} `json:"attributes,omitempty"`
	Relationships map[string]interface{} `json:"relationships,omitempty"`
	Links         *Links                 `json:"links,omitempty"`
	Meta          *Meta                  `json:"meta,omitempty"`
}

// Links - ссылки в JSON:API формате
type Links struct {
	Self    string `json:"self,omitempty"`
	Related string `json:"related,omitempty"`
	First   string `json:"first,omitempty"`
	Last    string `json:"last,omitempty"`
	Prev    string `json:"prev,omitempty"`
	Next    string `json:"next,omitempty"`
}

// Meta - метаданные в JSON:API формате
type Meta struct {
	Count      int                    `json:"count,omitempty"`
	TotalCount int                    `json:"total_count,omitempty"`
	Page       int                    `json:"page,omitempty"`
	PerPage    int                    `json:"per_page,omitempty"`
	Additional map[string]interface{} `json:",inline"`
}

// RailsRError - формат ошибки RailsR API
type RailsRError struct {
	ID     string       `json:"id,omitempty"`
	Status string       `json:"status,omitempty"`
	Code   string       `json:"code,omitempty"`
	Title  string       `json:"title,omitempty"`
	Detail string       `json:"detail,omitempty"`
	Source *ErrorSource `json:"source,omitempty"`
	Meta   *Meta        `json:"meta,omitempty"`
}

func (e RailsRError) Error() string {
	if e.Detail != "" {
		return fmt.Sprintf("RailsR API error %s: %s (%s)", e.Code, e.Title, e.Detail)
	}
	return fmt.Sprintf("RailsR API error %s: %s", e.Code, e.Title)
}

// ErrorSource - источник ошибки
type ErrorSource struct {
	Pointer   string `json:"pointer,omitempty"`
	Parameter string `json:"parameter,omitempty"`
}

// Account - банковский счёт RailsR
type Account struct {
	ID            string                 `json:"id"`
	Type          string                 `json:"type"` // current, savings
	Currency      string                 `json:"currency"`
	Status        string                 `json:"status"`
	Balance       decimal.Decimal        `json:"balance"`
	Available     decimal.Decimal        `json:"available"`
	Reserved      decimal.Decimal        `json:"reserved"`
	IBAN          string                 `json:"iban,omitempty"`
	AccountNumber string                 `json:"account_number,omitempty"`
	SortCode      string                 `json:"sort_code,omitempty"`
	BIC           string                 `json:"bic,omitempty"`
	CreatedAt     time.Time              `json:"created_at"`
	UpdatedAt     time.Time              `json:"updated_at"`
	Metadata      map[string]interface{} `json:"metadata,omitempty"`
}

// CreateAccountRequest - запрос на создание счёта
type CreateAccountRequest struct {
	Data CreateAccountData `json:"data"`
}

// CreateAccountData - данные для создания счёта
type CreateAccountData struct {
	Type       string                  `json:"type"`
	Attributes CreateAccountAttributes `json:"attributes"`
}

// CreateAccountAttributes - атрибуты создания счёта
type CreateAccountAttributes struct {
	Currency    string                 `json:"currency" validate:"required"`
	AccountType string                 `json:"account_type" validate:"required"` // current, savings
	ProductType string                 `json:"product_type,omitempty"`
	Name        string                 `json:"name,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// Card - банковская карта RailsR
type Card struct {
	ID          string          `json:"id"`
	AccountID   string          `json:"account_id"`
	CardNumber  string          `json:"card_number"`
	ExpiryMonth int             `json:"expiry_month"`
	ExpiryYear  int             `json:"expiry_year"`
	CVV         string          `json:"cvv,omitempty"`
	CardType    string          `json:"card_type"` // virtual, physical
	Status      string          `json:"status"`
	Currency    string          `json:"currency"`
	SpendLimit  decimal.Decimal `json:"spend_limit"`
	ATMLimit    decimal.Decimal `json:"atm_limit"`
	OnlineLimit decimal.Decimal `json:"online_limit"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

// CreateCardRequest - запрос на создание карты
type CreateCardRequest struct {
	Data CreateCardData `json:"data"`
}

// CreateCardData - данные для создания карты
type CreateCardData struct {
	Type       string               `json:"type"`
	Attributes CreateCardAttributes `json:"attributes"`
}

// CreateCardAttributes - атрибуты создания карты
type CreateCardAttributes struct {
	AccountID   string          `json:"account_id" validate:"required"`
	CardType    string          `json:"card_type" validate:"required"`
	Currency    string          `json:"currency" validate:"required"`
	SpendLimit  decimal.Decimal `json:"spend_limit,omitempty"`
	ATMLimit    decimal.Decimal `json:"atm_limit,omitempty"`
	OnlineLimit decimal.Decimal `json:"online_limit,omitempty"`
}

// Transaction - транзакция RailsR
type Transaction struct {
	ID               string          `json:"id"`
	Type             string          `json:"type"`
	Amount           decimal.Decimal `json:"amount"`
	Currency         string          `json:"currency"`
	Direction        string          `json:"direction"` // inbound, outbound
	Status           string          `json:"status"`
	Reference        string          `json:"reference"`
	Description      string          `json:"description"`
	CounterpartyName string          `json:"counterparty_name,omitempty"`
	CounterpartyIBAN string          `json:"counterparty_iban,omitempty"`
	IdempotencyKey   string          `json:"idempotency_key,omitempty"`
	ProcessedAt      *time.Time      `json:"processed_at,omitempty"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

// CreateTransactionRequest - запрос на создание транзакции
type CreateTransactionRequest struct {
	Data CreateTransactionData `json:"data"`
}

// CreateTransactionData - данные для создания транзакции
type CreateTransactionData struct {
	Type       string                      `json:"type"`
	Attributes CreateTransactionAttributes `json:"attributes"`
}

// CreateTransactionAttributes - атрибуты создания транзакции
type CreateTransactionAttributes struct {
	FromAccountID    string          `json:"from_account_id" validate:"required"`
	ToAccountID      string          `json:"to_account_id,omitempty"`
	CounterpartyIBAN string          `json:"counterparty_iban,omitempty"`
	CounterpartyName string          `json:"counterparty_name,omitempty"`
	Amount           decimal.Decimal `json:"amount" validate:"required"`
	Currency         string          `json:"currency" validate:"required"`
	Reference        string          `json:"reference,omitempty"`
	Description      string          `json:"description,omitempty"`
	IdempotencyKey   string          `json:"idempotency_key,omitempty"`
}

// Webhook - модель webhook события RailsR
type WebhookEvent struct {
	ID        string         `json:"id"`
	Type      string         `json:"type"`
	AccountID string         `json:"account_id,omitempty"`
	Data      ResourceObject `json:"data"`
	Timestamp time.Time      `json:"timestamp"`
	Signature string         `json:"signature,omitempty"`
}

// Customer - клиент RailsR
type Customer struct {
	ID          string    `json:"id"`
	FirstName   string    `json:"first_name"`
	LastName    string    `json:"last_name"`
	Email       string    `json:"email"`
	Phone       string    `json:"phone"`
	DateOfBirth string    `json:"date_of_birth"`
	Nationality string    `json:"nationality"`
	Address     *Address  `json:"address,omitempty"`
	KYCStatus   string    `json:"kyc_status"`
	RiskLevel   string    `json:"risk_level"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Address - адрес клиента
type Address struct {
	Line1      string `json:"line1"`
	Line2      string `json:"line2,omitempty"`
	City       string `json:"city"`
	Region     string `json:"region,omitempty"`
	PostalCode string `json:"postal_code"`
	Country    string `json:"country"`
}

// CreateCustomerRequest - запрос на создание клиента
type CreateCustomerRequest struct {
	Data CreateCustomerData `json:"data"`
}

// CreateCustomerData - данные для создания клиента
type CreateCustomerData struct {
	Type       string                   `json:"type"`
	Attributes CreateCustomerAttributes `json:"attributes"`
}

// CreateCustomerAttributes - атрибуты создания клиента
type CreateCustomerAttributes struct {
	FirstName   string   `json:"first_name" validate:"required"`
	LastName    string   `json:"last_name" validate:"required"`
	Email       string   `json:"email" validate:"required,email"`
	Phone       string   `json:"phone,omitempty"`
	DateOfBirth string   `json:"date_of_birth" validate:"required"`
	Nationality string   `json:"nationality" validate:"required"`
	Address     *Address `json:"address,omitempty"`
}

// Поддерживаемые типы webhook событий
const (
	WebhookAccountCreated       = "account.created"
	WebhookAccountUpdated       = "account.updated"
	WebhookAccountStatusChanged = "account.status_changed"
	WebhookCardCreated          = "card.created"
	WebhookCardUpdated          = "card.updated"
	WebhookCardStatusChanged    = "card.status_changed"
	WebhookTransactionCreated   = "transaction.created"
	WebhookTransactionUpdated   = "transaction.updated"
	WebhookTransactionCompleted = "transaction.completed"
	WebhookTransactionFailed    = "transaction.failed"
	WebhookCustomerCreated      = "customer.created"
	WebhookCustomerUpdated      = "customer.updated"
	WebhookCustomerKYCUpdated   = "customer.kyc_updated"
)

// Константы для RailsR API
const (
	// Типы счетов
	AccountTypeCurrent = "current"
	AccountTypeSavings = "savings"

	// Статусы счетов
	AccountStatusActive    = "active"
	AccountStatusInactive  = "inactive"
	AccountStatusSuspended = "suspended"
	AccountStatusClosed    = "closed"

	// Типы карт
	CardTypeVirtual  = "virtual"
	CardTypePhysical = "physical"

	// Статусы карт
	CardStatusActive    = "active"
	CardStatusInactive  = "inactive"
	CardStatusBlocked   = "blocked"
	CardStatusCancelled = "cancelled"

	// Направления транзакций
	DirectionInbound  = "inbound"
	DirectionOutbound = "outbound"

	// Статусы транзакций
	TransactionStatusPending   = "pending"
	TransactionStatusCompleted = "completed"
	TransactionStatusFailed    = "failed"
	TransactionStatusCancelled = "cancelled"

	// Типы транзакций
	TransactionTypeTransfer      = "transfer"
	TransactionTypePayment       = "payment"
	TransactionTypeDirectDebit   = "direct_debit"
	TransactionTypeStandingOrder = "standing_order"

	// Статусы KYC
	KYCStatusPending  = "pending"
	KYCStatusApproved = "approved"
	KYCStatusRejected = "rejected"

	// Уровни риска
	RiskLevelLow    = "low"
	RiskLevelMedium = "medium"
	RiskLevelHigh   = "high"

	// Окружения
	EnvironmentPLAY     = "PLAY"
	EnvironmentPLAYLive = "PLAYLive"
)
