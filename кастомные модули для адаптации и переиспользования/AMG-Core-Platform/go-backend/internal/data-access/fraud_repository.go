package dataaccess

import (
	"context"
	"time"

	"amg-flow-backend/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// FraudRepository интерфейс для работы с фрод-контролем
type FraudRepository interface {
	// FraudRule методы
	CreateFraudRule(ctx context.Context, rule *domain.FraudRule) error
	GetFraudRuleByID(ctx context.Context, id uuid.UUID) (*domain.FraudRule, error)
	GetFraudRules(ctx context.Context, ruleType domain.FraudRuleType, isActive bool) ([]domain.FraudRule, error)
	UpdateFraudRule(ctx context.Context, rule *domain.FraudRule) error
	DeleteFraudRule(ctx context.Context, id uuid.UUID) error

	// FraudCheck методы
	CreateFraudCheck(ctx context.Context, check *domain.FraudCheck) error
	GetFraudCheckByID(ctx context.Context, id uuid.UUID) (*domain.FraudCheck, error)
	GetFraudChecksByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]domain.FraudCheck, error)
	GetFraudChecksByTransactionID(ctx context.Context, transactionID uuid.UUID) ([]domain.FraudCheck, error)
	UpdateFraudCheck(ctx context.Context, check *domain.FraudCheck) error

	// FraudEvent методы
	CreateFraudEvent(ctx context.Context, event *domain.FraudEvent) error
	GetFraudEventsByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]domain.FraudEvent, error)
	GetFraudEventsByType(ctx context.Context, eventType string, limit, offset int) ([]domain.FraudEvent, error)
	UpdateFraudEvent(ctx context.Context, event *domain.FraudEvent) error

	// FraudAlert методы
	CreateFraudAlert(ctx context.Context, alert *domain.FraudAlert) error
	GetFraudAlertByID(ctx context.Context, id uuid.UUID) (*domain.FraudAlert, error)
	GetFraudAlertsByUserID(ctx context.Context, userID uuid.UUID, isResolved bool) ([]domain.FraudAlert, error)
	GetActiveFraudAlerts(ctx context.Context, limit, offset int) ([]domain.FraudAlert, error)
	UpdateFraudAlert(ctx context.Context, alert *domain.FraudAlert) error
	ResolveFraudAlert(ctx context.Context, alertID uuid.UUID, resolvedBy uuid.UUID) error

	// Проверка и статистика
	CheckFraudRules(ctx context.Context, req *domain.FraudCheckRequest) (*domain.FraudCheckResponse, error)
	GetFraudStats(ctx context.Context, userID uuid.UUID) (*domain.FraudStats, error)
	GetFraudStatsByPeriod(ctx context.Context, startDate, endDate time.Time) (*domain.FraudStats, error)
}

// GormFraudRepository реализация FraudRepository с использованием GORM
type GormFraudRepository struct {
	db *gorm.DB
}

// NewGormFraudRepository создает новый GormFraudRepository
func NewGormFraudRepository(db *gorm.DB) *GormFraudRepository {
	return &GormFraudRepository{db: db}
}

// CreateFraudRule создает новое правило фрод-контроля
func (r *GormFraudRepository) CreateFraudRule(ctx context.Context, rule *domain.FraudRule) error {
	return r.db.WithContext(ctx).Create(rule).Error
}

// GetFraudRuleByID получает правило по ID
func (r *GormFraudRepository) GetFraudRuleByID(ctx context.Context, id uuid.UUID) (*domain.FraudRule, error) {
	var rule domain.FraudRule
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&rule).Error
	if err != nil {
		return nil, err
	}
	return &rule, nil
}

// GetFraudRules получает правила с фильтрацией
func (r *GormFraudRepository) GetFraudRules(ctx context.Context, ruleType domain.FraudRuleType, isActive bool) ([]domain.FraudRule, error) {
	var rules []domain.FraudRule
	query := r.db.WithContext(ctx)

	if ruleType != "" {
		query = query.Where("rule_type = ?", ruleType)
	}
	if isActive {
		query = query.Where("is_active = ?", true)
	}

	err := query.Order("priority DESC, created_at DESC").Find(&rules).Error
	return rules, err
}

// UpdateFraudRule обновляет правило
func (r *GormFraudRepository) UpdateFraudRule(ctx context.Context, rule *domain.FraudRule) error {
	return r.db.WithContext(ctx).Save(rule).Error
}

// DeleteFraudRule удаляет правило
func (r *GormFraudRepository) DeleteFraudRule(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&domain.FraudRule{}).Error
}

// CreateFraudCheck создает проверку фрод-контроля
func (r *GormFraudRepository) CreateFraudCheck(ctx context.Context, check *domain.FraudCheck) error {
	return r.db.WithContext(ctx).Create(check).Error
}

// GetFraudCheckByID получает проверку по ID
func (r *GormFraudRepository) GetFraudCheckByID(ctx context.Context, id uuid.UUID) (*domain.FraudCheck, error) {
	var check domain.FraudCheck
	err := r.db.WithContext(ctx).Preload("User").Preload("Rule").Where("id = ?", id).First(&check).Error
	if err != nil {
		return nil, err
	}
	return &check, nil
}

// GetFraudChecksByUserID получает проверки пользователя
func (r *GormFraudRepository) GetFraudChecksByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]domain.FraudCheck, error) {
	var checks []domain.FraudCheck
	query := r.db.WithContext(ctx).Preload("Rule").Where("user_id = ?", userID)

	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	err := query.Order("created_at DESC").Find(&checks).Error
	return checks, err
}

// GetFraudChecksByTransactionID получает проверки по транзакции
func (r *GormFraudRepository) GetFraudChecksByTransactionID(ctx context.Context, transactionID uuid.UUID) ([]domain.FraudCheck, error) {
	var checks []domain.FraudCheck
	err := r.db.WithContext(ctx).Preload("Rule").Where("transaction_id = ?", transactionID).Find(&checks).Error
	return checks, err
}

// UpdateFraudCheck обновляет проверку
func (r *GormFraudRepository) UpdateFraudCheck(ctx context.Context, check *domain.FraudCheck) error {
	return r.db.WithContext(ctx).Save(check).Error
}

// CreateFraudEvent создает событие фрод-контроля
func (r *GormFraudRepository) CreateFraudEvent(ctx context.Context, event *domain.FraudEvent) error {
	return r.db.WithContext(ctx).Create(event).Error
}

// GetFraudEventsByUserID получает события пользователя
func (r *GormFraudRepository) GetFraudEventsByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]domain.FraudEvent, error) {
	var events []domain.FraudEvent
	query := r.db.WithContext(ctx).Where("user_id = ?", userID)

	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	err := query.Order("created_at DESC").Find(&events).Error
	return events, err
}

// GetFraudEventsByType получает события по типу
func (r *GormFraudRepository) GetFraudEventsByType(ctx context.Context, eventType string, limit, offset int) ([]domain.FraudEvent, error) {
	var events []domain.FraudEvent
	query := r.db.WithContext(ctx).Where("event_type = ?", eventType)

	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	err := query.Order("created_at DESC").Find(&events).Error
	return events, err
}

// UpdateFraudEvent обновляет событие
func (r *GormFraudRepository) UpdateFraudEvent(ctx context.Context, event *domain.FraudEvent) error {
	return r.db.WithContext(ctx).Save(event).Error
}

// CreateFraudAlert создает алерт
func (r *GormFraudRepository) CreateFraudAlert(ctx context.Context, alert *domain.FraudAlert) error {
	return r.db.WithContext(ctx).Create(alert).Error
}

// GetFraudAlertByID получает алерт по ID
func (r *GormFraudRepository) GetFraudAlertByID(ctx context.Context, id uuid.UUID) (*domain.FraudAlert, error) {
	var alert domain.FraudAlert
	err := r.db.WithContext(ctx).Preload("User").Where("id = ?", id).First(&alert).Error
	if err != nil {
		return nil, err
	}
	return &alert, nil
}

// GetFraudAlertsByUserID получает алерты пользователя
func (r *GormFraudRepository) GetFraudAlertsByUserID(ctx context.Context, userID uuid.UUID, isResolved bool) ([]domain.FraudAlert, error) {
	var alerts []domain.FraudAlert
	query := r.db.WithContext(ctx).Where("user_id = ?", userID)

	if isResolved {
		query = query.Where("is_resolved = ?", true)
	} else {
		query = query.Where("is_resolved = ?", false)
	}

	err := query.Order("created_at DESC").Find(&alerts).Error
	return alerts, err
}

// GetActiveFraudAlerts получает активные алерты
func (r *GormFraudRepository) GetActiveFraudAlerts(ctx context.Context, limit, offset int) ([]domain.FraudAlert, error) {
	var alerts []domain.FraudAlert
	query := r.db.WithContext(ctx).Preload("User").Where("is_resolved = ?", false)

	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	err := query.Order("created_at DESC").Find(&alerts).Error
	return alerts, err
}

// UpdateFraudAlert обновляет алерт
func (r *GormFraudRepository) UpdateFraudAlert(ctx context.Context, alert *domain.FraudAlert) error {
	return r.db.WithContext(ctx).Save(alert).Error
}

// ResolveFraudAlert разрешает алерт
func (r *GormFraudRepository) ResolveFraudAlert(ctx context.Context, alertID uuid.UUID, resolvedBy uuid.UUID) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&domain.FraudAlert{}).
		Where("id = ?", alertID).
		Updates(map[string]interface{}{
			"is_resolved": true,
			"resolved_at": &now,
			"resolved_by": &resolvedBy,
		}).Error
}

// CheckFraudRules проверяет правила фрод-контроля
func (r *GormFraudRepository) CheckFraudRules(ctx context.Context, req *domain.FraudCheckRequest) (*domain.FraudCheckResponse, error) {
	// Получаем активные правила
	rules, err := r.GetFraudRules(ctx, "", true)
	if err != nil {
		return nil, err
	}

	response := &domain.FraudCheckResponse{
		Allowed:         true,
		RiskScore:       0,
		RiskLevel:       domain.FraudRiskLevelLow,
		Status:          domain.FraudStatusApproved,
		Rules:           []domain.FraudRuleInfo{},
		Violations:      []domain.FraudViolation{},
		Recommendations: []string{},
	}

	// Проверяем каждое правило
	for _, rule := range rules {
		// Здесь должна быть логика проверки условий правила
		// Пока что упрощенная версия
		ruleInfo := domain.FraudRuleInfo{
			RuleID:      rule.ID,
			RuleName:    rule.Name,
			RuleType:    rule.RuleType,
			RiskLevel:   rule.RiskLevel,
			Score:       0, // Должен рассчитываться на основе условий
			Description: rule.Description,
		}

		response.Rules = append(response.Rules, ruleInfo)
	}

	// Определяем общий риск-скор и статус
	if response.RiskScore >= 80 {
		response.RiskLevel = domain.FraudRiskLevelCritical
		response.Status = domain.FraudStatusBlocked
		response.Allowed = false
	} else if response.RiskScore >= 60 {
		response.RiskLevel = domain.FraudRiskLevelHigh
		response.Status = domain.FraudStatusReview
	} else if response.RiskScore >= 40 {
		response.RiskLevel = domain.FraudRiskLevelMedium
		response.Status = domain.FraudStatusReview
	} else {
		response.RiskLevel = domain.FraudRiskLevelLow
		response.Status = domain.FraudStatusApproved
	}

	return response, nil
}

// GetFraudStats получает статистику фрод-контроля для пользователя
func (r *GormFraudRepository) GetFraudStats(ctx context.Context, userID uuid.UUID) (*domain.FraudStats, error) {
	var stats domain.FraudStats
	stats.UserID = userID

	// Подсчитываем проверки
	var totalChecks int64
	err := r.db.WithContext(ctx).Model(&domain.FraudCheck{}).
		Where("user_id = ?", userID).
		Count(&totalChecks).Error
	if err != nil {
		return nil, err
	}
	stats.TotalChecks = int(totalChecks)

	// Подсчитываем заблокированные проверки
	var blockedChecks int64
	err = r.db.WithContext(ctx).Model(&domain.FraudCheck{}).
		Where("user_id = ? AND status = ?", userID, domain.FraudStatusBlocked).
		Count(&blockedChecks).Error
	if err != nil {
		return nil, err
	}
	stats.BlockedChecks = int(blockedChecks)

	// Подсчитываем проверки на рассмотрении
	var reviewChecks int64
	err = r.db.WithContext(ctx).Model(&domain.FraudCheck{}).
		Where("user_id = ? AND status = ?", userID, domain.FraudStatusReview).
		Count(&reviewChecks).Error
	if err != nil {
		return nil, err
	}
	stats.ReviewChecks = int(reviewChecks)

	// Подсчитываем одобренные проверки
	var approvedChecks int64
	err = r.db.WithContext(ctx).Model(&domain.FraudCheck{}).
		Where("user_id = ? AND status = ?", userID, domain.FraudStatusApproved).
		Count(&approvedChecks).Error
	if err != nil {
		return nil, err
	}
	stats.ApprovedChecks = int(approvedChecks)

	// Подсчитываем события высокого риска
	var highRiskEvents int64
	err = r.db.WithContext(ctx).Model(&domain.FraudEvent{}).
		Where("user_id = ? AND risk_score >= ?", userID, 70).
		Count(&highRiskEvents).Error
	if err != nil {
		return nil, err
	}
	stats.HighRiskEvents = int(highRiskEvents)

	// Подсчитываем активные алерты
	var activeAlerts int64
	err = r.db.WithContext(ctx).Model(&domain.FraudAlert{}).
		Where("user_id = ? AND is_resolved = ?", userID, false).
		Count(&activeAlerts).Error
	if err != nil {
		return nil, err
	}
	stats.ActiveAlerts = int(activeAlerts)

	// Рассчитываем средний риск-скор
	var avgScore float64
	err = r.db.WithContext(ctx).Model(&domain.FraudCheck{}).
		Where("user_id = ?", userID).
		Select("AVG(risk_score)").Scan(&avgScore).Error
	if err != nil {
		return nil, err
	}
	stats.AverageRiskScore = avgScore

	stats.LastUpdated = time.Now()

	return &stats, nil
}

// GetFraudStatsByPeriod получает статистику за период
func (r *GormFraudRepository) GetFraudStatsByPeriod(ctx context.Context, startDate, endDate time.Time) (*domain.FraudStats, error) {
	var stats domain.FraudStats

	// Подсчитываем проверки за период
	var totalChecks int64
	err := r.db.WithContext(ctx).Model(&domain.FraudCheck{}).
		Where("created_at BETWEEN ? AND ?", startDate, endDate).
		Count(&totalChecks).Error
	if err != nil {
		return nil, err
	}
	stats.TotalChecks = int(totalChecks)

	// Подсчитываем заблокированные проверки за период
	var blockedChecks int64
	err = r.db.WithContext(ctx).Model(&domain.FraudCheck{}).
		Where("created_at BETWEEN ? AND ? AND status = ?", startDate, endDate, domain.FraudStatusBlocked).
		Count(&blockedChecks).Error
	if err != nil {
		return nil, err
	}
	stats.BlockedChecks = int(blockedChecks)

	// Подсчитываем проверки на рассмотрении за период
	var reviewChecks int64
	err = r.db.WithContext(ctx).Model(&domain.FraudCheck{}).
		Where("created_at BETWEEN ? AND ? AND status = ?", startDate, endDate, domain.FraudStatusReview).
		Count(&reviewChecks).Error
	if err != nil {
		return nil, err
	}
	stats.ReviewChecks = int(reviewChecks)

	// Подсчитываем одобренные проверки за период
	var approvedChecks int64
	err = r.db.WithContext(ctx).Model(&domain.FraudCheck{}).
		Where("created_at BETWEEN ? AND ? AND status = ?", startDate, endDate, domain.FraudStatusApproved).
		Count(&approvedChecks).Error
	if err != nil {
		return nil, err
	}
	stats.ApprovedChecks = int(approvedChecks)

	// Подсчитываем события высокого риска за период
	var highRiskEvents int64
	err = r.db.WithContext(ctx).Model(&domain.FraudEvent{}).
		Where("created_at BETWEEN ? AND ? AND risk_score >= ?", startDate, endDate, 70).
		Count(&highRiskEvents).Error
	if err != nil {
		return nil, err
	}
	stats.HighRiskEvents = int(highRiskEvents)

	// Подсчитываем активные алерты за период
	var activeAlerts int64
	err = r.db.WithContext(ctx).Model(&domain.FraudAlert{}).
		Where("created_at BETWEEN ? AND ? AND is_resolved = ?", startDate, endDate, false).
		Count(&activeAlerts).Error
	if err != nil {
		return nil, err
	}
	stats.ActiveAlerts = int(activeAlerts)

	// Рассчитываем средний риск-скор за период
	var avgScore float64
	err = r.db.WithContext(ctx).Model(&domain.FraudCheck{}).
		Where("created_at BETWEEN ? AND ?", startDate, endDate).
		Select("AVG(risk_score)").Scan(&avgScore).Error
	if err != nil {
		return nil, err
	}
	stats.AverageRiskScore = avgScore

	stats.LastUpdated = time.Now()

	return &stats, nil
}
