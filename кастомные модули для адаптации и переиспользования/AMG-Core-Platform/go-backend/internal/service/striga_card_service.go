package service

import (
	"encoding/json"
	"fmt"

	"amg-flow-backend/pkg/logger"
)

// StrigaCardService предоставляет методы для работы с картами Striga
type StrigaCardService struct {
	client *StrigaClient
	logger logger.Logger
}

// NewStrigaCardService создает новый сервис для работы с картами
func NewStrigaCardService(client *StrigaClient, logger logger.Logger) *StrigaCardService {
	return &StrigaCardService{
		client: client,
		logger: logger,
	}
}

// CreateCard создает новую карту
func (s *StrigaCardService) CreateCard(req *CreateCardRequest) (*Card, error) {
	s.logger.Infof("Creating card for user: %s, wallet: %s, type: %s", req.UserID, req.WalletID, req.Type)

	resp, err := s.client.Post("/v1/cards", req)
	if err != nil {
		return nil, fmt.Errorf("failed to create card: %w", err)
	}

	card := &Card{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), card); err != nil {
		return nil, fmt.Errorf("failed to unmarshal card data: %w", err)
	}

	s.logger.Infof("Card created successfully with ID: %s", card.ID)
	return card, nil
}

// GetCard получает карту по ID
func (s *StrigaCardService) GetCard(cardID string) (*Card, error) {
	s.logger.Infof("Getting card with ID: %s", cardID)

	resp, err := s.client.Get(fmt.Sprintf("/v1/cards/%s", cardID))
	if err != nil {
		return nil, fmt.Errorf("failed to get card: %w", err)
	}

	card := &Card{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), card); err != nil {
		return nil, fmt.Errorf("failed to unmarshal card data: %w", err)
	}

	return card, nil
}

// ListCards получает список карт пользователя
func (s *StrigaCardService) ListCards(userID string, page, limit int) (*CardListResponse, error) {
	s.logger.Infof("Listing cards for user: %s - page: %d, limit: %d", userID, page, limit)

	path := fmt.Sprintf("/v1/users/%s/cards?page=%d&limit=%d", userID, page, limit)
	resp, err := s.client.Get(path)
	if err != nil {
		return nil, fmt.Errorf("failed to list cards: %w", err)
	}

	cardList := &CardListResponse{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), cardList); err != nil {
		return nil, fmt.Errorf("failed to unmarshal card list data: %w", err)
	}

	return cardList, nil
}

// ActivateCard активирует карту
func (s *StrigaCardService) ActivateCard(cardID string) (*Card, error) {
	s.logger.Infof("Activating card with ID: %s", cardID)

	resp, err := s.client.Post(fmt.Sprintf("/v1/cards/%s/activate", cardID), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to activate card: %w", err)
	}

	card := &Card{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), card); err != nil {
		return nil, fmt.Errorf("failed to unmarshal card data: %w", err)
	}

	s.logger.Infof("Card activated successfully with ID: %s", card.ID)
	return card, nil
}

// DeactivateCard деактивирует карту
func (s *StrigaCardService) DeactivateCard(cardID string) (*Card, error) {
	s.logger.Infof("Deactivating card with ID: %s", cardID)

	resp, err := s.client.Post(fmt.Sprintf("/v1/cards/%s/deactivate", cardID), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to deactivate card: %w", err)
	}

	card := &Card{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), card); err != nil {
		return nil, fmt.Errorf("failed to unmarshal card data: %w", err)
	}

	s.logger.Infof("Card deactivated successfully with ID: %s", card.ID)
	return card, nil
}

// BlockCard блокирует карту
func (s *StrigaCardService) BlockCard(cardID string) (*Card, error) {
	s.logger.Infof("Blocking card with ID: %s", cardID)

	resp, err := s.client.Post(fmt.Sprintf("/v1/cards/%s/block", cardID), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to block card: %w", err)
	}

	card := &Card{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), card); err != nil {
		return nil, fmt.Errorf("failed to unmarshal card data: %w", err)
	}

	s.logger.Infof("Card blocked successfully with ID: %s", card.ID)
	return card, nil
}

// UnblockCard разблокирует карту
func (s *StrigaCardService) UnblockCard(cardID string) (*Card, error) {
	s.logger.Infof("Unblocking card with ID: %s", cardID)

	resp, err := s.client.Post(fmt.Sprintf("/v1/cards/%s/unblock", cardID), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to unblock card: %w", err)
	}

	card := &Card{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), card); err != nil {
		return nil, fmt.Errorf("failed to unmarshal card data: %w", err)
	}

	s.logger.Infof("Card unblocked successfully with ID: %s", card.ID)
	return card, nil
}

// DeleteCard удаляет карту
func (s *StrigaCardService) DeleteCard(cardID string) error {
	s.logger.Infof("Deleting card with ID: %s", cardID)

	_, err := s.client.Delete(fmt.Sprintf("/v1/cards/%s", cardID))
	if err != nil {
		return fmt.Errorf("failed to delete card: %w", err)
	}

	s.logger.Infof("Card deleted successfully with ID: %s", cardID)
	return nil
}

// GetCardTransactions получает транзакции карты
func (s *StrigaCardService) GetCardTransactions(cardID string, page, limit int) (*TransactionListResponse, error) {
	s.logger.Infof("Getting transactions for card: %s - page: %d, limit: %d", cardID, page, limit)

	path := fmt.Sprintf("/v1/cards/%s/transactions?page=%d&limit=%d", cardID, page, limit)
	resp, err := s.client.Get(path)
	if err != nil {
		return nil, fmt.Errorf("failed to get card transactions: %w", err)
	}

	transactionList := &TransactionListResponse{}
	if err := json.Unmarshal([]byte(fmt.Sprintf("%v", resp.Data)), transactionList); err != nil {
		return nil, fmt.Errorf("failed to unmarshal transaction list data: %w", err)
	}

	return transactionList, nil
}
