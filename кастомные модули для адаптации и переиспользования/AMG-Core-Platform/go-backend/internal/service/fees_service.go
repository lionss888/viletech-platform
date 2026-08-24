package service

import (
	"context"
	"fmt"
	"time"

	dataaccess "amg-flow-backend/internal/data-access"
	"amg-flow-backend/internal/domain"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// FeesService сервис для работы с комиссиями
type FeesService struct {
	feesRepo dataaccess.FeesRepository
}

// NewFeesService создает новый сервис комиссий
func NewFeesService(feesRepo dataaccess.FeesRepository) *FeesService {
	return &FeesService{
		feesRepo: feesRepo,
	}
}

// CreateFeeConfig создает новую конфигурацию комиссии
func (s *FeesService) CreateFeeConfig(ctx context.Context, req *CreateFeeConfigRequest) (*domain.FeeConfig, error) {
	// Валидация входных данных
	if err := s.validateFeeConfig(req); err != nil {
		return nil, fmt.Errorf("validation error: %w", err)
	}

	config := &domain.FeeConfig{
		ID:          uuid.New(),
		Name:        req.Name,
		Description: req.Description,
		FeeType:     req.FeeType,
		Category:    req.Category,
		Amount:      req.Amount,
		Percentage:  req.Percentage,
		MinAmount:   req.MinAmount,
		MaxAmount:   req.MaxAmount,
		Currency:    req.Currency,
		Country:     req.Country,
		MCC:         req.MCC,
		UserTier:    req.UserTier,
		IsActive:    req.IsActive,
		Priority:    req.Priority,
		ValidFrom:   req.ValidFrom,
		ValidTo:     req.ValidTo,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := s.feesRepo.CreateFeeConfig(ctx, config); err != nil {
		return nil, fmt.Errorf("failed to create fee config: %w", err)
	}

	// Создаем уровни комиссии, если они указаны
	if len(req.Tiers) > 0 {
		for _, tierReq := range req.Tiers {
			tier := &domain.FeeTier{
				ID:          uuid.New(),
				FeeConfigID: config.ID,
				MinAmount:   tierReq.MinAmount,
				MaxAmount:   tierReq.MaxAmount,
				Amount:      tierReq.Amount,
				Percentage:  tierReq.Percentage,
				Priority:    tierReq.Priority,
				CreatedAt:   time.Now(),
			}
			if err := s.feesRepo.CreateFeeTier(ctx, tier); err != nil {
				return nil, fmt.Errorf("failed to create fee tier: %w", err)
			}
		}
	}

	return config, nil
}

// GetFeeConfigByID получает конфигурацию по ID
func (s *FeesService) GetFeeConfigByID(ctx context.Context, id uuid.UUID) (*domain.FeeConfig, error) {
	config, err := s.feesRepo.GetFeeConfigByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get fee config: %w", err)
	}
	return config, nil
}

// GetFeeConfigs получает конфигурации с фильтрацией
func (s *FeesService) GetFeeConfigs(ctx context.Context, category domain.FeeCategory, isActive bool) ([]domain.FeeConfig, error) {
	configs, err := s.feesRepo.GetFeeConfigs(ctx, category, isActive)
	if err != nil {
		return nil, fmt.Errorf("failed to get fee configs: %w", err)
	}
	return configs, nil
}

// UpdateFeeConfig обновляет конфигурацию
func (s *FeesService) UpdateFeeConfig(ctx context.Context, id uuid.UUID, req *UpdateFeeConfigRequest) (*domain.FeeConfig, error) {
	config, err := s.feesRepo.GetFeeConfigByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("fee config not found: %w", err)
	}

	// Обновляем поля
	if req.Name != "" {
		config.Name = req.Name
	}
	if req.Description != "" {
		config.Description = req.Description
	}
	if req.FeeType != "" {
		config.FeeType = req.FeeType
	}
	if req.Category != "" {
		config.Category = req.Category
	}
	if req.Amount != nil {
		config.Amount = *req.Amount
	}
	if req.Percentage != nil {
		config.Percentage = *req.Percentage
	}
	if req.MinAmount != nil {
		config.MinAmount = *req.MinAmount
	}
	if req.MaxAmount != nil {
		config.MaxAmount = *req.MaxAmount
	}
	if req.Currency != "" {
		config.Currency = req.Currency
	}
	if req.Country != "" {
		config.Country = req.Country
	}
	if req.MCC != "" {
		config.MCC = req.MCC
	}
	if req.UserTier != "" {
		config.UserTier = req.UserTier
	}
	if req.IsActive != nil {
		config.IsActive = *req.IsActive
	}
	if req.Priority != nil {
		config.Priority = *req.Priority
	}
	if req.ValidFrom != nil {
		config.ValidFrom = *req.ValidFrom
	}
	if req.ValidTo != nil {
		config.ValidTo = req.ValidTo
	}

	config.UpdatedAt = time.Now()

	if err := s.feesRepo.UpdateFeeConfig(ctx, config); err != nil {
		return nil, fmt.Errorf("failed to update fee config: %w", err)
	}

	return config, nil
}

// DeleteFeeConfig удаляет конфигурацию
func (s *FeesService) DeleteFeeConfig(ctx context.Context, id uuid.UUID) error {
	// Проверяем, что конфигурация существует
	_, err := s.feesRepo.GetFeeConfigByID(ctx, id)
	if err != nil {
		return fmt.Errorf("fee config not found: %w", err)
	}

	if err := s.feesRepo.DeleteFeeConfig(ctx, id); err != nil {
		return fmt.Errorf("failed to delete fee config: %w", err)
	}

	return nil
}

// CalculateFee рассчитывает комиссию
func (s *FeesService) CalculateFee(ctx context.Context, req *domain.FeeCalculationRequest) (*domain.FeeCalculationResponse, error) {
	response, err := s.feesRepo.CalculateFee(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate fee: %w", err)
	}

	// Создаем запись о расчете комиссии
	calculation := &domain.FeeCalculation{
		ID:            uuid.New(),
		UserID:        req.UserID,
		TransactionID: req.TransactionID,
		FeeConfigID:   response.AppliedConfig.ID,
		Amount:        req.Amount,
		Currency:      req.Currency,
		FeeAmount:     response.FeeAmount,
		FeePercentage: response.FeePercentage,
		AppliedTier:   &response.AppliedTier.ID,
		Calculation:   s.serializeCalculation(response.Calculation),
		CreatedAt:     time.Now(),
	}

	// Сохраняем расчет
	if err := s.feesRepo.CreateFeeCalculation(ctx, calculation); err != nil {
		// Логируем ошибку, но не прерываем процесс
		fmt.Printf("Warning: failed to save fee calculation: %v\n", err)
	}

	return response, nil
}

// CreateSpreadConfig создает новую конфигурацию спреда
func (s *FeesService) CreateSpreadConfig(ctx context.Context, req *CreateSpreadConfigRequest) (*domain.SpreadConfig, error) {
	// Валидация входных данных
	if err := s.validateSpreadConfig(req); err != nil {
		return nil, fmt.Errorf("validation error: %w", err)
	}

	config := &domain.SpreadConfig{
		ID:           uuid.New(),
		Name:         req.Name,
		Description:  req.Description,
		FromCurrency: req.FromCurrency,
		ToCurrency:   req.ToCurrency,
		Spread:       req.Spread,
		MinSpread:    req.MinSpread,
		MaxSpread:    req.MaxSpread,
		Country:      req.Country,
		UserTier:     req.UserTier,
		IsActive:     req.IsActive,
		Priority:     req.Priority,
		ValidFrom:    req.ValidFrom,
		ValidTo:      req.ValidTo,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.feesRepo.CreateSpreadConfig(ctx, config); err != nil {
		return nil, fmt.Errorf("failed to create spread config: %w", err)
	}

	return config, nil
}

// CalculateSpread рассчитывает спред
func (s *FeesService) CalculateSpread(ctx context.Context, req *domain.SpreadCalculationRequest) (*domain.SpreadCalculationResponse, error) {
	response, err := s.feesRepo.CalculateSpread(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate spread: %w", err)
	}

	// Создаем запись о расчете спреда
	calculation := &domain.SpreadCalculation{
		ID:             uuid.New(),
		UserID:         req.UserID,
		TransactionID:  req.TransactionID,
		SpreadConfigID: response.AppliedConfig.ID,
		FromCurrency:   req.FromCurrency,
		ToCurrency:     req.ToCurrency,
		Amount:         req.Amount,
		ExchangeRate:   response.ExchangeRate,
		Spread:         response.Spread,
		SpreadAmount:   response.SpreadAmount,
		FinalAmount:    response.FinalAmount,
		Calculation:    s.serializeCalculation(response.Calculation),
		CreatedAt:      time.Now(),
	}

	// Сохраняем расчет
	if err := s.feesRepo.CreateSpreadCalculation(ctx, calculation); err != nil {
		// Логируем ошибку, но не прерываем процесс
		fmt.Printf("Warning: failed to save spread calculation: %v\n", err)
	}

	return response, nil
}

// GetFeeStats получает статистику комиссий
func (s *FeesService) GetFeeStats(ctx context.Context, userID uuid.UUID) (*domain.FeeStats, error) {
	stats, err := s.feesRepo.GetFeeStats(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get fee stats: %w", err)
	}
	return stats, nil
}

// validateFeeConfig валидирует конфигурацию комиссии
func (s *FeesService) validateFeeConfig(req *CreateFeeConfigRequest) error {
	if req.Name == "" {
		return fmt.Errorf("config name is required")
	}
	if req.FeeType == "" {
		return fmt.Errorf("fee type is required")
	}
	if req.Category == "" {
		return fmt.Errorf("category is required")
	}
	if req.Currency == "" {
		return fmt.Errorf("currency is required")
	}

	// Валидация в зависимости от типа комиссии
	switch req.FeeType {
	case domain.FeeTypeFixed:
		if req.Amount.LessThanOrEqual(decimal.Zero) {
			return fmt.Errorf("amount must be greater than zero for fixed fee")
		}
	case domain.FeeTypePercentage:
		if req.Percentage.LessThanOrEqual(decimal.Zero) || req.Percentage.GreaterThan(decimal.NewFromInt(100)) {
			return fmt.Errorf("percentage must be between 0 and 100")
		}
	case domain.FeeTypeTiered:
		if len(req.Tiers) == 0 {
			return fmt.Errorf("tiers are required for tiered fee")
		}
	}

	return nil
}

// validateSpreadConfig валидирует конфигурацию спреда
func (s *FeesService) validateSpreadConfig(req *CreateSpreadConfigRequest) error {
	if req.Name == "" {
		return fmt.Errorf("config name is required")
	}
	if req.FromCurrency == "" {
		return fmt.Errorf("from currency is required")
	}
	if req.ToCurrency == "" {
		return fmt.Errorf("to currency is required")
	}
	if req.Spread.LessThan(decimal.Zero) || req.Spread.GreaterThan(decimal.NewFromInt(100)) {
		return fmt.Errorf("spread must be between 0 and 100")
	}

	return nil
}

// serializeCalculation сериализует расчет в JSON
func (s *FeesService) serializeCalculation(calculation map[string]interface{}) string {
	if calculation == nil {
		return "{}"
	}

	// Здесь должна быть JSON сериализация
	// Пока возвращаем простую строку
	return fmt.Sprintf("%v", calculation)
}

// CreateFeeConfigRequest представляет запрос на создание конфигурации комиссии
type CreateFeeConfigRequest struct {
	Name        string             `json:"name"`
	Description string             `json:"description"`
	FeeType     domain.FeeType     `json:"fee_type"`
	Category    domain.FeeCategory `json:"category"`
	Amount      decimal.Decimal    `json:"amount"`
	Percentage  decimal.Decimal    `json:"percentage"`
	MinAmount   decimal.Decimal    `json:"min_amount"`
	MaxAmount   decimal.Decimal    `json:"max_amount"`
	Currency    string             `json:"currency"`
	Country     string             `json:"country,omitempty"`
	MCC         string             `json:"mcc,omitempty"`
	UserTier    string             `json:"user_tier,omitempty"`
	IsActive    bool               `json:"is_active"`
	Priority    int                `json:"priority"`
	ValidFrom   time.Time          `json:"valid_from"`
	ValidTo     *time.Time         `json:"valid_to,omitempty"`
	Tiers       []FeeTierRequest   `json:"tiers,omitempty"`
}

// UpdateFeeConfigRequest представляет запрос на обновление конфигурации комиссии
type UpdateFeeConfigRequest struct {
	Name        string             `json:"name,omitempty"`
	Description string             `json:"description,omitempty"`
	FeeType     domain.FeeType     `json:"fee_type,omitempty"`
	Category    domain.FeeCategory `json:"category,omitempty"`
	Amount      *decimal.Decimal   `json:"amount,omitempty"`
	Percentage  *decimal.Decimal   `json:"percentage,omitempty"`
	MinAmount   *decimal.Decimal   `json:"min_amount,omitempty"`
	MaxAmount   *decimal.Decimal   `json:"max_amount,omitempty"`
	Currency    string             `json:"currency,omitempty"`
	Country     string             `json:"country,omitempty"`
	MCC         string             `json:"mcc,omitempty"`
	UserTier    string             `json:"user_tier,omitempty"`
	IsActive    *bool              `json:"is_active,omitempty"`
	Priority    *int               `json:"priority,omitempty"`
	ValidFrom   *time.Time         `json:"valid_from,omitempty"`
	ValidTo     *time.Time         `json:"valid_to,omitempty"`
}

// FeeTierRequest представляет запрос на создание уровня комиссии
type FeeTierRequest struct {
	MinAmount  decimal.Decimal `json:"min_amount"`
	MaxAmount  decimal.Decimal `json:"max_amount"`
	Amount     decimal.Decimal `json:"amount"`
	Percentage decimal.Decimal `json:"percentage"`
	Priority   int             `json:"priority"`
}

// CreateSpreadConfigRequest представляет запрос на создание конфигурации спреда
type CreateSpreadConfigRequest struct {
	Name         string          `json:"name"`
	Description  string          `json:"description"`
	FromCurrency string          `json:"from_currency"`
	ToCurrency   string          `json:"to_currency"`
	Spread       decimal.Decimal `json:"spread"`
	MinSpread    decimal.Decimal `json:"min_spread"`
	MaxSpread    decimal.Decimal `json:"max_spread"`
	Country      string          `json:"country,omitempty"`
	UserTier     string          `json:"user_tier,omitempty"`
	IsActive     bool            `json:"is_active"`
	Priority     int             `json:"priority"`
	ValidFrom    time.Time       `json:"valid_from"`
	ValidTo      *time.Time      `json:"valid_to,omitempty"`
}
