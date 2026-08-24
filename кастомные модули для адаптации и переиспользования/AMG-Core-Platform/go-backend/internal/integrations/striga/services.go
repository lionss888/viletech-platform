package striga

import (
	"context"
	"encoding/json"
	"fmt"
)

// UserService - сервис для управления пользователями Striga
type UserService struct {
	client *Client
}

// NewUserService создаёт новый UserService
func NewUserService(client *Client) *UserService {
	return &UserService{client: client}
}

// CreateUser создаёт нового пользователя в Striga
func (s *UserService) CreateUser(ctx context.Context, req CreateUserRequest) (*User, error) {
	var user User
	err := s.client.SendRequest(ctx, "POST", "/users", req, &user)
	if err != nil {
		return nil, fmt.Errorf("failed to create Striga user: %w", err)
	}
	return &user, nil
}

// GetUser получает информацию о пользователе
func (s *UserService) GetUser(ctx context.Context, userID string) (*User, error) {
	var user User
	path := fmt.Sprintf("/users/%s", userID)
	err := s.client.SendRequest(ctx, "GET", path, nil, &user)
	if err != nil {
		return nil, fmt.Errorf("failed to get Striga user %s: %w", userID, err)
	}
	return &user, nil
}

// UpdateUser обновляет информацию о пользователе
func (s *UserService) UpdateUser(ctx context.Context, userID string, updates map[string]interface{}) (*User, error) {
	var user User
	path := fmt.Sprintf("/users/%s", userID)
	err := s.client.SendRequest(ctx, "PATCH", path, updates, &user)
	if err != nil {
		return nil, fmt.Errorf("failed to update Striga user %s: %w", userID, err)
	}
	return &user, nil
}

// ListUsers получает список пользователей
func (s *UserService) ListUsers(ctx context.Context, limit, offset int) ([]User, error) {
	path := "/users"
	if limit > 0 || offset > 0 {
		path += fmt.Sprintf("?limit=%d&offset=%d", limit, offset)
	}

	var response GetUsersResponse
	err := s.client.SendRequest(ctx, "GET", path, nil, &response)
	if err != nil {
		return nil, fmt.Errorf("failed to list Striga users: %w", err)
	}
	return response.Users, nil
}

// GetUserKYCStatus получает статус KYC пользователя
func (s *UserService) GetUserKYCStatus(ctx context.Context, userID string) (*KYCStatus, error) {
	var kycStatus KYCStatus
	path := fmt.Sprintf("/users/%s/kyc", userID)
	err := s.client.SendRequest(ctx, "GET", path, nil, &kycStatus)
	if err != nil {
		return nil, fmt.Errorf("failed to get Striga user %s KYC status: %w", userID, err)
	}
	return &kycStatus, nil
}

// SubmitKYCDocuments отправляет документы для KYC проверки
func (s *UserService) SubmitKYCDocuments(ctx context.Context, userID string, documents []KYCDocument) (*KYCStatus, error) {
	var kycStatus KYCStatus
	path := fmt.Sprintf("/users/%s/kyc/documents", userID)

	reqBody := map[string]interface{}{
		"documents": documents,
	}

	err := s.client.SendRequest(ctx, "POST", path, reqBody, &kycStatus)
	if err != nil {
		return nil, fmt.Errorf("failed to submit Striga user %s KYC documents: %w", userID, err)
	}
	return &kycStatus, nil
}

// WalletService - сервис для управления кошельками Striga
type WalletService struct {
	client *Client
}

// NewWalletService создаёт новый WalletService
func NewWalletService(client *Client) *WalletService {
	return &WalletService{client: client}
}

// CreateWallet создаёт новый кошелёк
func (s *WalletService) CreateWallet(ctx context.Context, req CreateWalletRequest) (*Wallet, error) {
	var wallet Wallet
	err := s.client.SendRequest(ctx, "POST", "/wallets", req, &wallet)
	if err != nil {
		return nil, fmt.Errorf("failed to create Striga wallet: %w", err)
	}
	return &wallet, nil
}

// GetWallet получает информацию о кошельке
func (s *WalletService) GetWallet(ctx context.Context, walletID string) (*Wallet, error) {
	var wallet Wallet
	path := fmt.Sprintf("/wallets/%s", walletID)
	err := s.client.SendRequest(ctx, "GET", path, nil, &wallet)
	if err != nil {
		return nil, fmt.Errorf("failed to get Striga wallet %s: %w", walletID, err)
	}
	return &wallet, nil
}

// ListUserWallets получает список кошельков пользователя
func (s *WalletService) ListUserWallets(ctx context.Context, userID string) ([]Wallet, error) {
	path := fmt.Sprintf("/users/%s/wallets", userID)

	var response GetWalletsResponse
	err := s.client.SendRequest(ctx, "GET", path, nil, &response)
	if err != nil {
		return nil, fmt.Errorf("failed to list Striga wallets for user %s: %w", userID, err)
	}
	return response.Wallets, nil
}

// GetWalletBalance получает баланс кошелька
func (s *WalletService) GetWalletBalance(ctx context.Context, walletID string) (*Wallet, error) {
	return s.GetWallet(ctx, walletID)
}

// CardService - сервис для управления картами Striga
type CardService struct {
	client *Client
}

// NewCardService создаёт новый CardService
func NewCardService(client *Client) *CardService {
	return &CardService{client: client}
}

// CreateCard создаёт новую карту
func (s *CardService) CreateCard(ctx context.Context, req CreateCardRequest) (*Card, error) {
	var card Card
	err := s.client.SendRequest(ctx, "POST", "/cards", req, &card)
	if err != nil {
		return nil, fmt.Errorf("failed to create Striga card: %w", err)
	}
	return &card, nil
}

// GetCard получает информацию о карте
func (s *CardService) GetCard(ctx context.Context, cardID string) (*Card, error) {
	var card Card
	path := fmt.Sprintf("/cards/%s", cardID)
	err := s.client.SendRequest(ctx, "GET", path, nil, &card)
	if err != nil {
		return nil, fmt.Errorf("failed to get Striga card %s: %w", cardID, err)
	}
	return &card, nil
}

// ListUserCards получает список карт пользователя
func (s *CardService) ListUserCards(ctx context.Context, userID string) ([]Card, error) {
	path := fmt.Sprintf("/users/%s/cards", userID)

	var response GetCardsResponse
	err := s.client.SendRequest(ctx, "GET", path, nil, &response)
	if err != nil {
		return nil, fmt.Errorf("failed to list Striga cards for user %s: %w", userID, err)
	}
	return response.Cards, nil
}

// UpdateCard обновляет настройки карты
func (s *CardService) UpdateCard(ctx context.Context, cardID string, updates map[string]interface{}) (*Card, error) {
	var card Card
	path := fmt.Sprintf("/cards/%s", cardID)
	err := s.client.SendRequest(ctx, "PATCH", path, updates, &card)
	if err != nil {
		return nil, fmt.Errorf("failed to update Striga card %s: %w", cardID, err)
	}
	return &card, nil
}

// BlockCard блокирует карту
func (s *CardService) BlockCard(ctx context.Context, cardID string) (*Card, error) {
	updates := map[string]interface{}{
		"status": CardStatusBlocked,
	}
	return s.UpdateCard(ctx, cardID, updates)
}

// UnblockCard разблокирует карту
func (s *CardService) UnblockCard(ctx context.Context, cardID string) (*Card, error) {
	updates := map[string]interface{}{
		"status": CardStatusActive,
	}
	return s.UpdateCard(ctx, cardID, updates)
}

// TransactionService - сервис для управления транзакциями Striga
type TransactionService struct {
	client *Client
}

// NewTransactionService создаёт новый TransactionService
func NewTransactionService(client *Client) *TransactionService {
	return &TransactionService{client: client}
}

// CreateTransaction создаёт новую транзакцию
func (s *TransactionService) CreateTransaction(ctx context.Context, req CreateTransactionRequest) (*Transaction, error) {
	var transaction Transaction
	err := s.client.SendRequest(ctx, "POST", "/transactions", req, &transaction)
	if err != nil {
		return nil, fmt.Errorf("failed to create Striga transaction: %w", err)
	}
	return &transaction, nil
}

// GetTransaction получает информацию о транзакции
func (s *TransactionService) GetTransaction(ctx context.Context, transactionID string) (*Transaction, error) {
	var transaction Transaction
	path := fmt.Sprintf("/transactions/%s", transactionID)
	err := s.client.SendRequest(ctx, "GET", path, nil, &transaction)
	if err != nil {
		return nil, fmt.Errorf("failed to get Striga transaction %s: %w", transactionID, err)
	}
	return &transaction, nil
}

// ListTransactions получает список транзакций
func (s *TransactionService) ListTransactions(ctx context.Context, userID, walletID string, limit, offset int) ([]Transaction, error) {
	path := "/transactions"
	params := []string{}

	if userID != "" {
		params = append(params, "user_id="+userID)
	}
	if walletID != "" {
		params = append(params, "wallet_id="+walletID)
	}
	if limit > 0 {
		params = append(params, fmt.Sprintf("limit=%d", limit))
	}
	if offset > 0 {
		params = append(params, fmt.Sprintf("offset=%d", offset))
	}

	if len(params) > 0 {
		path += "?" + joinParams(params)
	}

	var response GetTransactionsResponse
	err := s.client.SendRequest(ctx, "GET", path, nil, &response)
	if err != nil {
		return nil, fmt.Errorf("failed to list Striga transactions: %w", err)
	}
	return response.Transactions, nil
}

// WebhookService - сервис для обработки webhook'ов Striga
type WebhookService struct {
	client *Client
}

// NewWebhookService создаёт новый WebhookService
func NewWebhookService(client *Client) *WebhookService {
	return &WebhookService{client: client}
}

// ValidateWebhookSignature проверяет подпись webhook'а
func (s *WebhookService) ValidateWebhookSignature(payload []byte, signature string) bool {
	if auth, ok := s.client.BaseClient.GetAuth().(*StrigaAuth); ok {
		return auth.ValidateWebhookSignature(payload, signature)
	}
	return false
}

// ProcessWebhookEvent обрабатывает входящий webhook
func (s *WebhookService) ProcessWebhookEvent(ctx context.Context, payload []byte, signature string) (*WebhookEvent, error) {
	if !s.ValidateWebhookSignature(payload, signature) {
		return nil, fmt.Errorf("invalid webhook signature")
	}

	var event WebhookEvent
	if err := json.Unmarshal(payload, &event); err != nil {
		return nil, fmt.Errorf("failed to parse webhook payload: %w", err)
	}

	// Логируем получение webhook'а
	s.client.logger.Info("Received Striga webhook", map[string]interface{}{
		"type":      event.Type,
		"timestamp": event.Timestamp,
	})

	return &event, nil
}

// Вспомогательная функция для объединения параметров
func joinParams(params []string) string {
	result := ""
	for i, param := range params {
		if i > 0 {
			result += "&"
		}
		result += param
	}
	return result
}
