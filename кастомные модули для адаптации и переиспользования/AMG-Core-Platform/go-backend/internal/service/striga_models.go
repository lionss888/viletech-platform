package service

import (
	"time"
)

// User представляет пользователя в системе Striga
type User struct {
	ID          string    `json:"id"`
	Email       string    `json:"email"`
	PhoneNumber string    `json:"phoneNumber"`
	FirstName   string    `json:"firstName"`
	LastName    string    `json:"lastName"`
	DateOfBirth string    `json:"dateOfBirth"`
	Country     string    `json:"country"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// CreateUserRequest представляет запрос на создание пользователя
type CreateUserRequest struct {
	Email       string `json:"email"`
	PhoneNumber string `json:"phoneNumber"`
	FirstName   string `json:"firstName"`
	LastName    string `json:"lastName"`
	DateOfBirth string `json:"dateOfBirth"`
	Country     string `json:"country"`
}

// UpdateUserRequest представляет запрос на обновление пользователя
type UpdateUserRequest struct {
	FirstName   *string `json:"firstName,omitempty"`
	LastName    *string `json:"lastName,omitempty"`
	DateOfBirth *string `json:"dateOfBirth,omitempty"`
	Country     *string `json:"country,omitempty"`
}

// Wallet представляет кошелек в системе Striga
type Wallet struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Currency  string    `json:"currency"`
	Balance   string    `json:"balance"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// CreateWalletRequest представляет запрос на создание кошелька
type CreateWalletRequest struct {
	UserID   string `json:"userId"`
	Currency string `json:"currency"`
}

// Card представляет карту в системе Striga
type Card struct {
	ID           string    `json:"id"`
	UserID       string    `json:"userId"`
	WalletID     string    `json:"walletId"`
	CardNumber   string    `json:"cardNumber"`
	ExpiryMonth  string    `json:"expiryMonth"`
	ExpiryYear   string    `json:"expiryYear"`
	CVV          string    `json:"cvv"`
	Status       string    `json:"status"`
	Type         string    `json:"type"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// CreateCardRequest представляет запрос на создание карты
type CreateCardRequest struct {
	UserID   string `json:"userId"`
	WalletID string `json:"walletId"`
	Type     string `json:"type"`
}

// Transaction представляет транзакцию в системе Striga
type Transaction struct {
	ID            string    `json:"id"`
	UserID        string    `json:"userId"`
	WalletID      string    `json:"walletId"`
	CardID        string    `json:"cardId,omitempty"`
	Amount        string    `json:"amount"`
	Currency      string    `json:"currency"`
	Type          string    `json:"type"`
	Status        string    `json:"status"`
	Description   string    `json:"description"`
	MerchantName  string    `json:"merchantName,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// CreateTransactionRequest представляет запрос на создание транзакции
type CreateTransactionRequest struct {
	UserID       string `json:"userId"`
	WalletID     string `json:"walletId"`
	CardID       string `json:"cardId,omitempty"`
	Amount       string `json:"amount"`
	Currency     string `json:"currency"`
	Type         string `json:"type"`
	Description  string `json:"description"`
	MerchantName string `json:"merchantName,omitempty"`
}

// WebhookEvent представляет webhook событие от Striga
type WebhookEvent struct {
	ID        string      `json:"id"`
	Type      string      `json:"type"`
	Data      interface{} `json:"data"`
	CreatedAt time.Time   `json:"createdAt"`
}

// KYCStatus представляет статус KYC верификации
type KYCStatus string

const (
	KYCStatusApproved      KYCStatus = "APPROVED"
	KYCStatusOnHold        KYCStatus = "ON_HOLD"
	KYCStatusRejected      KYCStatus = "REJECTED"
	KYCStatusRejectedFinal KYCStatus = "REJECTED_FINAL"
	KYCStatusPending       KYCStatus = "PENDING"
	KYCStatusNotStarted    KYCStatus = "NOT_STARTED"
)

// KYCWebhook представляет webhook для KYC событий
type KYCWebhook struct {
	UserID    string    `json:"user_id"`
	Status    KYCStatus `json:"status"`
	Reason    string    `json:"reason,omitempty"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CardWebhook представляет webhook для карточных событий
type CardWebhook struct {
	CardID    string    `json:"card_id"`
	UserID    string    `json:"user_id"`
	Status    string    `json:"status"`
	EventType string    `json:"event_type"` // ACTIVATED, BLOCKED, UNBLOCKED, DELETED
	UpdatedAt time.Time `json:"updated_at"`
}

// TransactionWebhook представляет webhook для транзакционных событий
type TransactionWebhook struct {
	TransactionID string    `json:"transaction_id"`
	UserID        string    `json:"user_id"`
	Status        string    `json:"status"`
	EventType     string    `json:"event_type"` // CREATED, APPROVED, REJECTED, COMPLETED
	Amount        string    `json:"amount"`
	Currency      string    `json:"currency"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// UserListResponse представляет ответ со списком пользователей
type UserListResponse struct {
	Users []User `json:"users"`
	Total int    `json:"total"`
	Page  int    `json:"page"`
	Limit int    `json:"limit"`
}

// WalletListResponse представляет ответ со списком кошельков
type WalletListResponse struct {
	Wallets []Wallet `json:"wallets"`
	Total   int      `json:"total"`
	Page    int      `json:"page"`
	Limit   int      `json:"limit"`
}

// CardListResponse представляет ответ со списком карт
type CardListResponse struct {
	Cards []Card `json:"cards"`
	Total int    `json:"total"`
	Page  int    `json:"page"`
	Limit int    `json:"limit"`
}

// TransactionListResponse представляет ответ со списком транзакций
type TransactionListResponse struct {
	Transactions []Transaction `json:"transactions"`
	Total        int           `json:"total"`
	Page         int           `json:"page"`
	Limit        int           `json:"limit"`
}
