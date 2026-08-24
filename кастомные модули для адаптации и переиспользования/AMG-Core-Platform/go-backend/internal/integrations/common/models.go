package common

import (
	"time"

	"github.com/shopspring/decimal"
)

// Common status types
type Status string

const (
	StatusPending    Status = "pending"
	StatusCompleted  Status = "completed"
	StatusFailed     Status = "failed"
	StatusCancelled  Status = "cancelled"
	StatusProcessing Status = "processing"
)

// Payment related models
type PaymentRequest struct {
	Amount      decimal.Decimal        `json:"amount"`
	Currency    string                 `json:"currency"`
	Description string                 `json:"description"`
	Reference   string                 `json:"reference"`
	CustomerID  string                 `json:"customer_id"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

type PaymentResponse struct {
	ID          string                 `json:"id"`
	Amount      decimal.Decimal        `json:"amount"`
	Currency    string                 `json:"currency"`
	Status      Status                 `json:"status"`
	Reference   string                 `json:"reference"`
	CreatedAt   time.Time              `json:"created_at"`
	ProcessedAt *time.Time             `json:"processed_at,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

type PaymentStatus struct {
	ID        string    `json:"id"`
	Status    Status    `json:"status"`
	UpdatedAt time.Time `json:"updated_at"`
	Details   string    `json:"details,omitempty"`
	ErrorCode string    `json:"error_code,omitempty"`
}

type RefundResponse struct {
	ID        string          `json:"id"`
	PaymentID string          `json:"payment_id"`
	Amount    decimal.Decimal `json:"amount"`
	Status    Status          `json:"status"`
	CreatedAt time.Time       `json:"created_at"`
}

// Banking related models
type AccountRequest struct {
	CustomerID  string                 `json:"customer_id"`
	AccountType string                 `json:"account_type"`
	Currency    string                 `json:"currency"`
	Name        string                 `json:"name"`
	Description string                 `json:"description,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

type Account struct {
	ID            string                 `json:"id"`
	AccountNumber string                 `json:"account_number"`
	CustomerID    string                 `json:"customer_id"`
	Type          string                 `json:"type"`
	Currency      string                 `json:"currency"`
	Name          string                 `json:"name"`
	Status        Status                 `json:"status"`
	Balance       decimal.Decimal        `json:"balance"`
	CreatedAt     time.Time              `json:"created_at"`
	UpdatedAt     time.Time              `json:"updated_at"`
	Metadata      map[string]interface{} `json:"metadata,omitempty"`
}

type Balance struct {
	AccountID   string          `json:"account_id"`
	Available   decimal.Decimal `json:"available"`
	Reserved    decimal.Decimal `json:"reserved"`
	Total       decimal.Decimal `json:"total"`
	Currency    string          `json:"currency"`
	LastUpdated time.Time       `json:"last_updated"`
}

type TransferRequest struct {
	FromAccountID string                 `json:"from_account_id"`
	ToAccountID   string                 `json:"to_account_id"`
	Amount        decimal.Decimal        `json:"amount"`
	Currency      string                 `json:"currency"`
	Description   string                 `json:"description"`
	Reference     string                 `json:"reference"`
	Metadata      map[string]interface{} `json:"metadata,omitempty"`
}

type Transfer struct {
	ID            string                 `json:"id"`
	FromAccountID string                 `json:"from_account_id"`
	ToAccountID   string                 `json:"to_account_id"`
	Amount        decimal.Decimal        `json:"amount"`
	Currency      string                 `json:"currency"`
	Description   string                 `json:"description"`
	Reference     string                 `json:"reference"`
	Status        Status                 `json:"status"`
	CreatedAt     time.Time              `json:"created_at"`
	ProcessedAt   *time.Time             `json:"processed_at,omitempty"`
	Metadata      map[string]interface{} `json:"metadata,omitempty"`
}

// Crypto related models
type Ticker struct {
	Pair      string          `json:"pair"`
	Price     decimal.Decimal `json:"price"`
	High24h   decimal.Decimal `json:"high_24h"`
	Low24h    decimal.Decimal `json:"low_24h"`
	Volume24h decimal.Decimal `json:"volume_24h"`
	Change24h decimal.Decimal `json:"change_24h"`
	Timestamp time.Time       `json:"timestamp"`
}

type OrderBook struct {
	Pair      string      `json:"pair"`
	Bids      []OrderItem `json:"bids"`
	Asks      []OrderItem `json:"asks"`
	Timestamp time.Time   `json:"timestamp"`
}

type OrderItem struct {
	Price  decimal.Decimal `json:"price"`
	Amount decimal.Decimal `json:"amount"`
}

type OrderRequest struct {
	Pair        string           `json:"pair"`
	Type        string           `json:"type"` // market, limit
	Side        string           `json:"side"` // buy, sell
	Amount      decimal.Decimal  `json:"amount"`
	Price       *decimal.Decimal `json:"price,omitempty"`
	TimeInForce string           `json:"time_in_force,omitempty"` // GTC, IOC, FOK
}

type Order struct {
	ID           string           `json:"id"`
	Pair         string           `json:"pair"`
	Type         string           `json:"type"`
	Side         string           `json:"side"`
	Amount       decimal.Decimal  `json:"amount"`
	Price        *decimal.Decimal `json:"price,omitempty"`
	FilledAmount decimal.Decimal  `json:"filled_amount"`
	Status       Status           `json:"status"`
	CreatedAt    time.Time        `json:"created_at"`
	UpdatedAt    time.Time        `json:"updated_at"`
}

type CryptoBalance struct {
	Balances  map[string]CurrencyBalance `json:"balances"`
	Timestamp time.Time                  `json:"timestamp"`
}

type CurrencyBalance struct {
	Currency  string          `json:"currency"`
	Available decimal.Decimal `json:"available"`
	Reserved  decimal.Decimal `json:"reserved"`
	Total     decimal.Decimal `json:"total"`
}

// Card related models
type CardRequest struct {
	CustomerID string                 `json:"customer_id"`
	AccountID  string                 `json:"account_id"`
	CardType   string                 `json:"card_type"` // virtual, physical
	Currency   string                 `json:"currency"`
	Limits     *CardLimits            `json:"limits,omitempty"`
	Metadata   map[string]interface{} `json:"metadata,omitempty"`
}

type Card struct {
	ID          string                 `json:"id"`
	CustomerID  string                 `json:"customer_id"`
	AccountID   string                 `json:"account_id"`
	CardNumber  string                 `json:"card_number"`
	ExpiryMonth int                    `json:"expiry_month"`
	ExpiryYear  int                    `json:"expiry_year"`
	CVV         string                 `json:"cvv,omitempty"`
	CardType    string                 `json:"card_type"`
	Currency    string                 `json:"currency"`
	Status      Status                 `json:"status"`
	Limits      *CardLimits            `json:"limits,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

type CardLimits struct {
	DailySpend       decimal.Decimal `json:"daily_spend"`
	MonthlySpend     decimal.Decimal `json:"monthly_spend"`
	ATMDaily         decimal.Decimal `json:"atm_daily"`
	ATMMonthly       decimal.Decimal `json:"atm_monthly"`
	OnlineSpend      decimal.Decimal `json:"online_spend"`
	ContactlessLimit decimal.Decimal `json:"contactless_limit"`
}

// History and transaction models
type HistoryOptions struct {
	From   *time.Time `json:"from,omitempty"`
	To     *time.Time `json:"to,omitempty"`
	Limit  int        `json:"limit,omitempty"`
	Offset int        `json:"offset,omitempty"`
	Status *Status    `json:"status,omitempty"`
}

type TransactionHistory struct {
	AccountID    string        `json:"account_id"`
	Transactions []Transaction `json:"transactions"`
	Total        int           `json:"total"`
	HasMore      bool          `json:"has_more"`
}

type Transaction struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"`
	Amount      decimal.Decimal        `json:"amount"`
	Currency    string                 `json:"currency"`
	Description string                 `json:"description"`
	Reference   string                 `json:"reference"`
	Status      Status                 `json:"status"`
	CreatedAt   time.Time              `json:"created_at"`
	ProcessedAt *time.Time             `json:"processed_at,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

type CardTransactionHistory struct {
	CardID       string            `json:"card_id"`
	Transactions []CardTransaction `json:"transactions"`
	Total        int               `json:"total"`
	HasMore      bool              `json:"has_more"`
}

type CardTransaction struct {
	ID          string          `json:"id"`
	CardID      string          `json:"card_id"`
	Amount      decimal.Decimal `json:"amount"`
	Currency    string          `json:"currency"`
	Merchant    string          `json:"merchant"`
	Category    string          `json:"category"`
	Status      Status          `json:"status"`
	CreatedAt   time.Time       `json:"created_at"`
	ProcessedAt *time.Time      `json:"processed_at,omitempty"`
}

// KYC related models
type KYCRequest struct {
	CustomerID  string                 `json:"customer_id"`
	FirstName   string                 `json:"first_name"`
	LastName    string                 `json:"last_name"`
	DateOfBirth string                 `json:"date_of_birth"`
	Country     string                 `json:"country"`
	Email       string                 `json:"email"`
	Phone       string                 `json:"phone"`
	Address     *Address               `json:"address,omitempty"`
	Documents   []DocumentRequest      `json:"documents,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

type Address struct {
	Street     string `json:"street"`
	City       string `json:"city"`
	State      string `json:"state"`
	PostalCode string `json:"postal_code"`
	Country    string `json:"country"`
}

type DocumentRequest struct {
	Type        string `json:"type"` // passport, id_card, driver_license, utility_bill
	FileURL     string `json:"file_url"`
	FileName    string `json:"file_name"`
	ContentType string `json:"content_type"`
}

type KYCResponse struct {
	ID         string    `json:"id"`
	CustomerID string    `json:"customer_id"`
	Status     Status    `json:"status"`
	Level      string    `json:"level"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type KYCStatus struct {
	ID                string    `json:"id"`
	Status            Status    `json:"status"`
	Level             string    `json:"level"`
	RejectionReasons  []string  `json:"rejection_reasons,omitempty"`
	RequiredDocuments []string  `json:"required_documents,omitempty"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type KYCRequirements struct {
	Country           string   `json:"country"`
	RequiredDocuments []string `json:"required_documents"`
	MinAge            int      `json:"min_age"`
	SupportedLevels   []string `json:"supported_levels"`
}

// Webhook related models
type WebhookEvent struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	Source    string                 `json:"source"`
	Data      map[string]interface{} `json:"data"`
	Timestamp time.Time              `json:"timestamp"`
	Signature string                 `json:"signature,omitempty"`
}

// Error models
type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

func (e APIError) Error() string {
	if e.Details != "" {
		return e.Code + ": " + e.Message + " (" + e.Details + ")"
	}
	return e.Code + ": " + e.Message
}
