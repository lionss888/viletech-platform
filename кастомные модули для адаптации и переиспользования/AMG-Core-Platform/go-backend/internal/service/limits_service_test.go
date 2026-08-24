package service

import (
	"context"
	"testing"

	"amg-flow-backend/internal/domain"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockLimitsRepository мок репозитория для тестов
type MockLimitsRepository struct {
	mock.Mock
}

func (m *MockLimitsRepository) CreateLimitConfig(ctx context.Context, limit *domain.LimitConfig) error {
	args := m.Called(ctx, limit)
	return args.Error(0)
}

func (m *MockLimitsRepository) GetLimitConfig(ctx context.Context, id uuid.UUID) (*domain.LimitConfig, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*domain.LimitConfig), args.Error(1)
}

func (m *MockLimitsRepository) GetLimitConfigsByUser(ctx context.Context, userID uuid.UUID) ([]*domain.LimitConfig, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).([]*domain.LimitConfig), args.Error(1)
}

func (m *MockLimitsRepository) GetActiveLimitConfigsByUser(ctx context.Context, userID uuid.UUID) ([]*domain.LimitConfig, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).([]*domain.LimitConfig), args.Error(1)
}

func (m *MockLimitsRepository) UpdateLimitConfig(ctx context.Context, limit *domain.LimitConfig) error {
	args := m.Called(ctx, limit)
	return args.Error(0)
}

func (m *MockLimitsRepository) DeleteLimitConfig(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockLimitsRepository) CreateLimitUsage(ctx context.Context, usage *domain.LimitUsage) error {
	args := m.Called(ctx, usage)
	return args.Error(0)
}

func (m *MockLimitsRepository) GetLimitUsage(ctx context.Context, userID uuid.UUID, limitID uuid.UUID, period string) (*domain.LimitUsage, error) {
	args := m.Called(ctx, userID, limitID, period)
	return args.Get(0).(*domain.LimitUsage), args.Error(1)
}

func (m *MockLimitsRepository) GetLimitUsagesByUser(ctx context.Context, userID uuid.UUID, period string) ([]*domain.LimitUsage, error) {
	args := m.Called(ctx, userID, period)
	return args.Get(0).([]*domain.LimitUsage), args.Error(1)
}

func (m *MockLimitsRepository) UpdateLimitUsage(ctx context.Context, usage *domain.LimitUsage) error {
	args := m.Called(ctx, usage)
	return args.Error(0)
}

func (m *MockLimitsRepository) GetLimitStats(ctx context.Context, userID uuid.UUID) (*domain.LimitStats, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(*domain.LimitStats), args.Error(1)
}

func (m *MockLimitsRepository) CheckLimits(ctx context.Context, req *domain.LimitCheckRequest) (*domain.LimitCheckResponse, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(*domain.LimitCheckResponse), args.Error(1)
}

func (m *MockLimitsRepository) GetRemainingLimits(ctx context.Context, userID uuid.UUID, category domain.LimitCategory) ([]*domain.LimitInfo, error) {
	args := m.Called(ctx, userID, category)
	return args.Get(0).([]*domain.LimitInfo), args.Error(1)
}

func TestLimitsService_CreateLimit(t *testing.T) {
	mockRepo := new(MockLimitsRepository)
	service := NewLimitsService(mockRepo)

	userID := uuid.New()
	amount := decimal.NewFromFloat(1000.0)

	req := &CreateLimitRequest{
		UserID:    userID,
		LimitType: domain.LimitTypeDaily,
		Category:  domain.LimitCategoryCard,
		Amount:    amount,
		Currency:  "USD",
	}

	expectedLimit := &domain.LimitConfig{
		ID:        uuid.New(),
		UserID:    &userID,
		LimitType: domain.LimitTypeDaily,
		Category:  domain.LimitCategoryCard,
		Amount:    amount,
		Currency:  "USD",
		IsActive:  true,
	}

	mockRepo.On("CreateLimitConfig", mock.Anything, mock.AnythingOfType("*domain.LimitConfig")).Return(nil)

	limit, err := service.CreateLimit(context.Background(), req)

	assert.NoError(t, err)
	assert.NotNil(t, limit)
	assert.Equal(t, userID, *limit.UserID)
	assert.Equal(t, domain.LimitTypeDaily, limit.LimitType)
	assert.Equal(t, domain.LimitCategoryCard, limit.Category)
	assert.Equal(t, amount, limit.Amount)
	assert.Equal(t, "USD", limit.Currency)
	assert.True(t, limit.IsActive)

	mockRepo.AssertExpectations(t)
}

func TestLimitsService_CreateLimit_ValidationError(t *testing.T) {
	mockRepo := new(MockLimitsRepository)
	service := NewLimitsService(mockRepo)

	// Тест с пустым UserID
	req := &CreateLimitRequest{
		UserID:    uuid.Nil,
		LimitType: domain.LimitTypeDaily,
		Category:  domain.LimitCategoryCard,
		Amount:    decimal.NewFromFloat(1000.0),
		Currency:  "USD",
	}

	limit, err := service.CreateLimit(context.Background(), req)

	assert.Error(t, err)
	assert.Nil(t, limit)
	assert.Contains(t, err.Error(), "user_id is required")

	// Тест с отрицательной суммой
	req.UserID = uuid.New()
	req.Amount = decimal.NewFromFloat(-100.0)

	limit, err = service.CreateLimit(context.Background(), req)

	assert.Error(t, err)
	assert.Nil(t, limit)
	assert.Contains(t, err.Error(), "amount must be positive")

	// Тест с пустой валютой
	req.Amount = decimal.NewFromFloat(1000.0)
	req.Currency = ""

	limit, err = service.CreateLimit(context.Background(), req)

	assert.Error(t, err)
	assert.Nil(t, limit)
	assert.Contains(t, err.Error(), "currency is required")
}

func TestLimitsService_CheckLimits(t *testing.T) {
	mockRepo := new(MockLimitsRepository)
	service := NewLimitsService(mockRepo)

	userID := uuid.New()
	amount := decimal.NewFromFloat(500.0)

	req := &domain.LimitCheckRequest{
		UserID:   userID,
		Amount:   amount,
		Currency: "USD",
		Category: domain.LimitCategoryCard,
	}

	expectedResponse := &domain.LimitCheckResponse{
		Allowed:    true,
		Remaining:  decimal.NewFromFloat(500.0),
		ExceededBy: decimal.Zero,
		Limits: []domain.LimitInfo{
			{
				LimitID:    uuid.New(),
				LimitType:  domain.LimitTypeDaily,
				Category:   domain.LimitCategoryCard,
				Amount:     decimal.NewFromFloat(1000.0),
				UsedAmount: decimal.NewFromFloat(0.0),
				Remaining:  decimal.NewFromFloat(1000.0),
				Period:     "2024-01-01",
			},
		},
		Violations: []domain.LimitViolation{},
	}

	mockRepo.On("CheckLimits", mock.Anything, req).Return(expectedResponse, nil)

	response, err := service.CheckLimits(context.Background(), req)

	assert.NoError(t, err)
	assert.NotNil(t, response)
	assert.True(t, response.Allowed)
	assert.Equal(t, decimal.NewFromFloat(500.0), response.Remaining)
	assert.Empty(t, response.Violations)
	assert.Len(t, response.Limits, 1)

	mockRepo.AssertExpectations(t)
}

func TestLimitsService_CheckLimits_Exceeded(t *testing.T) {
	mockRepo := new(MockLimitsRepository)
	service := NewLimitsService(mockRepo)

	userID := uuid.New()
	amount := decimal.NewFromFloat(1500.0)

	req := &domain.LimitCheckRequest{
		UserID:   userID,
		Amount:   amount,
		Currency: "USD",
		Category: domain.LimitCategoryCard,
	}

	expectedResponse := &domain.LimitCheckResponse{
		Allowed:    false,
		Remaining:  decimal.Zero,
		ExceededBy: decimal.NewFromFloat(500.0),
		Limits: []domain.LimitInfo{
			{
				LimitID:    uuid.New(),
				LimitType:  domain.LimitTypeDaily,
				Category:   domain.LimitCategoryCard,
				Amount:     decimal.NewFromFloat(1000.0),
				UsedAmount: decimal.NewFromFloat(0.0),
				Remaining:  decimal.NewFromFloat(1000.0),
				Period:     "2024-01-01",
			},
		},
		Violations: []domain.LimitViolation{
			{
				LimitID:     uuid.New(),
				LimitType:   domain.LimitTypeDaily,
				Category:    domain.LimitCategoryCard,
				Amount:      decimal.NewFromFloat(1000.0),
				UsedAmount:  decimal.NewFromFloat(1500.0),
				ExceededBy:  decimal.NewFromFloat(500.0),
				Period:      "2024-01-01",
				Description: "Лимит превышен",
			},
		},
	}

	mockRepo.On("CheckLimits", mock.Anything, req).Return(expectedResponse, nil)

	response, err := service.CheckLimits(context.Background(), req)

	assert.NoError(t, err)
	assert.NotNil(t, response)
	assert.False(t, response.Allowed)
	assert.Equal(t, decimal.NewFromFloat(500.0), response.ExceededBy)
	assert.Len(t, response.Violations, 1)
	assert.Len(t, response.Limits, 1)

	mockRepo.AssertExpectations(t)
}

func TestLimitsService_RecordLimitUsage(t *testing.T) {
	mockRepo := new(MockLimitsRepository)
	service := NewLimitsService(mockRepo)

	userID := uuid.New()
	limitID := uuid.New()
	amount := decimal.NewFromFloat(100.0)
	transactionID := uuid.New()

	req := &RecordLimitUsageRequest{
		UserID:        userID,
		LimitID:       limitID,
		Amount:        amount,
		TransactionID: &transactionID,
	}

	// Мокаем получение лимита
	limit := &domain.LimitConfig{
		ID:        limitID,
		UserID:    &userID,
		LimitType: domain.LimitTypeDaily,
		Category:  domain.LimitCategoryCard,
		Amount:    decimal.NewFromFloat(1000.0),
		Currency:  "USD",
		IsActive:  true,
	}

	mockRepo.On("GetLimitConfig", mock.Anything, limitID).Return(limit, nil)
	mockRepo.On("GetLimitUsage", mock.Anything, userID, limitID, mock.AnythingOfType("string")).Return((*domain.LimitUsage)(nil), assert.AnError)
	mockRepo.On("CreateLimitUsage", mock.Anything, mock.AnythingOfType("*domain.LimitUsage")).Return(nil)

	err := service.RecordLimitUsage(context.Background(), req)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestLimitsService_RecordLimitUsage_UpdateExisting(t *testing.T) {
	mockRepo := new(MockLimitsRepository)
	service := NewLimitsService(mockRepo)

	userID := uuid.New()
	limitID := uuid.New()
	amount := decimal.NewFromFloat(100.0)

	req := &RecordLimitUsageRequest{
		UserID:  userID,
		LimitID: limitID,
		Amount:  amount,
	}

	// Мокаем получение лимита
	limit := &domain.LimitConfig{
		ID:        limitID,
		UserID:    &userID,
		LimitType: domain.LimitTypeDaily,
		Category:  domain.LimitCategoryCard,
		Amount:    decimal.NewFromFloat(1000.0),
		Currency:  "USD",
		IsActive:  true,
	}

	// Мокаем существующее использование
	existingUsage := &domain.LimitUsage{
		ID:         uuid.New(),
		UserID:     userID,
		LimitID:    limitID,
		UsedAmount: decimal.NewFromFloat(200.0),
		Period:     "2024-01-01",
	}

	mockRepo.On("GetLimitConfig", mock.Anything, limitID).Return(limit, nil)
	mockRepo.On("GetLimitUsage", mock.Anything, userID, limitID, mock.AnythingOfType("string")).Return(existingUsage, nil)
	mockRepo.On("UpdateLimitUsage", mock.Anything, mock.AnythingOfType("*domain.LimitUsage")).Return(nil)

	err := service.RecordLimitUsage(context.Background(), req)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestLimitsService_GetLimitStats(t *testing.T) {
	mockRepo := new(MockLimitsRepository)
	service := NewLimitsService(mockRepo)

	userID := uuid.New()

	expectedStats := &domain.LimitStats{
		UserID:         userID,
		TotalLimits:    5,
		ActiveLimits:   3,
		TotalUsed:      decimal.NewFromFloat(1500.0),
		TotalRemaining: decimal.NewFromFloat(3500.0),
		Violations:     1,
	}

	mockRepo.On("GetLimitStats", mock.Anything, userID).Return(expectedStats, nil)

	stats, err := service.GetLimitStats(context.Background(), userID)

	assert.NoError(t, err)
	assert.NotNil(t, stats)
	assert.Equal(t, userID, stats.UserID)
	assert.Equal(t, 5, stats.TotalLimits)
	assert.Equal(t, 3, stats.ActiveLimits)
	assert.Equal(t, decimal.NewFromFloat(1500.0), stats.TotalUsed)
	assert.Equal(t, decimal.NewFromFloat(3500.0), stats.TotalRemaining)
	assert.Equal(t, 1, stats.Violations)

	mockRepo.AssertExpectations(t)
}
