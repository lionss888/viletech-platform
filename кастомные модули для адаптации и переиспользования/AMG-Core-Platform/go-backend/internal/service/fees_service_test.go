package service

import (
	"context"
	"testing"
	"time"

	"amg-flow-backend/internal/domain"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockFeesRepository мок репозитория для тестов
type MockFeesRepository struct {
	mock.Mock
}

// CreateFeeConfig мок метод
func (m *MockFeesRepository) CreateFeeConfig(ctx context.Context, config *domain.FeeConfig) error {
	args := m.Called(ctx, config)
	return args.Error(0)
}

// GetFeeConfigByID мок метод
func (m *MockFeesRepository) GetFeeConfigByID(ctx context.Context, id uuid.UUID) (*domain.FeeConfig, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*domain.FeeConfig), args.Error(1)
}

// GetFeeConfigs мок метод
func (m *MockFeesRepository) GetFeeConfigs(ctx context.Context, category domain.FeeCategory, isActive bool) ([]domain.FeeConfig, error) {
	args := m.Called(ctx, category, isActive)
	return args.Get(0).([]domain.FeeConfig), args.Error(1)
}

// UpdateFeeConfig мок метод
func (m *MockFeesRepository) UpdateFeeConfig(ctx context.Context, config *domain.FeeConfig) error {
	args := m.Called(ctx, config)
	return args.Error(0)
}

// DeleteFeeConfig мок метод
func (m *MockFeesRepository) DeleteFeeConfig(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

// CreateFeeTier мок метод
func (m *MockFeesRepository) CreateFeeTier(ctx context.Context, tier *domain.FeeTier) error {
	args := m.Called(ctx, tier)
	return args.Error(0)
}

// GetFeeTiersByConfigID мок метод
func (m *MockFeesRepository) GetFeeTiersByConfigID(ctx context.Context, configID uuid.UUID) ([]domain.FeeTier, error) {
	args := m.Called(ctx, configID)
	return args.Get(0).([]domain.FeeTier), args.Error(1)
}

// UpdateFeeTier мок метод
func (m *MockFeesRepository) UpdateFeeTier(ctx context.Context, tier *domain.FeeTier) error {
	args := m.Called(ctx, tier)
	return args.Error(0)
}

// DeleteFeeTier мок метод
func (m *MockFeesRepository) DeleteFeeTier(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

// CreateFeeCalculation мок метод
func (m *MockFeesRepository) CreateFeeCalculation(ctx context.Context, calculation *domain.FeeCalculation) error {
	args := m.Called(ctx, calculation)
	return args.Error(0)
}

// GetFeeCalculationsByUserID мок метод
func (m *MockFeesRepository) GetFeeCalculationsByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]domain.FeeCalculation, error) {
	args := m.Called(ctx, userID, limit, offset)
	return args.Get(0).([]domain.FeeCalculation), args.Error(1)
}

// GetFeeCalculationsByTransactionID мок метод
func (m *MockFeesRepository) GetFeeCalculationsByTransactionID(ctx context.Context, transactionID uuid.UUID) ([]domain.FeeCalculation, error) {
	args := m.Called(ctx, transactionID)
	return args.Get(0).([]domain.FeeCalculation), args.Error(1)
}

// CreateSpreadConfig мок метод
func (m *MockFeesRepository) CreateSpreadConfig(ctx context.Context, config *domain.SpreadConfig) error {
	args := m.Called(ctx, config)
	return args.Error(0)
}

// GetSpreadConfigByID мок метод
func (m *MockFeesRepository) GetSpreadConfigByID(ctx context.Context, id uuid.UUID) (*domain.SpreadConfig, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*domain.SpreadConfig), args.Error(1)
}

// GetSpreadConfigs мок метод
func (m *MockFeesRepository) GetSpreadConfigs(ctx context.Context, fromCurrency, toCurrency string, isActive bool) ([]domain.SpreadConfig, error) {
	args := m.Called(ctx, fromCurrency, toCurrency, isActive)
	return args.Get(0).([]domain.SpreadConfig), args.Error(1)
}

// UpdateSpreadConfig мок метод
func (m *MockFeesRepository) UpdateSpreadConfig(ctx context.Context, config *domain.SpreadConfig) error {
	args := m.Called(ctx, config)
	return args.Error(0)
}

// DeleteSpreadConfig мок метод
func (m *MockFeesRepository) DeleteSpreadConfig(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

// CreateSpreadCalculation мок метод
func (m *MockFeesRepository) CreateSpreadCalculation(ctx context.Context, calculation *domain.SpreadCalculation) error {
	args := m.Called(ctx, calculation)
	return args.Error(0)
}

// GetSpreadCalculationsByUserID мок метод
func (m *MockFeesRepository) GetSpreadCalculationsByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]domain.SpreadCalculation, error) {
	args := m.Called(ctx, userID, limit, offset)
	return args.Get(0).([]domain.SpreadCalculation), args.Error(1)
}

// CalculateFee мок метод
func (m *MockFeesRepository) CalculateFee(ctx context.Context, req *domain.FeeCalculationRequest) (*domain.FeeCalculationResponse, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(*domain.FeeCalculationResponse), args.Error(1)
}

// CalculateSpread мок метод
func (m *MockFeesRepository) CalculateSpread(ctx context.Context, req *domain.SpreadCalculationRequest) (*domain.SpreadCalculationResponse, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(*domain.SpreadCalculationResponse), args.Error(1)
}

// GetFeeStats мок метод
func (m *MockFeesRepository) GetFeeStats(ctx context.Context, userID uuid.UUID) (*domain.FeeStats, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(*domain.FeeStats), args.Error(1)
}

func TestFeesService_CreateFeeConfig(t *testing.T) {
	mockRepo := new(MockFeesRepository)
	service := NewFeesService(mockRepo)

	ctx := context.Background()
	req := &CreateFeeConfigRequest{
		Name:        "Test Fee Config",
		Description: "Test Description",
		FeeType:     domain.FeeTypeFixed,
		Category:    domain.FeeCategoryCard,
		Amount:      decimal.NewFromFloat(5.0),
		Currency:    "USD",
		IsActive:    true,
		Priority:    1,
		ValidFrom:   time.Now(),
	}

	expectedConfig := &domain.FeeConfig{
		ID:          uuid.New(),
		Name:        req.Name,
		Description: req.Description,
		FeeType:     req.FeeType,
		Category:    req.Category,
		Amount:      req.Amount,
		Currency:    req.Currency,
		IsActive:    req.IsActive,
		Priority:    req.Priority,
		ValidFrom:   req.ValidFrom,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	mockRepo.On("CreateFeeConfig", ctx, mock.AnythingOfType("*domain.FeeConfig")).Return(nil)

	config, err := service.CreateFeeConfig(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, config)
	assert.Equal(t, req.Name, config.Name)
	assert.Equal(t, req.FeeType, config.FeeType)
	assert.Equal(t, req.Category, config.Category)

	mockRepo.AssertExpectations(t)
}

func TestFeesService_CreateFeeConfig_ValidationError(t *testing.T) {
	mockRepo := new(MockFeesRepository)
	service := NewFeesService(mockRepo)

	ctx := context.Background()
	req := &CreateFeeConfigRequest{
		Name: "", // Пустое имя должно вызвать ошибку валидации
	}

	config, err := service.CreateFeeConfig(ctx, req)

	assert.Error(t, err)
	assert.Nil(t, config)
	assert.Contains(t, err.Error(), "validation error")
}

func TestFeesService_CalculateFee(t *testing.T) {
	mockRepo := new(MockFeesRepository)
	service := NewFeesService(mockRepo)

	ctx := context.Background()
	userID := uuid.New()
	req := &domain.FeeCalculationRequest{
		UserID:   userID,
		Category: domain.FeeCategoryCard,
		Amount:   decimal.NewFromFloat(100.0),
		Currency: "USD",
	}

	expectedResponse := &domain.FeeCalculationResponse{
		FeeAmount:     decimal.NewFromFloat(5.0),
		FeePercentage: decimal.NewFromFloat(5.0),
		TotalAmount:   decimal.NewFromFloat(105.0),
		NetAmount:     decimal.NewFromFloat(100.0),
		Calculation: map[string]interface{}{
			"base_amount":    req.Amount,
			"fee_type":       "fixed",
			"fee_amount":     decimal.NewFromFloat(5.0),
			"fee_percentage": decimal.NewFromFloat(5.0),
			"total_amount":   decimal.NewFromFloat(105.0),
		},
	}

	mockRepo.On("CalculateFee", ctx, req).Return(expectedResponse, nil)
	mockRepo.On("CreateFeeCalculation", ctx, mock.AnythingOfType("*domain.FeeCalculation")).Return(nil)

	response, err := service.CalculateFee(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, response)
	assert.Equal(t, expectedResponse.FeeAmount, response.FeeAmount)
	assert.Equal(t, expectedResponse.TotalAmount, response.TotalAmount)

	mockRepo.AssertExpectations(t)
}

func TestFeesService_CalculateSpread(t *testing.T) {
	mockRepo := new(MockFeesRepository)
	service := NewFeesService(mockRepo)

	ctx := context.Background()
	userID := uuid.New()
	req := &domain.SpreadCalculationRequest{
		UserID:       userID,
		FromCurrency: "USD",
		ToCurrency:   "EUR",
		Amount:       decimal.NewFromFloat(100.0),
	}

	expectedResponse := &domain.SpreadCalculationResponse{
		ExchangeRate: decimal.NewFromFloat(0.85),
		Spread:       decimal.NewFromFloat(2.0),
		SpreadAmount: decimal.NewFromFloat(2.0),
		FinalAmount:  decimal.NewFromFloat(83.3),
		Calculation: map[string]interface{}{
			"base_rate":     decimal.NewFromFloat(0.85),
			"spread":        decimal.NewFromFloat(2.0),
			"spread_amount": decimal.NewFromFloat(2.0),
			"final_amount":  decimal.NewFromFloat(83.3),
		},
	}

	mockRepo.On("CalculateSpread", ctx, req).Return(expectedResponse, nil)
	mockRepo.On("CreateSpreadCalculation", ctx, mock.AnythingOfType("*domain.SpreadCalculation")).Return(nil)

	response, err := service.CalculateSpread(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, response)
	assert.Equal(t, expectedResponse.ExchangeRate, response.ExchangeRate)
	assert.Equal(t, expectedResponse.Spread, response.Spread)
	assert.Equal(t, expectedResponse.FinalAmount, response.FinalAmount)

	mockRepo.AssertExpectations(t)
}

func TestFeesService_GetFeeStats(t *testing.T) {
	mockRepo := new(MockFeesRepository)
	service := NewFeesService(mockRepo)

	ctx := context.Background()
	userID := uuid.New()

	expectedStats := &domain.FeeStats{
		UserID:            userID,
		TotalFees:         decimal.NewFromFloat(50.0),
		TotalTransactions: 10,
		AverageFee:        decimal.NewFromFloat(5.0),
		FeeByCategory:     make(map[string]decimal.Decimal),
		FeeByCurrency:     make(map[string]decimal.Decimal),
		LastUpdated:       time.Now(),
	}

	mockRepo.On("GetFeeStats", ctx, userID).Return(expectedStats, nil)

	stats, err := service.GetFeeStats(ctx, userID)

	assert.NoError(t, err)
	assert.NotNil(t, stats)
	assert.Equal(t, expectedStats.UserID, stats.UserID)
	assert.Equal(t, expectedStats.TotalFees, stats.TotalFees)
	assert.Equal(t, expectedStats.TotalTransactions, stats.TotalTransactions)

	mockRepo.AssertExpectations(t)
}

func TestFeesService_UpdateFeeConfig(t *testing.T) {
	mockRepo := new(MockFeesRepository)
	service := NewFeesService(mockRepo)

	ctx := context.Background()
	configID := uuid.New()

	existingConfig := &domain.FeeConfig{
		ID:          configID,
		Name:        "Old Name",
		Description: "Old Description",
		FeeType:     domain.FeeTypeFixed,
		Category:    domain.FeeCategoryCard,
		Amount:      decimal.NewFromFloat(5.0),
		Currency:    "USD",
		IsActive:    true,
		Priority:    1,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	req := &UpdateFeeConfigRequest{
		Name:        "New Name",
		Description: "New Description",
		Amount:      &[]decimal.Decimal{decimal.NewFromFloat(10.0)}[0],
		Priority:    &[]int{2}[0],
		IsActive:    &[]bool{false}[0],
	}

	updatedConfig := *existingConfig
	updatedConfig.Name = req.Name
	updatedConfig.Description = req.Description
	updatedConfig.Amount = *req.Amount
	updatedConfig.Priority = *req.Priority
	updatedConfig.IsActive = *req.IsActive

	mockRepo.On("GetFeeConfigByID", ctx, configID).Return(existingConfig, nil)
	mockRepo.On("UpdateFeeConfig", ctx, mock.AnythingOfType("*domain.FeeConfig")).Return(nil)

	config, err := service.UpdateFeeConfig(ctx, configID, req)

	assert.NoError(t, err)
	assert.NotNil(t, config)
	assert.Equal(t, req.Name, config.Name)
	assert.Equal(t, req.Description, config.Description)
	assert.Equal(t, *req.Amount, config.Amount)
	assert.Equal(t, *req.Priority, config.Priority)
	assert.Equal(t, *req.IsActive, config.IsActive)

	mockRepo.AssertExpectations(t)
}

func TestFeesService_DeleteFeeConfig(t *testing.T) {
	mockRepo := new(MockFeesRepository)
	service := NewFeesService(mockRepo)

	ctx := context.Background()
	configID := uuid.New()

	existingConfig := &domain.FeeConfig{
		ID:          configID,
		Name:        "Test Config",
		Description: "Test Description",
		FeeType:     domain.FeeTypeFixed,
		Category:    domain.FeeCategoryCard,
		Amount:      decimal.NewFromFloat(5.0),
		Currency:    "USD",
		IsActive:    true,
		Priority:    1,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	mockRepo.On("GetFeeConfigByID", ctx, configID).Return(existingConfig, nil)
	mockRepo.On("DeleteFeeConfig", ctx, configID).Return(nil)

	err := service.DeleteFeeConfig(ctx, configID)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}
