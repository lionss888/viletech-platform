package dataaccess

import (
	"context"
	"time"

	"amg-flow-backend/internal/domain"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// FeesRepository интерфейс для работы с комиссиями
type FeesRepository interface {
	// FeeConfig методы
	CreateFeeConfig(ctx context.Context, config *domain.FeeConfig) error
	GetFeeConfigByID(ctx context.Context, id uuid.UUID) (*domain.FeeConfig, error)
	GetFeeConfigs(ctx context.Context, category domain.FeeCategory, isActive bool) ([]domain.FeeConfig, error)
	UpdateFeeConfig(ctx context.Context, config *domain.FeeConfig) error
	DeleteFeeConfig(ctx context.Context, id uuid.UUID) error

	// FeeTier методы
	CreateFeeTier(ctx context.Context, tier *domain.FeeTier) error
	GetFeeTiersByConfigID(ctx context.Context, configID uuid.UUID) ([]domain.FeeTier, error)
	UpdateFeeTier(ctx context.Context, tier *domain.FeeTier) error
	DeleteFeeTier(ctx context.Context, id uuid.UUID) error

	// FeeCalculation методы
	CreateFeeCalculation(ctx context.Context, calculation *domain.FeeCalculation) error
	GetFeeCalculationsByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]domain.FeeCalculation, error)
	GetFeeCalculationsByTransactionID(ctx context.Context, transactionID uuid.UUID) ([]domain.FeeCalculation, error)

	// SpreadConfig методы
	CreateSpreadConfig(ctx context.Context, config *domain.SpreadConfig) error
	GetSpreadConfigByID(ctx context.Context, id uuid.UUID) (*domain.SpreadConfig, error)
	GetSpreadConfigs(ctx context.Context, fromCurrency, toCurrency string, isActive bool) ([]domain.SpreadConfig, error)
	UpdateSpreadConfig(ctx context.Context, config *domain.SpreadConfig) error
	DeleteSpreadConfig(ctx context.Context, id uuid.UUID) error

	// SpreadCalculation методы
	CreateSpreadCalculation(ctx context.Context, calculation *domain.SpreadCalculation) error
	GetSpreadCalculationsByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]domain.SpreadCalculation, error)

	// Расчеты
	CalculateFee(ctx context.Context, req *domain.FeeCalculationRequest) (*domain.FeeCalculationResponse, error)
	CalculateSpread(ctx context.Context, req *domain.SpreadCalculationRequest) (*domain.SpreadCalculationResponse, error)
	GetFeeStats(ctx context.Context, userID uuid.UUID) (*domain.FeeStats, error)
}

// GormFeesRepository реализация FeesRepository с использованием GORM
type GormFeesRepository struct {
	db *gorm.DB
}

// NewGormFeesRepository создает новый GormFeesRepository
func NewGormFeesRepository(db *gorm.DB) *GormFeesRepository {
	return &GormFeesRepository{db: db}
}

// CreateFeeConfig создает новую конфигурацию комиссии
func (r *GormFeesRepository) CreateFeeConfig(ctx context.Context, config *domain.FeeConfig) error {
	return r.db.WithContext(ctx).Create(config).Error
}

// GetFeeConfigByID получает конфигурацию по ID
func (r *GormFeesRepository) GetFeeConfigByID(ctx context.Context, id uuid.UUID) (*domain.FeeConfig, error) {
	var config domain.FeeConfig
	err := r.db.WithContext(ctx).Preload("FeeTiers").Where("id = ?", id).First(&config).Error
	if err != nil {
		return nil, err
	}
	return &config, nil
}

// GetFeeConfigs получает конфигурации с фильтрацией
func (r *GormFeesRepository) GetFeeConfigs(ctx context.Context, category domain.FeeCategory, isActive bool) ([]domain.FeeConfig, error) {
	var configs []domain.FeeConfig
	query := r.db.WithContext(ctx).Preload("FeeTiers")
	
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if isActive {
		query = query.Where("is_active = ?", true)
	}
	
	err := query.Order("priority DESC, created_at DESC").Find(&configs).Error
	return configs, err
}

// UpdateFeeConfig обновляет конфигурацию
func (r *GormFeesRepository) UpdateFeeConfig(ctx context.Context, config *domain.FeeConfig) error {
	return r.db.WithContext(ctx).Save(config).Error
}

// DeleteFeeConfig удаляет конфигурацию
func (r *GormFeesRepository) DeleteFeeConfig(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&domain.FeeConfig{}).Error
}

// CreateFeeTier создает новый уровень комиссии
func (r *GormFeesRepository) CreateFeeTier(ctx context.Context, tier *domain.FeeTier) error {
	return r.db.WithContext(ctx).Create(tier).Error
}

// GetFeeTiersByConfigID получает уровни по ID конфигурации
func (r *GormFeesRepository) GetFeeTiersByConfigID(ctx context.Context, configID uuid.UUID) ([]domain.FeeTier, error) {
	var tiers []domain.FeeTier
	err := r.db.WithContext(ctx).Where("fee_config_id = ?", configID).Order("priority DESC, min_amount ASC").Find(&tiers).Error
	return tiers, err
}

// UpdateFeeTier обновляет уровень
func (r *GormFeesRepository) UpdateFeeTier(ctx context.Context, tier *domain.FeeTier) error {
	return r.db.WithContext(ctx).Save(tier).Error
}

// DeleteFeeTier удаляет уровень
func (r *GormFeesRepository) DeleteFeeTier(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&domain.FeeTier{}).Error
}

// CreateFeeCalculation создает расчет комиссии
func (r *GormFeesRepository) CreateFeeCalculation(ctx context.Context, calculation *domain.FeeCalculation) error {
	return r.db.WithContext(ctx).Create(calculation).Error
}

// GetFeeCalculationsByUserID получает расчеты пользователя
func (r *GormFeesRepository) GetFeeCalculationsByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]domain.FeeCalculation, error) {
	var calculations []domain.FeeCalculation
	query := r.db.WithContext(ctx).Preload("FeeConfig").Where("user_id = ?", userID)
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}
	
	err := query.Order("created_at DESC").Find(&calculations).Error
	return calculations, err
}

// GetFeeCalculationsByTransactionID получает расчеты по транзакции
func (r *GormFeesRepository) GetFeeCalculationsByTransactionID(ctx context.Context, transactionID uuid.UUID) ([]domain.FeeCalculation, error) {
	var calculations []domain.FeeCalculation
	err := r.db.WithContext(ctx).Preload("FeeConfig").Where("transaction_id = ?", transactionID).Find(&calculations).Error
	return calculations, err
}

// CreateSpreadConfig создает новую конфигурацию спреда
func (r *GormFeesRepository) CreateSpreadConfig(ctx context.Context, config *domain.SpreadConfig) error {
	return r.db.WithContext(ctx).Create(config).Error
}

// GetSpreadConfigByID получает конфигурацию спреда по ID
func (r *GormFeesRepository) GetSpreadConfigByID(ctx context.Context, id uuid.UUID) (*domain.SpreadConfig, error) {
	var config domain.SpreadConfig
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&config).Error
	if err != nil {
		return nil, err
	}
	return &config, nil
}

// GetSpreadConfigs получает конфигурации спреда с фильтрацией
func (r *GormFeesRepository) GetSpreadConfigs(ctx context.Context, fromCurrency, toCurrency string, isActive bool) ([]domain.SpreadConfig, error) {
	var configs []domain.SpreadConfig
	query := r.db.WithContext(ctx)
	
	if fromCurrency != "" {
		query = query.Where("from_currency = ?", fromCurrency)
	}
	if toCurrency != "" {
		query = query.Where("to_currency = ?", toCurrency)
	}
	if isActive {
		query = query.Where("is_active = ?", true)
	}
	
	err := query.Order("priority DESC, created_at DESC").Find(&configs).Error
	return configs, err
}

// UpdateSpreadConfig обновляет конфигурацию спреда
func (r *GormFeesRepository) UpdateSpreadConfig(ctx context.Context, config *domain.SpreadConfig) error {
	return r.db.WithContext(ctx).Save(config).Error
}

// DeleteSpreadConfig удаляет конфигурацию спреда
func (r *GormFeesRepository) DeleteSpreadConfig(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&domain.SpreadConfig{}).Error
}

// CreateSpreadCalculation создает расчет спреда
func (r *GormFeesRepository) CreateSpreadCalculation(ctx context.Context, calculation *domain.SpreadCalculation) error {
	return r.db.WithContext(ctx).Create(calculation).Error
}

// GetSpreadCalculationsByUserID получает расчеты спреда пользователя
func (r *GormFeesRepository) GetSpreadCalculationsByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]domain.SpreadCalculation, error) {
	var calculations []domain.SpreadCalculation
	query := r.db.WithContext(ctx).Preload("SpreadConfig").Where("user_id = ?", userID)
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}
	
	err := query.Order("created_at DESC").Find(&calculations).Error
	return calculations, err
}

// CalculateFee рассчитывает комиссию
func (r *GormFeesRepository) CalculateFee(ctx context.Context, req *domain.FeeCalculationRequest) (*domain.FeeCalculationResponse, error) {
	// Получаем подходящие конфигурации комиссий
	configs, err := r.GetFeeConfigs(ctx, req.Category, true)
	if err != nil {
		return nil, err
	}

	// Фильтруем конфигурации по критериям
	var applicableConfigs []domain.FeeConfig
	for _, config := range configs {
		if r.isConfigApplicable(config, req) {
			applicableConfigs = append(applicableConfigs, config)
		}
	}

	if len(applicableConfigs) == 0 {
		return &domain.FeeCalculationResponse{
			FeeAmount:     decimal.Zero,
			FeePercentage: decimal.Zero,
			TotalAmount:   req.Amount,
			NetAmount:     req.Amount,
			Calculation:   map[string]interface{}{"message": "No applicable fee configuration found"},
		}, nil
	}

	// Выбираем конфигурацию с наивысшим приоритетом
	selectedConfig := applicableConfigs[0]
	for _, config := range applicableConfigs[1:] {
		if config.Priority > selectedConfig.Priority {
			selectedConfig = config
		}
	}

	// Рассчитываем комиссию
	feeAmount, appliedTier := r.calculateFeeAmount(selectedConfig, req.Amount)
	feePercentage := decimal.Zero
	if req.Amount.GreaterThan(decimal.Zero) {
		feePercentage = feeAmount.Div(req.Amount).Mul(decimal.NewFromInt(100))
	}

	response := &domain.FeeCalculationResponse{
		FeeAmount:     feeAmount,
		FeePercentage: feePercentage,
		TotalAmount:   req.Amount.Add(feeAmount),
		NetAmount:     req.Amount,
		AppliedConfig: &selectedConfig,
		AppliedTier:   appliedTier,
		Calculation: map[string]interface{}{
			"base_amount":      req.Amount,
			"fee_type":         selectedConfig.FeeType,
			"fee_amount":       feeAmount,
			"fee_percentage":   feePercentage,
			"total_amount":     req.Amount.Add(feeAmount),
		},
	}

	return response, nil
}

// CalculateSpread рассчитывает спред
func (r *GormFeesRepository) CalculateSpread(ctx context.Context, req *domain.SpreadCalculationRequest) (*domain.SpreadCalculationResponse, error) {
	// Получаем подходящие конфигурации спреда
	configs, err := r.GetSpreadConfigs(ctx, req.FromCurrency, req.ToCurrency, true)
	if err != nil {
		return nil, err
	}

	if len(configs) == 0 {
		return &domain.SpreadCalculationResponse{
			ExchangeRate: decimal.Zero,
			Spread:       decimal.Zero,
			SpreadAmount: decimal.Zero,
			FinalAmount:  decimal.Zero,
			Calculation:  map[string]interface{}{"message": "No applicable spread configuration found"},
		}, nil
	}

	// Выбираем конфигурацию с наивысшим приоритетом
	selectedConfig := configs[0]
	for _, config := range configs[1:] {
		if config.Priority > selectedConfig.Priority {
			selectedConfig = config
		}
	}

	// Получаем базовый курс обмена (здесь должна быть интеграция с внешним API)
	baseRate := r.getBaseExchangeRate(req.FromCurrency, req.ToCurrency)
	
	// Рассчитываем спред
	spread := selectedConfig.Spread
	spreadAmount := req.Amount.Mul(spread).Div(decimal.NewFromInt(100))
	finalAmount := req.Amount.Sub(spreadAmount)
	exchangeRate := baseRate.Mul(decimal.NewFromInt(1).Sub(spread.Div(decimal.NewFromInt(100))))

	response := &domain.SpreadCalculationResponse{
		ExchangeRate:  exchangeRate,
		Spread:        spread,
		SpreadAmount:  spreadAmount,
		FinalAmount:   finalAmount,
		AppliedConfig: &selectedConfig,
		Calculation: map[string]interface{}{
			"base_rate":      baseRate,
			"spread":         spread,
			"spread_amount":  spreadAmount,
			"final_amount":   finalAmount,
			"exchange_rate":  exchangeRate,
		},
	}

	return response, nil
}

// GetFeeStats получает статистику комиссий
func (r *GormFeesRepository) GetFeeStats(ctx context.Context, userID uuid.UUID) (*domain.FeeStats, error) {
	var stats domain.FeeStats
	stats.UserID = userID

	// Подсчитываем общую сумму комиссий
	var totalFees decimal.Decimal
	err := r.db.WithContext(ctx).Model(&domain.FeeCalculation{}).
		Where("user_id = ?", userID).
		Select("SUM(fee_amount)").Scan(&totalFees).Error
	if err != nil {
		return nil, err
	}
	stats.TotalFees = totalFees

	// Подсчитываем общее количество транзакций
	var totalTransactions int64
	err = r.db.WithContext(ctx).Model(&domain.FeeCalculation{}).
		Where("user_id = ?", userID).
		Count(&totalTransactions).Error
	if err != nil {
		return nil, err
	}
	stats.TotalTransactions = int(totalTransactions)

	// Рассчитываем среднюю комиссию
	if totalTransactions > 0 {
		stats.AverageFee = totalFees.Div(decimal.NewFromInt(totalTransactions))
	}

	// Получаем комиссии по категориям
	stats.FeeByCategory = make(map[string]decimal.Decimal)
	stats.FeeByCurrency = make(map[string]decimal.Decimal)

	stats.LastUpdated = time.Now()

	return &stats, nil
}

// isConfigApplicable проверяет применимость конфигурации
func (r *GormFeesRepository) isConfigApplicable(config domain.FeeConfig, req *domain.FeeCalculationRequest) bool {
	// Проверяем валюту
	if config.Currency != req.Currency {
		return false
	}

	// Проверяем страну
	if config.Country != "" && config.Country != req.Country {
		return false
	}

	// Проверяем MCC
	if config.MCC != "" && config.MCC != req.MCC {
		return false
	}

	// Проверяем пользовательский тир
	if config.UserTier != "" && config.UserTier != req.UserTier {
		return false
	}

	// Проверяем период действия
	now := time.Now()
	if config.ValidFrom.After(now) {
		return false
	}
	if config.ValidTo != nil && config.ValidTo.Before(now) {
		return false
	}

	return true
}

// calculateFeeAmount рассчитывает сумму комиссии
func (r *GormFeesRepository) calculateFeeAmount(config domain.FeeConfig, amount decimal.Decimal) (decimal.Decimal, *domain.FeeTier) {
	switch config.FeeType {
	case domain.FeeTypeFixed:
		return config.Amount, nil
	case domain.FeeTypePercentage:
		feeAmount := amount.Mul(config.Percentage).Div(decimal.NewFromInt(100))
		// Применяем минимальную и максимальную суммы
		if config.MinAmount.GreaterThan(decimal.Zero) && feeAmount.LessThan(config.MinAmount) {
			feeAmount = config.MinAmount
		}
		if config.MaxAmount.GreaterThan(decimal.Zero) && feeAmount.GreaterThan(config.MaxAmount) {
			feeAmount = config.MaxAmount
		}
		return feeAmount, nil
	case domain.FeeTypeTiered:
		// Ищем подходящий уровень
		for _, tier := range config.FeeTiers {
			if amount.GreaterThanOrEqual(tier.MinAmount) && 
			   (tier.MaxAmount.IsZero() || amount.LessThanOrEqual(tier.MaxAmount)) {
				if tier.Percentage.GreaterThan(decimal.Zero) {
					feeAmount := amount.Mul(tier.Percentage).Div(decimal.NewFromInt(100))
					return feeAmount, &tier
				}
				return tier.Amount, &tier
			}
		}
		return decimal.Zero, nil
	default:
		return decimal.Zero, nil
	}
}

// getBaseExchangeRate получает базовый курс обмена
func (r *GormFeesRepository) getBaseExchangeRate(fromCurrency, toCurrency string) decimal.Decimal {
	// Здесь должна быть интеграция с внешним API для получения курсов
	// Пока возвращаем фиксированный курс
	if fromCurrency == "USD" && toCurrency == "EUR" {
		return decimal.NewFromFloat(0.85)
	}
	if fromCurrency == "EUR" && toCurrency == "USD" {
		return decimal.NewFromFloat(1.18)
	}
	return decimal.NewFromInt(1)
}
