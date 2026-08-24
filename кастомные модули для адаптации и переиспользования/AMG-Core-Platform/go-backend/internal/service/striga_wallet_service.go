package service

import (
	"encoding/json"
	"fmt"

	"amg-flow-backend/pkg/logger"
)

// StrigaWalletService предоставляет методы для работы с кошельками Striga
type StrigaWalletService struct {
	client *StrigaClient
	logger logger.Logger
}

// NewStrigaWalletService создает новый сервис для работы с кошельками
func NewStrigaWalletService(client *StrigaClient, logger logger.Logger) *StrigaWalletService {
	return &StrigaWalletService{
		client: client,
		logger: logger,
	}
}

// CreateWallet создает новый кошелек
func (s *StrigaWalletService) CreateWallet(req *CreateWalletRequest) (*Wallet, error) {
	s.logger.Infof("Creating wallet for user: %s with currency: %s", req.UserID, req.Currency)

	resp, err := s.client.Post("/v1/wallets", req)
	if err != nil {
		return nil, fmt.Errorf("failed to create wallet: %w", err)
	}

	wallet := &Wallet{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), wallet); err != nil {
		return nil, fmt.Errorf("failed to unmarshal wallet data: %w", err)
	}

	s.logger.Infof("Wallet created successfully with ID: %s", wallet.ID)
	return wallet, nil
}

// GetWallet получает кошелек по ID
func (s *StrigaWalletService) GetWallet(walletID string) (*Wallet, error) {
	s.logger.Infof("Getting wallet with ID: %s", walletID)

	resp, err := s.client.Get(fmt.Sprintf("/v1/wallets/%s", walletID))
	if err != nil {
		return nil, fmt.Errorf("failed to get wallet: %w", err)
	}

	wallet := &Wallet{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), wallet); err != nil {
		return nil, fmt.Errorf("failed to unmarshal wallet data: %w", err)
	}

	return wallet, nil
}

// ListWallets получает список кошельков пользователя
func (s *StrigaWalletService) ListWallets(userID string, page, limit int) (*WalletListResponse, error) {
	s.logger.Infof("Listing wallets for user: %s - page: %d, limit: %d", userID, page, limit)

	path := fmt.Sprintf("/v1/users/%s/wallets?page=%d&limit=%d", userID, page, limit)
	resp, err := s.client.Get(path)
	if err != nil {
		return nil, fmt.Errorf("failed to list wallets: %w", err)
	}

	walletList := &WalletListResponse{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), walletList); err != nil {
		return nil, fmt.Errorf("failed to unmarshal wallet list data: %w", err)
	}

	return walletList, nil
}

// UpdateWalletBalance обновляет баланс кошелька
func (s *StrigaWalletService) UpdateWalletBalance(walletID string, amount string) (*Wallet, error) {
	s.logger.Infof("Updating wallet balance - ID: %s, amount: %s", walletID, amount)

	req := map[string]string{"amount": amount}
	resp, err := s.client.Put(fmt.Sprintf("/v1/wallets/%s/balance", walletID), req)
	if err != nil {
		return nil, fmt.Errorf("failed to update wallet balance: %w", err)
	}

	wallet := &Wallet{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), wallet); err != nil {
		return nil, fmt.Errorf("failed to unmarshal wallet data: %w", err)
	}

	s.logger.Infof("Wallet balance updated successfully - ID: %s", wallet.ID)
	return wallet, nil
}

// FreezeWallet замораживает кошелек
func (s *StrigaWalletService) FreezeWallet(walletID string) (*Wallet, error) {
	s.logger.Infof("Freezing wallet with ID: %s", walletID)

	resp, err := s.client.Post(fmt.Sprintf("/v1/wallets/%s/freeze", walletID), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to freeze wallet: %w", err)
	}

	wallet := &Wallet{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), wallet); err != nil {
		return nil, fmt.Errorf("failed to unmarshal wallet data: %w", err)
	}

	s.logger.Infof("Wallet frozen successfully with ID: %s", wallet.ID)
	return wallet, nil
}

// UnfreezeWallet размораживает кошелек
func (s *StrigaWalletService) UnfreezeWallet(walletID string) (*Wallet, error) {
	s.logger.Infof("Unfreezing wallet with ID: %s", walletID)

	resp, err := s.client.Post(fmt.Sprintf("/v1/wallets/%s/unfreeze", walletID), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to unfreeze wallet: %w", err)
	}

	wallet := &Wallet{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), wallet); err != nil {
		return nil, fmt.Errorf("failed to unmarshal wallet data: %w", err)
	}

	s.logger.Infof("Wallet unfrozen successfully with ID: %s", wallet.ID)
	return wallet, nil
}

// DeleteWallet удаляет кошелек
func (s *StrigaWalletService) DeleteWallet(walletID string) error {
	s.logger.Infof("Deleting wallet with ID: %s", walletID)

	_, err := s.client.Delete(fmt.Sprintf("/v1/wallets/%s", walletID))
	if err != nil {
		return fmt.Errorf("failed to delete wallet: %w", err)
	}

	s.logger.Infof("Wallet deleted successfully with ID: %s", walletID)
	return nil
}

// GetWalletTransactions получает транзакции кошелька
func (s *StrigaWalletService) GetWalletTransactions(walletID string, page, limit int) (*TransactionListResponse, error) {
	s.logger.Infof("Getting transactions for wallet: %s - page: %d, limit: %d", walletID, page, limit)

	path := fmt.Sprintf("/v1/wallets/%s/transactions?page=%d&limit=%d", walletID, page, limit)
	resp, err := s.client.Get(path)
	if err != nil {
		return nil, fmt.Errorf("failed to get wallet transactions: %w", err)
	}

	transactionList := &TransactionListResponse{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), transactionList); err != nil {
		return nil, fmt.Errorf("failed to unmarshal transaction list data: %w", err)
	}

	return transactionList, nil
}
