package bitso

import (
	"context"
	"fmt"
	"strconv"
	"strings"
)

// TradingService - сервис для торговых операций Bitso
type TradingService struct {
	client *Client
}

// NewTradingService создаёт новый TradingService
func NewTradingService(client *Client) *TradingService {
	return &TradingService{client: client}
}

// PlaceOrder размещает ордер на бирже
func (s *TradingService) PlaceOrder(ctx context.Context, req PlaceOrderRequest) (*Order, error) {
	var resp PlaceOrderResponse
	err := s.client.SendRequest(ctx, "POST", "/orders", req, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to place Bitso order: %w", err)
	}

	if !resp.Success {
		if resp.Error != nil {
			return nil, resp.Error
		}
		return nil, fmt.Errorf("failed to place order: unknown error")
	}

	return resp.Payload, nil
}

// CancelOrder отменяет ордер
func (s *TradingService) CancelOrder(ctx context.Context, orderID string) error {
	path := fmt.Sprintf("/orders/%s", orderID)
	var resp BitsoResponse
	err := s.client.SendRequest(ctx, "DELETE", path, nil, &resp)
	if err != nil {
		return fmt.Errorf("failed to cancel Bitso order %s: %w", orderID, err)
	}

	if !resp.Success && resp.Error != nil {
		return resp.Error
	}

	return nil
}

// GetOpenOrders получает список открытых ордеров
func (s *TradingService) GetOpenOrders(ctx context.Context, book string) ([]Order, error) {
	path := "/open_orders"
	if book != "" {
		path += "?book=" + book
	}

	var resp OrdersResponse
	err := s.client.SendRequest(ctx, "GET", path, nil, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to get Bitso open orders: %w", err)
	}

	if !resp.Success {
		if resp.Error != nil {
			return nil, resp.Error
		}
		return nil, fmt.Errorf("failed to get open orders: unknown error")
	}

	return resp.Payload, nil
}

// GetOrderHistory получает историю ордеров
func (s *TradingService) GetOrderHistory(ctx context.Context, book string, limit int) ([]Order, error) {
	path := "/orders"
	params := []string{}

	if book != "" {
		params = append(params, "book="+book)
	}
	if limit > 0 {
		params = append(params, "limit="+strconv.Itoa(limit))
	}

	if len(params) > 0 {
		path += "?" + strings.Join(params, "&")
	}

	var resp OrdersResponse
	err := s.client.SendRequest(ctx, "GET", path, nil, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to get Bitso order history: %w", err)
	}

	if !resp.Success {
		if resp.Error != nil {
			return nil, resp.Error
		}
		return nil, fmt.Errorf("failed to get order history: unknown error")
	}

	return resp.Payload, nil
}

// GetUserTrades получает историю сделок пользователя
func (s *TradingService) GetUserTrades(ctx context.Context, book string, limit int) ([]UserTrade, error) {
	path := "/user_trades"
	params := []string{}

	if book != "" {
		params = append(params, "book="+book)
	}
	if limit > 0 {
		params = append(params, "limit="+strconv.Itoa(limit))
	}

	if len(params) > 0 {
		path += "?" + strings.Join(params, "&")
	}

	var resp UserTradesResponse
	err := s.client.SendRequest(ctx, "GET", path, nil, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to get Bitso user trades: %w", err)
	}

	if !resp.Success {
		if resp.Error != nil {
			return nil, resp.Error
		}
		return nil, fmt.Errorf("failed to get user trades: unknown error")
	}

	return resp.Payload, nil
}

// MarketDataService - сервис для получения рыночных данных
type MarketDataService struct {
	client *Client
}

// NewMarketDataService создаёт новый MarketDataService
func NewMarketDataService(client *Client) *MarketDataService {
	return &MarketDataService{client: client}
}

// GetAvailableBooks получает список доступных торговых пар
func (s *MarketDataService) GetAvailableBooks(ctx context.Context) ([]AvailableBook, error) {
	var resp AvailableBooksResponse
	err := s.client.SendRequest(ctx, "GET", "/available_books", nil, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to get Bitso available books: %w", err)
	}

	if !resp.Success {
		if resp.Error != nil {
			return nil, resp.Error
		}
		return nil, fmt.Errorf("failed to get available books: unknown error")
	}

	return resp.Payload, nil
}

// GetTicker получает информацию о цене торговой пары
func (s *MarketDataService) GetTicker(ctx context.Context, book string) (*Ticker, error) {
	path := "/ticker"
	if book != "" {
		path += "?book=" + book
	}

	var resp TickerResponse
	err := s.client.SendRequest(ctx, "GET", path, nil, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to get Bitso ticker for %s: %w", book, err)
	}

	if !resp.Success {
		if resp.Error != nil {
			return nil, resp.Error
		}
		return nil, fmt.Errorf("failed to get ticker: unknown error")
	}

	return resp.Payload, nil
}

// GetOrderBook получает книгу ордеров
func (s *MarketDataService) GetOrderBook(ctx context.Context, book string, aggregate bool) (*OrderBook, error) {
	path := "/order_book"
	params := []string{"book=" + book}

	if aggregate {
		params = append(params, "aggregate=true")
	}

	path += "?" + strings.Join(params, "&")

	var resp OrderBookResponse
	err := s.client.SendRequest(ctx, "GET", path, nil, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to get Bitso order book for %s: %w", book, err)
	}

	if !resp.Success {
		if resp.Error != nil {
			return nil, resp.Error
		}
		return nil, fmt.Errorf("failed to get order book: unknown error")
	}

	return resp.Payload, nil
}

// GetTrades получает список публичных сделок
func (s *MarketDataService) GetTrades(ctx context.Context, book string, limit int) ([]Trade, error) {
	path := "/trades"
	params := []string{"book=" + book}

	if limit > 0 {
		params = append(params, "limit="+strconv.Itoa(limit))
	}

	path += "?" + strings.Join(params, "&")

	var resp TradesResponse
	err := s.client.SendRequest(ctx, "GET", path, nil, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to get Bitso trades for %s: %w", book, err)
	}

	if !resp.Success {
		if resp.Error != nil {
			return nil, resp.Error
		}
		return nil, fmt.Errorf("failed to get trades: unknown error")
	}

	return resp.Payload, nil
}

// AccountService - сервис для управления аккаунтом
type AccountService struct {
	client *Client
}

// NewAccountService создаёт новый AccountService
func NewAccountService(client *Client) *AccountService {
	return &AccountService{client: client}
}

// GetAccountStatus получает статус аккаунта
func (s *AccountService) GetAccountStatus(ctx context.Context) (*AccountStatus, error) {
	var resp AccountStatusResponse
	err := s.client.SendRequest(ctx, "GET", "/account_status", nil, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to get Bitso account status: %w", err)
	}

	if !resp.Success {
		if resp.Error != nil {
			return nil, resp.Error
		}
		return nil, fmt.Errorf("failed to get account status: unknown error")
	}

	return resp.Payload, nil
}

// GetBalances получает балансы всех валют
func (s *AccountService) GetBalances(ctx context.Context) ([]Balance, error) {
	var resp BalancesResponse
	err := s.client.SendRequest(ctx, "GET", "/balance", nil, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to get Bitso balances: %w", err)
	}

	if !resp.Success {
		if resp.Error != nil {
			return nil, resp.Error
		}
		return nil, fmt.Errorf("failed to get balances: unknown error")
	}

	return resp.Payload, nil
}

// GetFees получает расписание комиссий
func (s *AccountService) GetFees(ctx context.Context) ([]FeeSchedule, error) {
	var resp FeeScheduleResponse
	err := s.client.SendRequest(ctx, "GET", "/fees", nil, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to get Bitso fees: %w", err)
	}

	if !resp.Success {
		if resp.Error != nil {
			return nil, resp.Error
		}
		return nil, fmt.Errorf("failed to get fees: unknown error")
	}

	return resp.Payload, nil
}

// GetFundingDestination получает адрес для пополнения
func (s *AccountService) GetFundingDestination(ctx context.Context, currency string) (*FundingDestination, error) {
	path := "/funding_destination?funds_currency=" + currency

	var resp FundingDestinationResponse
	err := s.client.SendRequest(ctx, "GET", path, nil, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to get Bitso funding destination for %s: %w", currency, err)
	}

	if !resp.Success {
		if resp.Error != nil {
			return nil, resp.Error
		}
		return nil, fmt.Errorf("failed to get funding destination: unknown error")
	}

	return resp.Payload, nil
}

// CreateWithdrawal создаёт запрос на вывод средств
func (s *AccountService) CreateWithdrawal(ctx context.Context, req WithdrawalRequest) (*Withdrawal, error) {
	var resp WithdrawalResponse
	err := s.client.SendRequest(ctx, "POST", "/withdrawals", req, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to create Bitso withdrawal: %w", err)
	}

	if !resp.Success {
		if resp.Error != nil {
			return nil, resp.Error
		}
		return nil, fmt.Errorf("failed to create withdrawal: unknown error")
	}

	return resp.Payload, nil
}

// GetWithdrawals получает историю выводов
func (s *AccountService) GetWithdrawals(ctx context.Context, limit int) ([]Withdrawal, error) {
	path := "/withdrawals"
	if limit > 0 {
		path += "?limit=" + strconv.Itoa(limit)
	}

	var resp WithdrawalsResponse
	err := s.client.SendRequest(ctx, "GET", path, nil, &resp)
	if err != nil {
		return nil, fmt.Errorf("failed to get Bitso withdrawals: %w", err)
	}

	if !resp.Success {
		if resp.Error != nil {
			return nil, resp.Error
		}
		return nil, fmt.Errorf("failed to get withdrawals: unknown error")
	}

	return resp.Payload, nil
}
