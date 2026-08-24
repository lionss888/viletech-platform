package dataaccess

import (
	"context"
	"fmt"
	"time"

	"amg-flow-backend/internal/domain"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// LimitsRepository интерфейс для работы с лимитами
type LimitsRepository interface {
	// LimitConfig методы
	CreateLimitConfig(ctx context.Context, limit *domain.LimitConfig) error
	GetLimitConfig(ctx context.Context, id uuid.UUID) (*domain.LimitConfig, error)
	GetLimitConfigsByUser(ctx context.Context, userID uuid.UUID) ([]*domain.LimitConfig, error)
	GetActiveLimitConfigsByUser(ctx context.Context, userID uuid.UUID) ([]*domain.LimitConfig, error)
	UpdateLimitConfig(ctx context.Context, limit *domain.LimitConfig) error
	DeleteLimitConfig(ctx context.Context, id uuid.UUID) error

	// LimitUsage методы
	CreateLimitUsage(ctx context.Context, usage *domain.LimitUsage) error
	GetLimitUsage(ctx context.Context, userID uuid.UUID, limitID uuid.UUID, period string) (*domain.LimitUsage, error)
	GetLimitUsagesByUser(ctx context.Context, userID uuid.UUID, period string) ([]*domain.LimitUsage, error)
	UpdateLimitUsage(ctx context.Context, usage *domain.LimitUsage) error
	GetLimitStats(ctx context.Context, userID uuid.UUID) (*domain.LimitStats, error)

	// Проверка лимитов
	CheckLimits(ctx context.Context, req *domain.LimitCheckRequest) (*domain.LimitCheckResponse, error)
	GetRemainingLimits(ctx context.Context, userID uuid.UUID, category domain.LimitCategory) ([]*domain.LimitInfo, error)
}

// limitsRepository реализация репозитория лимитов
type limitsRepository struct {
	db *gorm.DB
}

// NewLimitsRepository создает новый репозиторий лимитов
func NewLimitsRepository(db *gorm.DB) LimitsRepository {
	return &limitsRepository{db: db}
}

// CreateLimitConfig создает новый лимит
func (r *limitsRepository) CreateLimitConfig(ctx context.Context, limit *domain.LimitConfig) error {
	return r.db.WithContext(ctx).Create(limit).Error
}

// GetLimitConfig получает лимит по ID
func (r *limitsRepository) GetLimitConfig(ctx context.Context, id uuid.UUID) (*domain.LimitConfig, error) {
	var limit domain.LimitConfig
	err := r.db.WithContext(ctx).Preload("User").First(&limit, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &limit, nil
}

// GetLimitConfigsByUser получает все лимиты пользователя
func (r *limitsRepository) GetLimitConfigsByUser(ctx context.Context, userID uuid.UUID) ([]*domain.LimitConfig, error) {
	var limits []*domain.LimitConfig
	err := r.db.WithContext(ctx).Preload("User").Where("user_id = ?", userID).Find(&limits).Error
	return limits, err
}

// GetActiveLimitConfigsByUser получает активные лимиты пользователя
func (r *limitsRepository) GetActiveLimitConfigsByUser(ctx context.Context, userID uuid.UUID) ([]*domain.LimitConfig, error) {
	var limits []*domain.LimitConfig
	err := r.db.WithContext(ctx).Preload("User").Where("user_id = ? AND is_active = ?", userID, true).Find(&limits).Error
	return limits, err
}

// UpdateLimitConfig обновляет лимит
func (r *limitsRepository) UpdateLimitConfig(ctx context.Context, limit *domain.LimitConfig) error {
	return r.db.WithContext(ctx).Save(limit).Error
}

// DeleteLimitConfig удаляет лимит
func (r *limitsRepository) DeleteLimitConfig(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.LimitConfig{}, "id = ?", id).Error
}

// CreateLimitUsage создает запись об использовании лимита
func (r *limitsRepository) CreateLimitUsage(ctx context.Context, usage *domain.LimitUsage) error {
	return r.db.WithContext(ctx).Create(usage).Error
}

// GetLimitUsage получает использование лимита
func (r *limitsRepository) GetLimitUsage(ctx context.Context, userID uuid.UUID, limitID uuid.UUID, period string) (*domain.LimitUsage, error) {
	var usage domain.LimitUsage
	err := r.db.WithContext(ctx).Preload("Limit").Preload("User").
		Where("user_id = ? AND limit_id = ? AND period = ?", userID, limitID, period).
		First(&usage).Error
	if err != nil {
		return nil, err
	}
	return &usage, nil
}

// GetLimitUsagesByUser получает использование лимитов пользователя за период
func (r *limitsRepository) GetLimitUsagesByUser(ctx context.Context, userID uuid.UUID, period string) ([]*domain.LimitUsage, error) {
	var usages []*domain.LimitUsage
	err := r.db.WithContext(ctx).Preload("Limit").Preload("User").
		Where("user_id = ? AND period = ?", userID, period).
		Find(&usages).Error
	return usages, err
}

// UpdateLimitUsage обновляет использование лимита
func (r *limitsRepository) UpdateLimitUsage(ctx context.Context, usage *domain.LimitUsage) error {
	return r.db.WithContext(ctx).Save(usage).Error
}

// GetLimitStats получает статистику по лимитам пользователя
func (r *limitsRepository) GetLimitStats(ctx context.Context, userID uuid.UUID) (*domain.LimitStats, error) {
	var stats domain.LimitStats
	stats.UserID = userID

	// Подсчитываем общее количество лимитов
	var totalLimits int64
	err := r.db.WithContext(ctx).Model(&domain.LimitConfig{}).Where("user_id = ?", userID).Count(&totalLimits).Error
	if err != nil {
		return nil, err
	}
	stats.TotalLimits = int(totalLimits)

	// Подсчитываем активные лимиты
	var activeLimits int64
	err = r.db.WithContext(ctx).Model(&domain.LimitConfig{}).Where("user_id = ? AND is_active = ?", userID, true).Count(&activeLimits).Error
	if err != nil {
		return nil, err
	}
	stats.ActiveLimits = int(activeLimits)

	// Подсчитываем общее использование
	var totalUsed decimal.Decimal
	err = r.db.WithContext(ctx).Model(&domain.LimitUsage{}).
		Select("COALESCE(SUM(used_amount), 0)").
		Where("user_id = ?", userID).
		Scan(&totalUsed).Error
	if err != nil {
		return nil, err
	}
	stats.TotalUsed = totalUsed

	// Подсчитываем нарушения (пока упрощенно)
	stats.Violations = 0 // TODO: реализовать подсчет нарушений
	stats.LastUpdated = time.Now()

	return &stats, nil
}

// CheckLimits проверяет лимиты для операции
func (r *limitsRepository) CheckLimits(ctx context.Context, req *domain.LimitCheckRequest) (*domain.LimitCheckResponse, error) {
	response := &domain.LimitCheckResponse{
		Allowed:    true,
		Remaining:  decimal.Zero,
		ExceededBy: decimal.Zero,
		Limits:     []domain.LimitInfo{},
		Violations: []domain.LimitViolation{},
	}

	// Получаем активные лимиты пользователя
	limits, err := r.GetActiveLimitConfigsByUser(ctx, req.UserID)
	if err != nil {
		return nil, err
	}

	// Фильтруем лимиты по категории и другим параметрам
	applicableLimits := r.filterApplicableLimits(limits, req)

	// Проверяем каждый применимый лимит
	for _, limit := range applicableLimits {
		period := r.getPeriodForLimit(limit.LimitType)

		// Получаем текущее использование
		usage, err := r.GetLimitUsage(ctx, req.UserID, limit.ID, period)
		if err != nil && err != gorm.ErrRecordNotFound {
			return nil, err
		}

		var usedAmount decimal.Decimal
		if usage != nil {
			usedAmount = usage.UsedAmount
		}

		// Проверяем, не превышен ли лимит
		newUsedAmount := usedAmount.Add(req.Amount)
		if newUsedAmount.GreaterThan(limit.Amount) {
			// Лимит превышен
			response.Allowed = false
			exceededBy := newUsedAmount.Sub(limit.Amount)
			response.ExceededBy = response.ExceededBy.Add(exceededBy)

			violation := domain.LimitViolation{
				LimitID:     limit.ID,
				LimitType:   limit.LimitType,
				Category:    limit.Category,
				Amount:      limit.Amount,
				UsedAmount:  newUsedAmount,
				ExceededBy:  exceededBy,
				Period:      period,
				Description: "Лимит превышен",
			}
			response.Violations = append(response.Violations, violation)
		}

		// Добавляем информацию о лимите
		limitInfo := domain.LimitInfo{
			LimitID:    limit.ID,
			LimitType:  limit.LimitType,
			Category:   limit.Category,
			Amount:     limit.Amount,
			UsedAmount: usedAmount,
			Remaining:  limit.Amount.Sub(usedAmount),
			Period:     period,
		}
		response.Limits = append(response.Limits, limitInfo)
	}

	// Вычисляем общий остаток
	if len(response.Limits) > 0 {
		response.Remaining = response.Limits[0].Remaining
		for _, limit := range response.Limits[1:] {
			if limit.Remaining.LessThan(response.Remaining) {
				response.Remaining = limit.Remaining
			}
		}
	}

	return response, nil
}

// GetRemainingLimits получает оставшиеся лимиты пользователя
func (r *limitsRepository) GetRemainingLimits(ctx context.Context, userID uuid.UUID, category domain.LimitCategory) ([]*domain.LimitInfo, error) {
	limits, err := r.GetActiveLimitConfigsByUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	var result []*domain.LimitInfo
	for _, limit := range limits {
		if category != "" && limit.Category != category {
			continue
		}

		period := r.getPeriodForLimit(limit.LimitType)
		usage, err := r.GetLimitUsage(ctx, userID, limit.ID, period)
		if err != nil && err != gorm.ErrRecordNotFound {
			return nil, err
		}

		var usedAmount decimal.Decimal
		if usage != nil {
			usedAmount = usage.UsedAmount
		}

		limitInfo := &domain.LimitInfo{
			LimitID:    limit.ID,
			LimitType:  limit.LimitType,
			Category:   limit.Category,
			Amount:     limit.Amount,
			UsedAmount: usedAmount,
			Remaining:  limit.Amount.Sub(usedAmount),
			Period:     period,
		}
		result = append(result, limitInfo)
	}

	return result, nil
}

// filterApplicableLimits фильтрует лимиты, применимые к запросу
func (r *limitsRepository) filterApplicableLimits(limits []*domain.LimitConfig, req *domain.LimitCheckRequest) []*domain.LimitConfig {
	var applicable []*domain.LimitConfig

	for _, limit := range limits {
		// Проверяем категорию
		if limit.Category != req.Category {
			continue
		}

		// Проверяем валюту
		if limit.Currency != req.Currency {
			continue
		}

		// Проверяем страну (если указана)
		if limit.Country != "" && req.Country != "" && limit.Country != req.Country {
			continue
		}

		// Проверяем MCC (если указан)
		if limit.MCC != "" && req.MCC != "" && limit.MCC != req.MCC {
			continue
		}

		applicable = append(applicable, limit)
	}

	return applicable
}

// getPeriodForLimit возвращает период для лимита
func (r *limitsRepository) getPeriodForLimit(limitType domain.LimitType) string {
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
