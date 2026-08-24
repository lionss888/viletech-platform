package common

import (
	"context"
	"time"

	"github.com/shopspring/decimal"
)

// Integration - базовый интерфейс для всех интеграций
type Integration interface {
	Name() string
	Version() string
	HealthCheck(ctx context.Context) error
	GetConfig() IntegrationConfig
}

// IntegrationConfig - базовая конфигурация интеграции
type IntegrationConfig struct {
	Enabled    bool          `json:"enabled"`
	APIURL     string        `json:"api_url"`
	APIKey     string        `json:"api_key"`
	APISecret  string        `json:"api_secret,omitempty"`
	Sandbox    bool          `json:"sandbox"`
	Timeout    time.Duration `json:"timeout"`
	RateLimit  int           `json:"rate_limit"`
	RetryCount int           `json:"retry_count"`
}

// PaymentProvider - интерфейс для платежных провайдеров
type PaymentProvider interface {
	Integration
	ProcessPayment(ctx context.Context, req PaymentRequest) (*PaymentResponse, error)
	GetPaymentStatus(ctx context.Context, paymentID string) (*PaymentStatus, error)
	RefundPayment(ctx context.Context, paymentID string, amount decimal.Decimal) (*RefundResponse, error)
	CancelPayment(ctx context.Context, paymentID string) error
}

// BankingProvider - интерфейс для банковских провайдеров
type BankingProvider interface {
	Integration
	CreateAccount(ctx context.Context, req AccountRequest) (*Account, error)
	GetAccount(ctx context.Context, accountID string) (*Account, error)
	GetBalance(ctx context.Context, accountID string) (*Balance, error)
	Transfer(ctx context.Context, req TransferRequest) (*Transfer, error)
	GetTransactionHistory(ctx context.Context, accountID string, opts HistoryOptions) (*TransactionHistory, error)
}

// CryptoProvider - интерфейс для криптовалютных провайдеров
type CryptoProvider interface {
	Integration
	GetTicker(ctx context.Context, pair string) (*Ticker, error)
	GetOrderBook(ctx context.Context, pair string) (*OrderBook, error)
	PlaceOrder(ctx context.Context, req OrderRequest) (*Order, error)
	CancelOrder(ctx context.Context, orderID string) error
	GetBalance(ctx context.Context) (*CryptoBalance, error)
}

// CardProvider - интерфейс для провайдеров карт
type CardProvider interface {
	Integration
	IssueCard(ctx context.Context, req CardRequest) (*Card, error)
	GetCard(ctx context.Context, cardID string) (*Card, error)
	ActivateCard(ctx context.Context, cardID string) error
	BlockCard(ctx context.Context, cardID string, reason string) error
	UnblockCard(ctx context.Context, cardID string) error
	GetCardTransactions(ctx context.Context, cardID string, opts HistoryOptions) (*CardTransactionHistory, error)
}

// WebhookProvider - интерфейс для обработки webhook'ов
type WebhookProvider interface {
	ValidateSignature(payload []byte, signature string) bool
	ProcessWebhook(ctx context.Context, event WebhookEvent) error
	GetSupportedEvents() []string
}

// KYCProvider - интерфейс для KYC провайдеров
type KYCProvider interface {
	Integration
	CreateKYC(ctx context.Context, req KYCRequest) (*KYCResponse, error)
	GetKYCStatus(ctx context.Context, kycID string) (*KYCStatus, error)
	SubmitDocument(ctx context.Context, kycID string, doc DocumentRequest) error
	GetKYCRequirements(ctx context.Context, country string) (*KYCRequirements, error)
}
