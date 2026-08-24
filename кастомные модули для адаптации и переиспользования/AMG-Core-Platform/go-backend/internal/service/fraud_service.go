package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"amg-flow-backend/internal/data-access"
	"amg-flow-backend/internal/domain"

	"github.com/google/uuid"
)

// FraudService сервис для работы с фрод-контролем
type FraudService struct {
	fraudRepo dataaccess.FraudRepository
}

// CreateFraudRuleRequest представляет запрос на создание правила
type CreateFraudRuleRequest struct {
	Name        string                `json:"name"`
	Description string                `json:"description"`
	RuleType    domain.FraudRuleType  `json:"rule_type"`
	Conditions  string                `json:"conditions"`
	Action      domain.FraudAction    `json:"action"`
	RiskLevel   domain.FraudRiskLevel `json:"risk_level"`
	Priority    int                   `json:"priority"`
	IsActive    bool                  `json:"is_active"`
}

// UpdateFraudRuleRequest представляет запрос на обновление правила
type UpdateFraudRuleRequest struct {
	Name        string                `json:"name,omitempty"`
	Description string                `json:"description,omitempty"`
	RuleType    domain.FraudRuleType  `json:"rule_type,omitempty"`
	Conditions  string                `json:"conditions,omitempty"`
	Action      domain.FraudAction    `json:"action,omitempty"`
	RiskLevel   domain.FraudRiskLevel `json:"risk_level,omitempty"`
	Priority    *int                  `json:"priority,omitempty"`
	IsActive    *bool                 `json:"is_active,omitempty"`
}

// NewFraudService создает новый сервис фрод-контроля
func NewFraudService(fraudRepo dataaccess.FraudRepository) *FraudService {
	return &FraudService{
		fraudRepo: fraudRepo,
	}
}

// CreateFraudRule создает новое правило фрод-контроля
func (s *FraudService) CreateFraudRule(ctx context.Context, req *CreateFraudRuleRequest) (*domain.FraudRule, error) {
	// Валидация входных данных
	if err := s.validateFraudRule(req); err != nil {
		return nil, fmt.Errorf("validation error: %w", err)
	}

	rule := &domain.FraudRule{
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

	if err := s.fraudRepo.CreateFraudRule(ctx, rule); err != nil {
		return nil, fmt.Errorf("failed to create fraud rule: %w", err)
	}

	return rule, nil
}

// GetFraudRuleByID получает правило по ID
func (s *FraudService) GetFraudRuleByID(ctx context.Context, id uuid.UUID) (*domain.FraudRule, error) {
	rule, err := s.fraudRepo.GetFraudRuleByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get fraud rule: %w", err)
	}
	return rule, nil
}

// GetFraudRules получает правила с фильтрацией
func (s *FraudService) GetFraudRules(ctx context.Context, ruleType domain.FraudRuleType, isActive bool) ([]domain.FraudRule, error) {
	rules, err := s.fraudRepo.GetFraudRules(ctx, ruleType, isActive)
	if err != nil {
		return nil, fmt.Errorf("failed to get fraud rules: %w", err)
	}
	return rules, nil
}

// UpdateFraudRule обновляет правило
func (s *FraudService) UpdateFraudRule(ctx context.Context, id uuid.UUID, req *UpdateFraudRuleRequest) (*domain.FraudRule, error) {
	rule, err := s.fraudRepo.GetFraudRuleByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("fraud rule not found: %w", err)
	}

	// Обновляем поля
	if req.Name != "" {
		rule.Name = req.Name
	}
	if req.Description != "" {
		rule.Description = req.Description
	}
	if req.RuleType != "" {
		rule.RuleType = req.RuleType
	}
	if req.Conditions != "" {
		rule.Conditions = req.Conditions
	}
	if req.Action != "" {
		rule.Action = req.Action
	}
	if req.RiskLevel != "" {
		rule.RiskLevel = req.RiskLevel
	}
	if req.Priority != nil {
		rule.Priority = *req.Priority
	}
	if req.IsActive != nil {
		rule.IsActive = *req.IsActive
	}

	rule.UpdatedAt = time.Now()

	if err := s.fraudRepo.UpdateFraudRule(ctx, rule); err != nil {
		return nil, fmt.Errorf("failed to update fraud rule: %w", err)
	}

	return rule, nil
}

// DeleteFraudRule удаляет правило
func (s *FraudService) DeleteFraudRule(ctx context.Context, id uuid.UUID) error {
	// Проверяем, что правило существует
	_, err := s.fraudRepo.GetFraudRuleByID(ctx, id)
	if err != nil {
		return fmt.Errorf("fraud rule not found: %w", err)
	}

	if err := s.fraudRepo.DeleteFraudRule(ctx, id); err != nil {
		return fmt.Errorf("failed to delete fraud rule: %w", err)
	}

	return nil
}

// CheckFraudRules проверяет правила фрод-контроля
func (s *FraudService) CheckFraudRules(ctx context.Context, req *domain.FraudCheckRequest) (*domain.FraudCheckResponse, error) {
	// Получаем ответ от репозитория
	response, err := s.fraudRepo.CheckFraudRules(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to check fraud rules: %w", err)
	}

	// Создаем запись о проверке
	check := &domain.FraudCheck{
		ID:            uuid.New(),
		UserID:        req.UserID,
		TransactionID: req.TransactionID,
		RiskScore:     response.RiskScore,
		Status:        response.Status,
		Details:       s.serializeEventData(req.EventData),
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	// Сохраняем проверку
	if err := s.fraudRepo.CreateFraudCheck(ctx, check); err != nil {
		// Логируем ошибку, но не прерываем процесс
		fmt.Printf("Warning: failed to save fraud check: %v\n", err)
	}

	// Создаем событие фрод-контроля
	event := &domain.FraudEvent{
		ID:        uuid.New(),
		UserID:    req.UserID,
		EventType: req.EventType,
		EventData: s.serializeEventData(req.EventData),
		RiskScore: response.RiskScore,
		Status:    response.Status,
		CreatedAt: time.Now(),
	}

	if err := s.fraudRepo.CreateFraudEvent(ctx, event); err != nil {
		fmt.Printf("Warning: failed to save fraud event: %v\n", err)
	}

	// Создаем алерт, если риск высокий
	if response.RiskLevel == domain.FraudRiskLevelHigh || response.RiskLevel == domain.FraudRiskLevelCritical {
		alert := &domain.FraudAlert{
			ID:          uuid.New(),
			UserID:      req.UserID,
			AlertType:   "fraud_detection",
			Severity:    response.RiskLevel,
			Title:       fmt.Sprintf("Fraud Alert: %s", response.RiskLevel),
			Description: fmt.Sprintf("High risk transaction detected. Risk score: %d", response.RiskScore),
			Data:        s.serializeEventData(req.EventData),
			CreatedAt:   time.Now(),
		}

		if err := s.fraudRepo.CreateFraudAlert(ctx, alert); err != nil {
			fmt.Printf("Warning: failed to create fraud alert: %v\n", err)
		}
	}

	return response, nil
}

// GetFraudChecksByUserID получает проверки пользователя
func (s *FraudService) GetFraudChecksByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]domain.FraudCheck, error) {
	checks, err := s.fraudRepo.GetFraudChecksByUserID(ctx, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get fraud checks: %w", err)
	}
	return checks, nil
}

// GetFraudAlertsByUserID получает алерты пользователя
func (s *FraudService) GetFraudAlertsByUserID(ctx context.Context, userID uuid.UUID, isResolved bool) ([]domain.FraudAlert, error) {
	alerts, err := s.fraudRepo.GetFraudAlertsByUserID(ctx, userID, isResolved)
	if err != nil {
		return nil, fmt.Errorf("failed to get fraud alerts: %w", err)
	}
	return alerts, nil
}

// ResolveFraudAlert разрешает алерт
func (s *FraudService) ResolveFraudAlert(ctx context.Context, alertID uuid.UUID, resolvedBy uuid.UUID) error {
	if err := s.fraudRepo.ResolveFraudAlert(ctx, alertID, resolvedBy); err != nil {
		return fmt.Errorf("failed to resolve fraud alert: %w", err)
	}
	return nil
}

// GetFraudStats получает статистику фрод-контроля
func (s *FraudService) GetFraudStats(ctx context.Context, userID uuid.UUID) (*domain.FraudStats, error) {
	stats, err := s.fraudRepo.GetFraudStats(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get fraud stats: %w", err)
	}
	return stats, nil
}

// GetFraudStatsByPeriod получает статистику за период
func (s *FraudService) GetFraudStatsByPeriod(ctx context.Context, startDate, endDate time.Time) (*domain.FraudStats, error) {
	stats, err := s.fraudRepo.GetFraudStatsByPeriod(ctx, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get fraud stats by period: %w", err)
	}
	return stats, nil
}

// validateFraudRule валидирует правило фрод-контроля
func (s *FraudService) validateFraudRule(req *CreateFraudRuleRequest) error {
	if req.Name == "" {
		return fmt.Errorf("rule name is required")
	}
	if req.RuleType == "" {
		return fmt.Errorf("rule type is required")
	}
	if req.Conditions == "" {
		return fmt.Errorf("rule conditions are required")
	}
	if req.Action == "" {
		return fmt.Errorf("rule action is required")
	}
	if req.RiskLevel == "" {
		return fmt.Errorf("risk level is required")
	}

	// Валидируем JSON условий
	var conditions domain.FraudRuleConditions
	if err := json.Unmarshal([]byte(req.Conditions), &conditions); err != nil {
		return fmt.Errorf("invalid conditions JSON: %w", err)
	}

	return nil
}

// serializeEventData сериализует данные события в JSON
func (s *FraudService) serializeEventData(data map[string]interface{}) string {
	if data == nil {
		return "{}"
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return "{}"
	}

	return string(jsonData)
}
