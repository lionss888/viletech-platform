package bitso

import (
	"fmt"
	"time"

	"github.com/shopspring/decimal"
)

// BitsoResponse - стандартный формат ответа Bitso API
type BitsoResponse struct {
	Success bool        `json:"success"`
	Payload interface{} `json:"payload"`
	Error   *BitsoError `json:"error,omitempty"`
}

// BitsoError - формат ошибки Bitso API
type BitsoError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e BitsoError) Error() string {
	return fmt.Sprintf("Bitso API error %s: %s", e.Code, e.Message)
}

// AvailableBook - доступная торговая пара
type AvailableBook struct {
	Book          string          `json:"book"`
	MinimumPrice  decimal.Decimal `json:"minimum_price"`
	MaximumPrice  decimal.Decimal `json:"maximum_price"`
	MinimumAmount decimal.Decimal `json:"minimum_amount"`
	MaximumAmount decimal.Decimal `json:"maximum_amount"`
	MinimumValue  decimal.Decimal `json:"minimum_value"`
	MaximumValue  decimal.Decimal `json:"maximum_value"`
	TickSize      decimal.Decimal `json:"tick_size"`
	DefaultChart  string          `json:"default_chart"`
	FeeDecimal    decimal.Decimal `json:"fee_decimal"`
	FeePercent    decimal.Decimal `json:"fee_percent"`
}

// Ticker - информация о цене торговой пары
type Ticker struct {
	Book      string          `json:"book"`
	Volume    decimal.Decimal `json:"volume"`
	High      decimal.Decimal `json:"high"`
	Last      decimal.Decimal `json:"last"`
	Low       decimal.Decimal `json:"low"`
	Vwap      decimal.Decimal `json:"vwap"`
	Ask       decimal.Decimal `json:"ask"`
	Bid       decimal.Decimal `json:"bid"`
	Change24  decimal.Decimal `json:"change_24"`
	CreatedAt time.Time       `json:"created_at"`
}

// OrderBook - книга ордеров
type OrderBook struct {
	Asks      []PriceLevel `json:"asks"`
	Bids      []PriceLevel `json:"bids"`
	UpdatedAt time.Time    `json:"updated_at"`
	Sequence  int64        `json:"sequence"`
}

// PriceLevel - уровень цены в книге ордеров
type PriceLevel struct {
	Book   string          `json:"book"`
	Price  decimal.Decimal `json:"price"`
	Amount decimal.Decimal `json:"amount"`
}

// Trade - публичная сделка
type Trade struct {
	Book      string          `json:"book"`
	CreatedAt time.Time       `json:"created_at"`
	Amount    decimal.Decimal `json:"amount"`
	MakerSide string          `json:"maker_side"` // buy, sell
	Price     decimal.Decimal `json:"price"`
	Tid       int64           `json:"tid"`
}

// Balance - баланс пользователя
type Balance struct {
	Currency  string          `json:"currency"`
	Available decimal.Decimal `json:"available"`
	Locked    decimal.Decimal `json:"locked"`
	Total     decimal.Decimal `json:"total"`
}

// AccountStatus - статус аккаунта
type AccountStatus struct {
	Status                string `json:"status"` // active, suspended
	DailyLimit            string `json:"daily_limit"`
	MonthlyLimit          string `json:"monthly_limit"`
	DailyRemaining        string `json:"daily_remaining"`
	MonthlyRemaining      string `json:"monthly_remaining"`
	CellphoneNumber       string `json:"cellphone_number"`
	CellphoneNumberStored string `json:"cellphone_number_stored"`
	EmailStored           string `json:"email_stored"`
	OfficialId            string `json:"official_id"`
	ProofOfResidency      string `json:"proof_of_residency"`
	SignedContract        string `json:"signed_contract"`
	OriginOfFunds         string `json:"origin_of_funds"`
}

// Order - ордер пользователя
type Order struct {
	Oid            string          `json:"oid"`
	Book           string          `json:"book"`
	OriginalAmount decimal.Decimal `json:"original_amount"`
	UnfilledAmount decimal.Decimal `json:"unfilled_amount"`
	OriginalValue  decimal.Decimal `json:"original_value"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
	Price          decimal.Decimal `json:"price"`
	Side           string          `json:"side"`                    // buy, sell
	Status         string          `json:"status"`                  // open, partial-fill, completed, cancelled
	Type           string          `json:"type"`                    // market, limit
	TimeInForce    string          `json:"time_in_force,omitempty"` // goodtillcancelled, fillorkill, immediateorcancel
	ClientOrderId  string          `json:"client_order_id,omitempty"`
}

// PlaceOrderRequest - запрос на размещение ордера
type PlaceOrderRequest struct {
	Book          string           `json:"book" validate:"required"`
	Side          string           `json:"side" validate:"required"` // buy, sell
	Type          string           `json:"type" validate:"required"` // market, limit
	Amount        *decimal.Decimal `json:"amount,omitempty"`
	Price         *decimal.Decimal `json:"price,omitempty"`
	Minor         *decimal.Decimal `json:"minor,omitempty"` // для market orders
	TimeInForce   string           `json:"time_in_force,omitempty"`
	ClientOrderId string           `json:"client_order_id,omitempty"`
}

// UserTrade - сделка пользователя
type UserTrade struct {
	Book         string          `json:"book"`
	Major        decimal.Decimal `json:"major"`
	CreatedAt    time.Time       `json:"created_at"`
	Minor        decimal.Decimal `json:"minor"`
	FeesAmount   decimal.Decimal `json:"fees_amount"`
	FeesCurrency string          `json:"fees_currency"`
	Price        decimal.Decimal `json:"price"`
	Tid          int64           `json:"tid"`
	Oid          string          `json:"oid"`
	Side         string          `json:"side"` // buy, sell
}

// FundingDestination - адрес для пополнения
type FundingDestination struct {
	AccountIdentifierName string `json:"account_identifier_name"`
	AccountIdentifier     string `json:"account_identifier"`
}

// Withdrawal - запрос на вывод
type Withdrawal struct {
	Wid       string          `json:"wid"`
	Status    string          `json:"status"` // pending, complete, cancelled
	CreatedAt time.Time       `json:"created_at"`
	Currency  string          `json:"currency"`
	Method    string          `json:"method"`
	Amount    decimal.Decimal `json:"amount"`
	Details   interface{}     `json:"details"` // зависит от метода вывода
}

// WithdrawalRequest - запрос на создание вывода
type WithdrawalRequest struct {
	Currency string          `json:"currency" validate:"required"`
	Method   string          `json:"method" validate:"required"`
	Amount   decimal.Decimal `json:"amount" validate:"required"`
	Details  interface{}     `json:"details" validate:"required"`
}

// CryptoWithdrawalDetails - детали вывода криптовалюты
type CryptoWithdrawalDetails struct {
	Address        string `json:"address" validate:"required"`
	DestinationTag string `json:"destination_tag,omitempty"`
}

// BankWithdrawalDetails - детали банковского вывода
type BankWithdrawalDetails struct {
	RecipientGivenNames  string `json:"recipient_given_names" validate:"required"`
	RecipientFamilyNames string `json:"recipient_family_names" validate:"required"`
	Clabe                string `json:"clabe" validate:"required"`
	NotesRef             string `json:"notes_ref,omitempty"`
	NumericRef           string `json:"numeric_ref,omitempty"`
}

// FeeSchedule - расписание комиссий
type FeeSchedule struct {
	Book            string          `json:"book"`
	TakerFeeDecimal decimal.Decimal `json:"taker_fee_decimal"`
	TakerFeePercent decimal.Decimal `json:"taker_fee_percent"`
	MakerFeeDecimal decimal.Decimal `json:"maker_fee_decimal"`
	MakerFeePercent decimal.Decimal `json:"maker_fee_percent"`
}

// Response wrappers для API ответов
type AvailableBooksResponse struct {
	Success bool            `json:"success"`
	Payload []AvailableBook `json:"payload"`
	Error   *BitsoError     `json:"error,omitempty"`
}

type TickerResponse struct {
	Success bool        `json:"success"`
	Payload *Ticker     `json:"payload"`
	Error   *BitsoError `json:"error,omitempty"`
}

type OrderBookResponse struct {
	Success bool        `json:"success"`
	Payload *OrderBook  `json:"payload"`
	Error   *BitsoError `json:"error,omitempty"`
}

type TradesResponse struct {
	Success bool        `json:"success"`
	Payload []Trade     `json:"payload"`
	Error   *BitsoError `json:"error,omitempty"`
}

type BalancesResponse struct {
	Success bool        `json:"success"`
	Payload []Balance   `json:"payload"`
	Error   *BitsoError `json:"error,omitempty"`
}

type AccountStatusResponse struct {
	Success bool           `json:"success"`
	Payload *AccountStatus `json:"payload"`
	Error   *BitsoError    `json:"error,omitempty"`
}

type OrdersResponse struct {
	Success bool        `json:"success"`
	Payload []Order     `json:"payload"`
	Error   *BitsoError `json:"error,omitempty"`
}

type PlaceOrderResponse struct {
	Success bool        `json:"success"`
	Payload *Order      `json:"payload"`
	Error   *BitsoError `json:"error,omitempty"`
}

type UserTradesResponse struct {
	Success bool        `json:"success"`
	Payload []UserTrade `json:"payload"`
	Error   *BitsoError `json:"error,omitempty"`
}

type FundingDestinationResponse struct {
	Success bool                `json:"success"`
	Payload *FundingDestination `json:"payload"`
	Error   *BitsoError         `json:"error,omitempty"`
}

type WithdrawalsResponse struct {
	Success bool         `json:"success"`
	Payload []Withdrawal `json:"payload"`
	Error   *BitsoError  `json:"error,omitempty"`
}

type WithdrawalResponse struct {
	Success bool        `json:"success"`
	Payload *Withdrawal `json:"payload"`
	Error   *BitsoError `json:"error,omitempty"`
}

type FeeScheduleResponse struct {
	Success bool          `json:"success"`
	Payload []FeeSchedule `json:"payload"`
	Error   *BitsoError   `json:"error,omitempty"`
}

// Константы для Bitso API
const (
	// Стороны ордера
	SideBuy  = "buy"
	SideSell = "sell"

	// Типы ордеров
	TypeMarket = "market"
	TypeLimit  = "limit"

	// Time in Force
	TimeInForceGTC = "goodtillcancelled"
	TimeInForceFOK = "fillorkill"
	TimeInForceIOC = "immediateorcancel"

	// Статусы ордеров
	StatusOpen        = "open"
	StatusPartialFill = "partial-fill"
	StatusCompleted   = "completed"
	StatusCancelled   = "cancelled"

	// Статусы аккаунта
	AccountStatusActive    = "active"
	AccountStatusSuspended = "suspended"

	// Статусы вывода
	WithdrawalStatusPending   = "pending"
	WithdrawalStatusComplete  = "complete"
	WithdrawalStatusCancelled = "cancelled"

	// Методы вывода
	WithdrawalMethodCrypto = "crypto"
	WithdrawalMethodBank   = "sp"
)
