package railsr

import (
	"context"
	"fmt"
)

// AccountService - сервис для управления счетами RailsR
type AccountService struct {
	client *Client
}

// NewAccountService создаёт новый AccountService
func NewAccountService(client *Client) *AccountService {
	return &AccountService{client: client}
}

// CreateAccount создаёт новый банковский счёт
func (s *AccountService) CreateAccount(ctx context.Context, req CreateAccountRequest) (*Account, error) {
	var resp RailsRResponse
	err := s.client.SendRequest(ctx, "POST", "/accounts", req, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to create RailsR account: %w", err)
	}

	if len(resp.Errors) > 0 {
		return nil, resp.Errors[0]
	}

	// Парсим данные из JSON:API формата
	if resourceObj, ok := resp.Data.(map[string]interface{}); ok {
		account := &Account{}
		if attributes, ok := resourceObj["attributes"].(map[string]interface{}); ok {
			// Здесь нужна более детальная реализация парсинга JSON:API
			// Для простоты возвращаем базовую структуру
			account.ID = resourceObj["id"].(string)
			account.Type = resourceObj["type"].(string)
			// ... парсинг остальных полей
		}
		return account, nil
	}

	return nil, fmt.Errorf("unexpected response format from RailsR")
}

// GetAccount получает информацию о счёте
func (s *AccountService) GetAccount(ctx context.Context, accountID string) (*Account, error) {
	path := fmt.Sprintf("/accounts/%s", accountID)

	var resp RailsRResponse
	err := s.client.SendRequest(ctx, "GET", path, nil, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to get RailsR account %s: %w", accountID, err)
	}

	if len(resp.Errors) > 0 {
		return nil, resp.Errors[0]
	}

	// Парсим данные из JSON:API формата
	account := &Account{}
	// Здесь нужна детальная реализация парсинга JSON:API
	return account, nil
}

// ListAccounts получает список всех счетов
func (s *AccountService) ListAccounts(ctx context.Context) ([]Account, error) {
	var resp RailsRResponse
	err := s.client.SendRequest(ctx, "GET", "/accounts", nil, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to list RailsR accounts: %w", err)
	}

	if len(resp.Errors) > 0 {
		return nil, resp.Errors[0]
	}

	// Парсим данные из JSON:API формата
	var accounts []Account
	// Здесь нужна детальная реализация парсинга JSON:API массива
	return accounts, nil
}

// UpdateAccount обновляет информацию о счёте
func (s *AccountService) UpdateAccount(ctx context.Context, accountID string, updates map[string]interface{}) (*Account, error) {
	path := fmt.Sprintf("/accounts/%s", accountID)

	// Формируем JSON:API запрос
	reqData := map[string]interface{}{
		"data": map[string]interface{}{
			"type":       "accounts",
			"id":         accountID,
			"attributes": updates,
		},
	}

	var resp RailsRResponse
	err := s.client.SendRequest(ctx, "PATCH", path, reqData, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to update RailsR account %s: %w", accountID, err)
	}

	if len(resp.Errors) > 0 {
		return nil, resp.Errors[0]
	}

	account := &Account{}
	// Парсинг ответа
	return account, nil
}

// CardService - сервис для управления картами RailsR
type CardService struct {
	client *Client
}

// NewCardService создаёт новый CardService
func NewCardService(client *Client) *CardService {
	return &CardService{client: client}
}

// CreateCard создаёт новую банковскую карту
func (s *CardService) CreateCard(ctx context.Context, req CreateCardRequest) (*Card, error) {
	var resp RailsRResponse
	err := s.client.SendRequest(ctx, "POST", "/cards", req, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to create RailsR card: %w", err)
	}

	if len(resp.Errors) > 0 {
		return nil, resp.Errors[0]
	}

	card := &Card{}
	// Парсинг JSON:API ответа
	return card, nil
}

// GetCard получает информацию о карте
func (s *CardService) GetCard(ctx context.Context, cardID string) (*Card, error) {
	path := fmt.Sprintf("/cards/%s", cardID)

	var resp RailsRResponse
	err := s.client.SendRequest(ctx, "GET", path, nil, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to get RailsR card %s: %w", cardID, err)
	}

	if len(resp.Errors) > 0 {
		return nil, resp.Errors[0]
	}

	card := &Card{}
	// Парсинг JSON:API ответа
	return card, nil
}

// ListCards получает список карт для счёта
func (s *CardService) ListCards(ctx context.Context, accountID string) ([]Card, error) {
	path := "/cards"
	if accountID != "" {
		path += "?filter[account_id]=" + accountID
	}

	var resp RailsRResponse
	err := s.client.SendRequest(ctx, "GET", path, nil, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to list RailsR cards: %w", err)
	}

	if len(resp.Errors) > 0 {
		return nil, resp.Errors[0]
	}

	var cards []Card
	// Парсинг JSON:API массива
	return cards, nil
}

// UpdateCard обновляет настройки карты
func (s *CardService) UpdateCard(ctx context.Context, cardID string, updates map[string]interface{}) (*Card, error) {
	path := fmt.Sprintf("/cards/%s", cardID)

	reqData := map[string]interface{}{
		"data": map[string]interface{}{
			"type":       "cards",
			"id":         cardID,
			"attributes": updates,
		},
	}

	var resp RailsRResponse
	err := s.client.SendRequest(ctx, "PATCH", path, reqData, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to update RailsR card %s: %w", cardID, err)
	}

	if len(resp.Errors) > 0 {
		return nil, resp.Errors[0]
	}

	card := &Card{}
	// Парсинг ответа
	return card, nil
}

// BlockCard блокирует карту
func (s *CardService) BlockCard(ctx context.Context, cardID string) error {
	updates := map[string]interface{}{
		"status": CardStatusBlocked,
	}

	_, err := s.UpdateCard(ctx, cardID, updates)
	return err
}

// UnblockCard разблокирует карту
func (s *CardService) UnblockCard(ctx context.Context, cardID string) error {
	updates := map[string]interface{}{
		"status": CardStatusActive,
	}

	_, err := s.UpdateCard(ctx, cardID, updates)
	return err
}

// TransactionService - сервис для управления транзакциями RailsR
type TransactionService struct {
	client *Client
}

// NewTransactionService создаёт новый TransactionService
func NewTransactionService(client *Client) *TransactionService {
	return &TransactionService{client: client}
}

// CreateTransaction создаёт новую транзакцию
func (s *TransactionService) CreateTransaction(ctx context.Context, req CreateTransactionRequest) (*Transaction, error) {
	var resp RailsRResponse
	err := s.client.SendRequest(ctx, "POST", "/transactions", req, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to create RailsR transaction: %w", err)
	}

	if len(resp.Errors) > 0 {
		return nil, resp.Errors[0]
	}

	transaction := &Transaction{}
	// Парсинг JSON:API ответа
	return transaction, nil
}

// GetTransaction получает информацию о транзакции
func (s *TransactionService) GetTransaction(ctx context.Context, transactionID string) (*Transaction, error) {
	path := fmt.Sprintf("/transactions/%s", transactionID)

	var resp RailsRResponse
	err := s.client.SendRequest(ctx, "GET", path, nil, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to get RailsR transaction %s: %w", transactionID, err)
	}

	if len(resp.Errors) > 0 {
		return nil, resp.Errors[0]
	}

	transaction := &Transaction{}
	// Парсинг JSON:API ответа
	return transaction, nil
}

// ListTransactions получает список транзакций для счёта
func (s *TransactionService) ListTransactions(ctx context.Context, accountID string, limit int, offset int) ([]Transaction, error) {
	path := "/transactions"
	params := []string{}

	if accountID != "" {
		params = append(params, "filter[account_id]="+accountID)
	}
	if limit > 0 {
		params = append(params, fmt.Sprintf("page[size]=%d", limit))
	}
	if offset > 0 {
		params = append(params, fmt.Sprintf("page[number]=%d", offset/limit+1))
	}

	if len(params) > 0 {
		path += "?" + joinParams(params)
	}

	var resp RailsRResponse
	err := s.client.SendRequest(ctx, "GET", path, nil, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to list RailsR transactions: %w", err)
	}

	if len(resp.Errors) > 0 {
		return nil, resp.Errors[0]
	}

	var transactions []Transaction
	// Парсинг JSON:API массива
	return transactions, nil
}

// CancelTransaction отменяет транзакцию (если возможно)
func (s *TransactionService) CancelTransaction(ctx context.Context, transactionID string) error {
	path := fmt.Sprintf("/transactions/%s/cancel", transactionID)

	var resp RailsRResponse
	err := s.client.SendRequest(ctx, "POST", path, nil, &resp)
	if err != nil {
		return fmt.Errorf("failed to cancel RailsR transaction %s: %w", transactionID, err)
	}

	if len(resp.Errors) > 0 {
		return resp.Errors[0]
	}

	return nil
}

// CustomerService - сервис для управления клиентами RailsR
type CustomerService struct {
	client *Client
}

// NewCustomerService создаёт новый CustomerService
func NewCustomerService(client *Client) *CustomerService {
	return &CustomerService{client: client}
}

// CreateCustomer создаёт нового клиента
func (s *CustomerService) CreateCustomer(ctx context.Context, req CreateCustomerRequest) (*Customer, error) {
	var resp RailsRResponse
	err := s.client.SendRequest(ctx, "POST", "/customers", req, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to create RailsR customer: %w", err)
	}

	if len(resp.Errors) > 0 {
		return nil, resp.Errors[0]
	}

	customer := &Customer{}
	// Парсинг JSON:API ответа
	return customer, nil
}

// GetCustomer получает информацию о клиенте
func (s *CustomerService) GetCustomer(ctx context.Context, customerID string) (*Customer, error) {
	path := fmt.Sprintf("/customers/%s", customerID)

	var resp RailsRResponse
	err := s.client.SendRequest(ctx, "GET", path, nil, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to get RailsR customer %s: %w", customerID, err)
	}

	if len(resp.Errors) > 0 {
		return nil, resp.Errors[0]
	}

	customer := &Customer{}
	// Парсинг JSON:API ответа
	return customer, nil
}

// UpdateCustomer обновляет информацию о клиенте
func (s *CustomerService) UpdateCustomer(ctx context.Context, customerID string, updates map[string]interface{}) (*Customer, error) {
	path := fmt.Sprintf("/customers/%s", customerID)

	reqData := map[string]interface{}{
		"data": map[string]interface{}{
			"type":       "customers",
			"id":         customerID,
			"attributes": updates,
		},
	}

	var resp RailsRResponse
	err := s.client.SendRequest(ctx, "PATCH", path, reqData, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to update RailsR customer %s: %w", customerID, err)
	}

	if len(resp.Errors) > 0 {
		return nil, resp.Errors[0]
	}

	customer := &Customer{}
	// Парсинг ответа
	return customer, nil
}

// Вспомогательная функция для объединения параметров запроса
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
