package service

import (
	"encoding/json"
	"fmt"

	"amg-flow-backend/pkg/logger"
)

// StrigaTransactionService предоставляет методы для работы с транзакциями Striga
type StrigaTransactionService struct {
	client *StrigaClient
	logger logger.Logger
}

// NewStrigaTransactionService создает новый сервис для работы с транзакциями
func NewStrigaTransactionService(client *StrigaClient, logger logger.Logger) *StrigaTransactionService {
	return &StrigaTransactionService{
		client: client,
		logger: logger,
	}
}

// CreateTransaction создает новую транзакцию
func (s *StrigaTransactionService) CreateTransaction(req *CreateTransactionRequest) (*Transaction, error) {
	s.logger.Infof("Creating transaction for user: %s, wallet: %s, amount: %s %s", 
		req.UserID, req.WalletID, req.Amount, req.Currency)

	resp, err := s.client.Post("/v1/transactions", req)
	if err != nil {
		return nil, fmt.Errorf("failed to create transaction: %w", err)
	}

	transaction := &Transaction{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), transaction); err != nil {
		return nil, fmt.Errorf("failed to unmarshal transaction data: %w", err)
	}

	s.logger.Infof("Transaction created successfully with ID: %s", transaction.ID)
	return transaction, nil
}

// GetTransaction получает транзакцию по ID
func (s *StrigaTransactionService) GetTransaction(transactionID string) (*Transaction, error) {
	s.logger.Infof("Getting transaction with ID: %s", transactionID)

	resp, err := s.client.Get(fmt.Sprintf("/v1/transactions/%s", transactionID))
	if err != nil {
		return nil, fmt.Errorf("failed to get transaction: %w", err)
	}

	transaction := &Transaction{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), transaction); err != nil {
		return nil, fmt.Errorf("failed to unmarshal transaction data: %w", err)
	}

	return transaction, nil
}

// ListTransactions получает список транзакций пользователя
func (s *StrigaTransactionService) ListTransactions(userID string, page, limit int) (*TransactionListResponse, error) {
	s.logger.Infof("Listing transactions for user: %s - page: %d, limit: %d", userID, page, limit)

	path := fmt.Sprintf("/v1/users/%s/transactions?page=%d&limit=%d", userID, page, limit)
	resp, err := s.client.Get(path)
	if err != nil {
		return nil, fmt.Errorf("failed to list transactions: %w", err)
	}

	transactionList := &TransactionListResponse{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), transactionList); err != nil {
		return nil, fmt.Errorf("failed to unmarshal transaction list data: %w", err)
	}

	return transactionList, nil
}

// ListAllTransactions получает список всех транзакций с фильтрацией
func (s *StrigaTransactionService) ListAllTransactions(page, limit int, filters map[string]string) (*TransactionListResponse, error) {
	s.logger.Infof("Listing all transactions - page: %d, limit: %d", page, limit)

	path := fmt.Sprintf("/v1/transactions?page=%d&limit=%d", page, limit)
	
	// Добавляем фильтры в query параметры
	if len(filters) > 0 {
		for key, value := range filters {
			path += fmt.Sprintf("&%s=%s", key, value)
		}
	}

	resp, err := s.client.Get(path)
	if err != nil {
		return nil, fmt.Errorf("failed to list transactions: %w", err)
	}

	transactionList := &TransactionListResponse{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), transactionList); err != nil {
		return nil, fmt.Errorf("failed to unmarshal transaction list data: %w", err)
	}

	return transactionList, nil
}

// ApproveTransaction подтверждает транзакцию
func (s *StrigaTransactionService) ApproveTransaction(transactionID string) (*Transaction, error) {
	s.logger.Infof("Approving transaction with ID: %s", transactionID)

	resp, err := s.client.Post(fmt.Sprintf("/v1/transactions/%s/approve", transactionID), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to approve transaction: %w", err)
	}

	transaction := &Transaction{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), transaction); err != nil {
		return nil, fmt.Errorf("failed to unmarshal transaction data: %w", err)
	}

	s.logger.Infof("Transaction approved successfully with ID: %s", transaction.ID)
	return transaction, nil
}

// RejectTransaction отклоняет транзакцию
func (s *StrigaTransactionService) RejectTransaction(transactionID string, reason string) (*Transaction, error) {
	s.logger.Infof("Rejecting transaction with ID: %s, reason: %s", transactionID, reason)

	req := map[string]string{"reason": reason}
	resp, err := s.client.Post(fmt.Sprintf("/v1/transactions/%s/reject", transactionID), req)
	if err != nil {
		return nil, fmt.Errorf("failed to reject transaction: %w", err)
	}

	transaction := &Transaction{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), transaction); err != nil {
		return nil, fmt.Errorf("failed to unmarshal transaction data: %w", err)
	}

	s.logger.Infof("Transaction rejected successfully with ID: %s", transaction.ID)
	return transaction, nil
}

// CancelTransaction отменяет транзакцию
func (s *StrigaTransactionService) CancelTransaction(transactionID string) (*Transaction, error) {
	s.logger.Infof("Cancelling transaction with ID: %s", transactionID)

	resp, err := s.client.Post(fmt.Sprintf("/v1/transactions/%s/cancel", transactionID), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to cancel transaction: %w", err)
	}

	transaction := &Transaction{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), transaction); err != nil {
		return nil, fmt.Errorf("failed to unmarshal transaction data: %w", err)
	}

	s.logger.Infof("Transaction cancelled successfully with ID: %s", transaction.ID)
	return transaction, nil
}

// GetTransactionStatus получает статус транзакции
func (s *StrigaTransactionService) GetTransactionStatus(transactionID string) (string, error) {
	transaction, err := s.GetTransaction(transactionID)
	if err != nil {
		return "", err
	}

	return transaction.Status, nil
}
