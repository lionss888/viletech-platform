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

// MockFraudRepository мок репозитория для тестов
type MockFraudRepository struct {
	mock.Mock
}

// CreateFraudRule мок метод
func (m *MockFraudRepository) CreateFraudRule(ctx context.Context, rule *domain.FraudRule) error {
	args := m.Called(ctx, rule)
	return args.Error(0)
}

// GetFraudRuleByID мок метод
func (m *MockFraudRepository) GetFraudRuleByID(ctx context.Context, id uuid.UUID) (*domain.FraudRule, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*domain.FraudRule), args.Error(1)
}

// GetFraudRules мок метод
func (m *MockFraudRepository) GetFraudRules(ctx context.Context, ruleType domain.FraudRuleType, isActive bool) ([]domain.FraudRule, error) {
	args := m.Called(ctx, ruleType, isActive)
	return args.Get(0).([]domain.FraudRule), args.Error(1)
}

// UpdateFraudRule мок метод
func (m *MockFraudRepository) UpdateFraudRule(ctx context.Context, rule *domain.FraudRule) error {
	args := m.Called(ctx, rule)
	return args.Error(0)
}

// DeleteFraudRule мок метод
func (m *MockFraudRepository) DeleteFraudRule(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

// CreateFraudCheck мок метод
func (m *MockFraudRepository) CreateFraudCheck(ctx context.Context, check *domain.FraudCheck) error {
	args := m.Called(ctx, check)
	return args.Error(0)
}

// GetFraudCheckByID мок метод
func (m *MockFraudRepository) GetFraudCheckByID(ctx context.Context, id uuid.UUID) (*domain.FraudCheck, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*domain.FraudCheck), args.Error(1)
}

// GetFraudChecksByUserID мок метод
func (m *MockFraudRepository) GetFraudChecksByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]domain.FraudCheck, error) {
	args := m.Called(ctx, userID, limit, offset)
	return args.Get(0).([]domain.FraudCheck), args.Error(1)
}

// GetFraudChecksByTransactionID мок метод
func (m *MockFraudRepository) GetFraudChecksByTransactionID(ctx context.Context, transactionID uuid.UUID) ([]domain.FraudCheck, error) {
	args := m.Called(ctx, transactionID)
	return args.Get(0).([]domain.FraudCheck), args.Error(1)
}

// UpdateFraudCheck мок метод
func (m *MockFraudRepository) UpdateFraudCheck(ctx context.Context, check *domain.FraudCheck) error {
	args := m.Called(ctx, check)
	return args.Error(0)
}

// CreateFraudEvent мок метод
func (m *MockFraudRepository) CreateFraudEvent(ctx context.Context, event *domain.FraudEvent) error {
	args := m.Called(ctx, event)
	return args.Error(0)
}

// GetFraudEventsByUserID мок метод
func (m *MockFraudRepository) GetFraudEventsByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]domain.FraudEvent, error) {
	args := m.Called(ctx, userID, limit, offset)
	return args.Get(0).([]domain.FraudEvent), args.Error(1)
}

// GetFraudEventsByType мок метод
func (m *MockFraudRepository) GetFraudEventsByType(ctx context.Context, eventType string, limit, offset int) ([]domain.FraudEvent, error) {
	args := m.Called(ctx, eventType, limit, offset)
	return args.Get(0).([]domain.FraudEvent), args.Error(1)
}

// UpdateFraudEvent мок метод
func (m *MockFraudRepository) UpdateFraudEvent(ctx context.Context, event *domain.FraudEvent) error {
	args := m.Called(ctx, event)
	return args.Error(0)
}

// CreateFraudAlert мок метод
func (m *MockFraudRepository) CreateFraudAlert(ctx context.Context, alert *domain.FraudAlert) error {
	args := m.Called(ctx, alert)
	return args.Error(0)
}

// GetFraudAlertByID мок метод
func (m *MockFraudRepository) GetFraudAlertByID(ctx context.Context, id uuid.UUID) (*domain.FraudAlert, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*domain.FraudAlert), args.Error(1)
}

// GetFraudAlertsByUserID мок метод
func (m *MockFraudRepository) GetFraudAlertsByUserID(ctx context.Context, userID uuid.UUID, isResolved bool) ([]domain.FraudAlert, error) {
	args := m.Called(ctx, userID, isResolved)
	return args.Get(0).([]domain.FraudAlert), args.Error(1)
}

// GetActiveFraudAlerts мок метод
func (m *MockFraudRepository) GetActiveFraudAlerts(ctx context.Context, limit, offset int) ([]domain.FraudAlert, error) {
	args := m.Called(ctx, limit, offset)
	return args.Get(0).([]domain.FraudAlert), args.Error(1)
}

// UpdateFraudAlert мок метод
func (m *MockFraudRepository) UpdateFraudAlert(ctx context.Context, alert *domain.FraudAlert) error {
	args := m.Called(ctx, alert)
	return args.Error(0)
}

// ResolveFraudAlert мок метод
func (m *MockFraudRepository) ResolveFraudAlert(ctx context.Context, alertID uuid.UUID, resolvedBy uuid.UUID) error {
	args := m.Called(ctx, alertID, resolvedBy)
	return args.Error(0)
}

// CheckFraudRules мок метод
func (m *MockFraudRepository) CheckFraudRules(ctx context.Context, req *domain.FraudCheckRequest) (*domain.FraudCheckResponse, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(*domain.FraudCheckResponse), args.Error(1)
}

// GetFraudStats мок метод
func (m *MockFraudRepository) GetFraudStats(ctx context.Context, userID uuid.UUID) (*domain.FraudStats, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(*domain.FraudStats), args.Error(1)
}

// GetFraudStatsByPeriod мок метод
func (m *MockFraudRepository) GetFraudStatsByPeriod(ctx context.Context, startDate, endDate time.Time) (*domain.FraudStats, error) {
	args := m.Called(ctx, startDate, endDate)
	return args.Get(0).(*domain.FraudStats), args.Error(1)
}

func TestFraudService_CreateFraudRule(t *testing.T) {
	mockRepo := new(MockFraudRepository)
	service := NewFraudService(mockRepo)

	ctx := context.Background()
	req := &CreateFraudRuleRequest{
		Name:        "Test Rule",
		Description: "Test Description",
		RuleType:    domain.FraudRuleTypeVelocity,
		Conditions:  `{"operator": "and", "conditions": [{"field": "amount", "operator": "gt", "value": 1000}]}`,
		Action:      domain.FraudActionBlock,
		RiskLevel:   domain.FraudRiskLevelHigh,
		Priority:    1,
		IsActive:    true,
	}

	expectedRule := &domain.FraudRule{
		ID:          uuid.New(),
		Name:        req.Name,
		Description: req.Description,
		RuleType:    req.RuleType,
		Conditions:  req.Conditions,
		Action:      req.Action,
		RiskLevel:   req.RiskLevel,
		Priority:    req.Priority,
		IsActive:    req.IsActive,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	mockRepo.On("CreateFraudRule", ctx, mock.AnythingOfType("*domain.FraudRule")).Return(nil)

	rule, err := service.CreateFraudRule(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, rule)
	assert.Equal(t, req.Name, rule.Name)
	assert.Equal(t, req.RuleType, rule.RuleType)
	assert.Equal(t, req.Action, rule.Action)

	mockRepo.AssertExpectations(t)
}

func TestFraudService_CreateFraudRule_ValidationError(t *testing.T) {
	mockRepo := new(MockFraudRepository)
	service := NewFraudService(mockRepo)

	ctx := context.Background()
	req := &CreateFraudRuleRequest{
		Name: "", // Пустое имя должно вызвать ошибку валидации
	}

	rule, err := service.CreateFraudRule(ctx, req)

	assert.Error(t, err)
	assert.Nil(t, rule)
	assert.Contains(t, err.Error(), "validation error")
}

func TestFraudService_CheckFraudRules(t *testing.T) {
	mockRepo := new(MockFraudRepository)
	service := NewFraudService(mockRepo)

	ctx := context.Background()
	userID := uuid.New()
	req := &domain.FraudCheckRequest{
		UserID:    userID,
		EventType: "transaction",
		Amount:    decimal.NewFromFloat(500.0),
		Currency:  "USD",
		Country:   "US",
	}

	expectedResponse := &domain.FraudCheckResponse{
		Allowed:         true,
		RiskScore:       25,
		RiskLevel:       domain.FraudRiskLevelLow,
		Status:          domain.FraudStatusApproved,
		Rules:           []domain.FraudRuleInfo{},
		Violations:      []domain.FraudViolation{},
		Recommendations: []string{},
	}

	mockRepo.On("CheckFraudRules", ctx, req).Return(expectedResponse, nil)
	mockRepo.On("CreateFraudCheck", ctx, mock.AnythingOfType("*domain.FraudCheck")).Return(nil)
	mockRepo.On("CreateFraudEvent", ctx, mock.AnythingOfType("*domain.FraudEvent")).Return(nil)

	response, err := service.CheckFraudRules(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, response)
	assert.True(t, response.Allowed)
	assert.Equal(t, expectedResponse.RiskScore, response.RiskScore)
	assert.Equal(t, expectedResponse.RiskLevel, response.RiskLevel)

	mockRepo.AssertExpectations(t)
}

func TestFraudService_CheckFraudRules_HighRisk(t *testing.T) {
	mockRepo := new(MockFraudRepository)
	service := NewFraudService(mockRepo)

	ctx := context.Background()
	userID := uuid.New()
	req := &domain.FraudCheckRequest{
		UserID:    userID,
		EventType: "transaction",
		Amount:    decimal.NewFromFloat(50000.0),
		Currency:  "USD",
		Country:   "AF", // Высокорисковая страна
	}

	expectedResponse := &domain.FraudCheckResponse{
		Allowed:         false,
		RiskScore:       85,
		RiskLevel:       domain.FraudRiskLevelCritical,
		Status:          domain.FraudStatusBlocked,
		Rules:           []domain.FraudRuleInfo{},
		Violations:      []domain.FraudViolation{},
		Recommendations: []string{},
	}

	mockRepo.On("CheckFraudRules", ctx, req).Return(expectedResponse, nil)
	mockRepo.On("CreateFraudCheck", ctx, mock.AnythingOfType("*domain.FraudCheck")).Return(nil)
	mockRepo.On("CreateFraudEvent", ctx, mock.AnythingOfType("*domain.FraudEvent")).Return(nil)
	mockRepo.On("CreateFraudAlert", ctx, mock.AnythingOfType("*domain.FraudAlert")).Return(nil)

	response, err := service.CheckFraudRules(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, response)
	assert.False(t, response.Allowed)
	assert.Equal(t, expectedResponse.RiskScore, response.RiskScore)
	assert.Equal(t, expectedResponse.RiskLevel, response.RiskLevel)

	mockRepo.AssertExpectations(t)
}

func TestFraudService_GetFraudStats(t *testing.T) {
	mockRepo := new(MockFraudRepository)
	service := NewFraudService(mockRepo)

	ctx := context.Background()
	userID := uuid.New()

	expectedStats := &domain.FraudStats{
		UserID:           userID,
		TotalChecks:      100,
		BlockedChecks:    5,
		ReviewChecks:     10,
		ApprovedChecks:   85,
		AverageRiskScore: 25.5,
		HighRiskEvents:   3,
		ActiveAlerts:     2,
		LastUpdated:      time.Now(),
	}

	mockRepo.On("GetFraudStats", ctx, userID).Return(expectedStats, nil)

	stats, err := service.GetFraudStats(ctx, userID)

	assert.NoError(t, err)
	assert.NotNil(t, stats)
	assert.Equal(t, expectedStats.UserID, stats.UserID)
	assert.Equal(t, expectedStats.TotalChecks, stats.TotalChecks)
	assert.Equal(t, expectedStats.BlockedChecks, stats.BlockedChecks)
	assert.Equal(t, expectedStats.AverageRiskScore, stats.AverageRiskScore)

	mockRepo.AssertExpectations(t)
}

func TestFraudService_ResolveFraudAlert(t *testing.T) {
	mockRepo := new(MockFraudRepository)
	service := NewFraudService(mockRepo)

	ctx := context.Background()
	alertID := uuid.New()
	resolvedBy := uuid.New()

	mockRepo.On("ResolveFraudAlert", ctx, alertID, resolvedBy).Return(nil)

	err := service.ResolveFraudAlert(ctx, alertID, resolvedBy)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestFraudService_UpdateFraudRule(t *testing.T) {
	mockRepo := new(MockFraudRepository)
	service := NewFraudService(mockRepo)

	ctx := context.Background()
	ruleID := uuid.New()

	existingRule := &domain.FraudRule{
		ID:          ruleID,
		Name:        "Old Name",
		Description: "Old Description",
		RuleType:    domain.FraudRuleTypeVelocity,
		Conditions:  `{"operator": "and", "conditions": []}`,
		Action:      domain.FraudActionBlock,
		RiskLevel:   domain.FraudRiskLevelHigh,
		Priority:    1,
		IsActive:    true,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	req := &UpdateFraudRuleRequest{
		Name:        "New Name",
		Description: "New Description",
		Priority:    &[]int{2}[0],
		IsActive:    &[]bool{false}[0],
	}

	updatedRule := *existingRule
	updatedRule.Name = req.Name
	updatedRule.Description = req.Description
	updatedRule.Priority = *req.Priority
	updatedRule.IsActive = *req.IsActive

	mockRepo.On("GetFraudRuleByID", ctx, ruleID).Return(existingRule, nil)
	mockRepo.On("UpdateFraudRule", ctx, mock.AnythingOfType("*domain.FraudRule")).Return(nil)

	rule, err := service.UpdateFraudRule(ctx, ruleID, req)

	assert.NoError(t, err)
	assert.NotNil(t, rule)
	assert.Equal(t, req.Name, rule.Name)
	assert.Equal(t, req.Description, rule.Description)
	assert.Equal(t, *req.Priority, rule.Priority)
	assert.Equal(t, *req.IsActive, rule.IsActive)

	mockRepo.AssertExpectations(t)
}

func TestFraudService_DeleteFraudRule(t *testing.T) {
	mockRepo := new(MockFraudRepository)
	service := NewFraudService(mockRepo)

	ctx := context.Background()
	ruleID := uuid.New()

	existingRule := &domain.FraudRule{
		ID:          ruleID,
		Name:        "Test Rule",
		Description: "Test Description",
		RuleType:    domain.FraudRuleTypeVelocity,
		Conditions:  `{"operator": "and", "conditions": []}`,
		Action:      domain.FraudActionBlock,
		RiskLevel:   domain.FraudRiskLevelHigh,
		Priority:    1,
		IsActive:    true,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	mockRepo.On("GetFraudRuleByID", ctx, ruleID).Return(existingRule, nil)
	mockRepo.On("DeleteFraudRule", ctx, ruleID).Return(nil)

	err := service.DeleteFraudRule(ctx, ruleID)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}
