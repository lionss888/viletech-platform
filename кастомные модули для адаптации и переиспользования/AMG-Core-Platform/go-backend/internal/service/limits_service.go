package service

import (
	"context"
	"fmt"
	"time"

	"amg-flow-backend/internal/data-access"
	"amg-flow-backend/internal/domain"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// LimitsService сервис для работы с лимитами
type LimitsService struct {
	limitsRepo dataaccess.LimitsRepository
}

// NewLimitsService создает новый сервис лимитов
func NewLimitsService(limitsRepo dataaccess.LimitsRepository) *LimitsService {
	return &LimitsService{
		limitsRepo: limitsRepo,
	}
}

// CreateLimit создает новый лимит
func (s *LimitsService) CreateLimit(ctx context.Context, req *CreateLimitRequest) (*domain.LimitConfig, error) {
	// Валидация входных данных
	if err := s.validateCreateLimitRequest(req); err != nil {
		return nil, fmt.Errorf("validation error: %w", err)
	}

	// Создаем лимит
	limit := &domain.LimitConfig{
		UserID:      &req.UserID,
		LimitType:   req.LimitType,
		Category:    req.Category,
		Amount:      req.Amount,
		Currency:    req.Currency,
		Country:     req.Country,
		MCC:         req.MCC,
		Description: req.Description,
		IsActive:    true,
		Priority:    req.Priority,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := s.limitsRepo.CreateLimitConfig(ctx, limit); err != nil {
		return nil, fmt.Errorf("failed to create limit: %w", err)
	}

	return limit, nil
}

// GetLimit получает лимит по ID
func (s *LimitsService) GetLimit(ctx context.Context, id uuid.UUID) (*domain.LimitConfig, error) {
	return s.limitsRepo.GetLimitConfig(ctx, id)
}

// GetUserLimits получает все лимиты пользователя
func (s *LimitsService) GetUserLimits(ctx context.Context, userID uuid.UUID) ([]*domain.LimitConfig, error) {
	return s.limitsRepo.GetLimitConfigsByUser(ctx, userID)
}

// GetActiveUserLimits получает активные лимиты пользователя
func (s *LimitsService) GetActiveUserLimits(ctx context.Context, userID uuid.UUID) ([]*domain.LimitConfig, error) {
	return s.limitsRepo.GetActiveLimitConfigsByUser(ctx, userID)
}

// UpdateLimit обновляет лимит
func (s *LimitsService) UpdateLimit(ctx context.Context, id uuid.UUID, req *UpdateLimitRequest) (*domain.LimitConfig, error) {
	// Получаем существующий лимит
	limit, err := s.limitsRepo.GetLimitConfig(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("limit not found: %w", err)
	}

	// Валидация обновления
	if err := s.validateUpdateLimitRequest(req); err != nil {
		return nil, fmt.Errorf("validation error: %w", err)
	}

	// Обновляем поля
	if req.Amount != nil {
		limit.Amount = *req.Amount
	}
	if req.Currency != "" {
		limit.Currency = req.Currency
	}
	if req.Country != nil {
		limit.Country = *req.Country
	}
	if req.MCC != nil {
		limit.MCC = *req.MCC
	}
	if req.Description != nil {
		limit.Description = *req.Description
	}
	if req.IsActive != nil {
		limit.IsActive = *req.IsActive
	}
	if req.Priority != nil {
		limit.Priority = *req.Priority
	}
	limit.UpdatedAt = time.Now()

	if err := s.limitsRepo.UpdateLimitConfig(ctx, limit); err != nil {
		return nil, fmt.Errorf("failed to update limit: %w", err)
	}

	return limit, nil
}

// DeleteLimit удаляет лимит
func (s *LimitsService) DeleteLimit(ctx context.Context, id uuid.UUID) error {
	// Проверяем, что лимит существует
	_, err := s.limitsRepo.GetLimitConfig(ctx, id)
	if err != nil {
		return fmt.Errorf("limit not found: %w", err)
	}

	return s.limitsRepo.DeleteLimitConfig(ctx, id)
}

// CheckLimits проверяет лимиты для операции
func (s *LimitsService) CheckLimits(ctx context.Context, req *domain.LimitCheckRequest) (*domain.LimitCheckResponse, error) {
	// Валидация запроса
	if err := s.validateLimitCheckRequest(req); err != nil {
		return nil, fmt.Errorf("validation error: %w", err)
	}

	// Проверяем лимиты
	response, err := s.limitsRepo.CheckLimits(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to check limits: %w", err)
	}

	return response, nil
}

// RecordLimitUsage записывает использование лимита
func (s *LimitsService) RecordLimitUsage(ctx context.Context, req *RecordLimitUsageRequest) error {
	// Валидация запроса
	if err := s.validateRecordLimitUsageRequest(req); err != nil {
		return fmt.Errorf("validation error: %w", err)
	}

	// Получаем лимит
	limit, err := s.limitsRepo.GetLimitConfig(ctx, req.LimitID)
	if err != nil {
		return fmt.Errorf("limit not found: %w", err)
	}

	// Определяем период
	period := s.getPeriodForLimit(limit.LimitType)

	// Получаем текущее использование
	usage, err := s.limitsRepo.GetLimitUsage(ctx, req.UserID, req.LimitID, period)
	if err != nil && err.Error() != "record not found" {
		return fmt.Errorf("failed to get limit usage: %w", err)
	}

	if usage == nil {
		// Создаем новую запись использования
		usage = &domain.LimitUsage{
			UserID:        req.UserID,
			LimitID:       req.LimitID,
			UsedAmount:    req.Amount,
			Period:        period,
			TransactionID: req.TransactionID,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}
		err = s.limitsRepo.CreateLimitUsage(ctx, usage)
	} else {
		// Обновляем существующую запись
		usage.UsedAmount = usage.UsedAmount.Add(req.Amount)
		usage.UpdatedAt = time.Now()
		if req.TransactionID != nil {
			usage.TransactionID = req.TransactionID
		}
		err = s.limitsRepo.UpdateLimitUsage(ctx, usage)
	}

	if err != nil {
		return fmt.Errorf("failed to record limit usage: %w", err)
	}

	return nil
}

// GetLimitStats получает статистику по лимитам пользователя
func (s *LimitsService) GetLimitStats(ctx context.Context, userID uuid.UUID) (*domain.LimitStats, error) {
	return s.limitsRepo.GetLimitStats(ctx, userID)
}

// GetRemainingLimits получает оставшиеся лимиты пользователя
func (s *LimitsService) GetRemainingLimits(ctx context.Context, userID uuid.UUID, category domain.LimitCategory) ([]*domain.LimitInfo, error) {
	return s.limitsRepo.GetRemainingLimits(ctx, userID, category)
}

// validateCreateLimitRequest валидирует запрос на создание лимита
func (s *LimitsService) validateCreateLimitRequest(req *CreateLimitRequest) error {
	if req.UserID == uuid.Nil {
		return fmt.Errorf("user_id is required")
	}
	if req.Amount.LessThanOrEqual(decimal.Zero) {
		return fmt.Errorf("amount must be positive")
	}
	if req.Currency == "" {
		return fmt.Errorf("currency is required")
	}
	if req.LimitType == "" {
		return fmt.Errorf("limit_type is required")
	}
	if req.Category == "" {
		return fmt.Errorf("category is required")
	}
	return nil
}

// validateUpdateLimitRequest валидирует запрос на обновление лимита
func (s *LimitsService) validateUpdateLimitRequest(req *UpdateLimitRequest) error {
	if req.Amount != nil && req.Amount.LessThanOrEqual(decimal.Zero) {
		return fmt.Errorf("amount must be positive")
	}
	if req.Currency != "" && len(req.Currency) != 3 {
		return fmt.Errorf("currency must be 3 characters")
	}
	return nil
}

// validateLimitCheckRequest валидирует запрос на проверку лимитов
func (s *LimitsService) validateLimitCheckRequest(req *domain.LimitCheckRequest) error {
	if req.UserID == uuid.Nil {
		return fmt.Errorf("user_id is required")
	}
	if req.Amount.LessThanOrEqual(decimal.Zero) {
		return fmt.Errorf("amount must be positive")
	}
	if req.Currency == "" {
		return fmt.Errorf("currency is required")
	}
	if req.Category == "" {
		return fmt.Errorf("category is required")
	}
	return nil
}

// validateRecordLimitUsageRequest валидирует запрос на запись использования лимита
func (s *LimitsService) validateRecordLimitUsageRequest(req *RecordLimitUsageRequest) error {
	if req.UserID == uuid.Nil {
		return fmt.Errorf("user_id is required")
	}
	if req.LimitID == uuid.Nil {
		return fmt.Errorf("limit_id is required")
	}
	if req.Amount.LessThanOrEqual(decimal.Zero) {
		return fmt.Errorf("amount must be positive")
	}
	return nil
}

// getPeriodForLimit возвращает период для лимита
func (s *LimitsService) getPeriodForLimit(limitType domain.LimitType) string {
	now := time.Now()
	switch limitType {
	case domain.LimitTypeDaily:
		return now.Format("2006-01-02")
	case domain.LimitTypeWeekly:
		year, week := now.ISOWeek()
		return fmt.Sprintf("%d-W%02d", year, week)
	case domain.LimitTypeMonthly:
		return now.Format("2006-01")
	case domain.LimitTypeYearly:
		return now.Format("2006")
	default:
		return now.Format("2006-01-02")
	}
}

// CreateLimitRequest запрос на создание лимита
type CreateLimitRequest struct {
	UserID      uuid.UUID            `json:"user_id"`
	LimitType   domain.LimitType     `json:"limit_type"`
	Category    domain.LimitCategory `json:"category"`
	Amount      decimal.Decimal      `json:"amount"`
	Currency    string               `json:"currency"`
	Country     string               `json:"country,omitempty"`
	MCC         string               `json:"mcc,omitempty"`
	Description string               `json:"description,omitempty"`
	Priority    int                  `json:"priority,omitempty"`
}

// UpdateLimitRequest запрос на обновление лимита
type UpdateLimitRequest struct {
	Amount      *decimal.Decimal `json:"amount,omitempty"`
	Currency    string           `json:"currency,omitempty"`
	Country     *string          `json:"country,omitempty"`
	MCC         *string          `json:"mcc,omitempty"`
	Description *string          `json:"description,omitempty"`
	IsActive    *bool            `json:"is_active,omitempty"`
	Priority    *int             `json:"priority,omitempty"`
}

// RecordLimitUsageRequest запрос на запись использования лимита
type RecordLimitUsageRequest struct {
	UserID        uuid.UUID       `json:"user_id"`
	LimitID       uuid.UUID       `json:"limit_id"`
	Amount        decimal.Decimal `json:"amount"`
	TransactionID *uuid.UUID      `json:"transaction_id,omitempty"`
}
