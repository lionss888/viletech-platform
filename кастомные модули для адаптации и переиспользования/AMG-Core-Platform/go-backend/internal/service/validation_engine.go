package service

import (
	"amg-flow-backend/pkg/logger"
	"context"
	"fmt"
	"regexp"
	"strconv"
)

// ValidationEngine движок валидации для бизнес-правил
type ValidationEngine struct {
	logger logger.Logger
}

// NewValidationEngine создает новый движок валидации
func NewValidationEngine(logger logger.Logger) *ValidationEngine {
	return &ValidationEngine{
		logger: logger,
	}
}

// ValidationRule представляет правило валидации
type ValidationRule struct {
	Name         string                 `json:"name"`
	Type         string                 `json:"type"` // required, min, max, pattern, custom
	Value        interface{}            `json:"value"`
	Message      string                 `json:"message"`
	Condition    string                 `json:"condition,omitempty"`     // JavaScript-like условие
	BusinessRule string                 `json:"business_rule,omitempty"` // Ссылка на бизнес-правило
	Props        map[string]interface{} `json:"props,omitempty"`
}

// ValidationResult результат валидации
type ValidationResult struct {
	Valid    bool     `json:"valid"`
	Errors   []string `json:"errors,omitempty"`
	Warnings []string `json:"warnings,omitempty"`
}

// ValidateField валидирует поле по правилам
func (ve *ValidationEngine) ValidateField(ctx context.Context, fieldName string, value interface{}, rules []ValidationRule) *ValidationResult {
	result := &ValidationResult{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}

	for _, rule := range rules {
		if !ve.validateRule(fieldName, value, rule, result) {
			result.Valid = false
		}
	}

	return result
}

// validateRule валидирует по одному правилу
func (ve *ValidationEngine) validateRule(fieldName string, value interface{}, rule ValidationRule, result *ValidationResult) bool {
	switch rule.Type {
	case "required":
		return ve.validateRequired(fieldName, value, rule, result)
	case "min":
		return ve.validateMin(fieldName, value, rule, result)
	case "max":
		return ve.validateMax(fieldName, value, rule, result)
	case "pattern":
		return ve.validatePattern(fieldName, value, rule, result)
	case "email":
		return ve.validateEmail(fieldName, value, rule, result)
	case "phone":
		return ve.validatePhone(fieldName, value, rule, result)
	case "custom":
		return ve.validateCustom(fieldName, value, rule, result)
	case "business":
		return ve.validateBusinessRule(fieldName, value, rule, result)
	default:
		ve.logger.Warn("Unknown validation rule type", "type", rule.Type)
		return true
	}
}

// validateRequired проверяет обязательность поля
func (ve *ValidationEngine) validateRequired(fieldName string, value interface{}, rule ValidationRule, result *ValidationResult) bool {
	if value == nil || value == "" {
		message := rule.Message
		if message == "" {
			message = fmt.Sprintf("Поле %s обязательно для заполнения", fieldName)
		}
		result.Errors = append(result.Errors, message)
		return false
	}
	return true
}

// validateMin проверяет минимальное значение
func (ve *ValidationEngine) validateMin(fieldName string, value interface{}, rule ValidationRule, result *ValidationResult) bool {
	minValue, ok := rule.Value.(float64)
	if !ok {
		return true
	}

	switch v := value.(type) {
	case string:
		if len(v) < int(minValue) {
			message := rule.Message
			if message == "" {
				message = fmt.Sprintf("Поле %s должно содержать минимум %d символов", fieldName, int(minValue))
			}
			result.Errors = append(result.Errors, message)
			return false
		}
	case float64:
		if v < minValue {
			message := rule.Message
			if message == "" {
				message = fmt.Sprintf("Поле %s должно быть не менее %v", fieldName, minValue)
			}
			result.Errors = append(result.Errors, message)
			return false
		}
	case int:
		if float64(v) < minValue {
			message := rule.Message
			if message == "" {
				message = fmt.Sprintf("Поле %s должно быть не менее %v", fieldName, minValue)
			}
			result.Errors = append(result.Errors, message)
			return false
		}
	}
	return true
}

// validateMax проверяет максимальное значение
func (ve *ValidationEngine) validateMax(fieldName string, value interface{}, rule ValidationRule, result *ValidationResult) bool {
	maxValue, ok := rule.Value.(float64)
	if !ok {
		return true
	}

	switch v := value.(type) {
	case string:
		if len(v) > int(maxValue) {
			message := rule.Message
			if message == "" {
				message = fmt.Sprintf("Поле %s должно содержать максимум %d символов", fieldName, int(maxValue))
			}
			result.Errors = append(result.Errors, message)
			return false
		}
	case float64:
		if v > maxValue {
			message := rule.Message
			if message == "" {
				message = fmt.Sprintf("Поле %s должно быть не более %v", fieldName, maxValue)
			}
			result.Errors = append(result.Errors, message)
			return false
		}
	case int:
		if float64(v) > maxValue {
			message := rule.Message
			if message == "" {
				message = fmt.Sprintf("Поле %s должно быть не более %v", fieldName, maxValue)
			}
			result.Errors = append(result.Errors, message)
			return false
		}
	}
	return true
}

// validatePattern проверяет по регулярному выражению
func (ve *ValidationEngine) validatePattern(fieldName string, value interface{}, rule ValidationRule, result *ValidationResult) bool {
	pattern, ok := rule.Value.(string)
	if !ok {
		return true
	}

	valueStr, ok := value.(string)
	if !ok {
		return true
	}

	regex, err := regexp.Compile(pattern)
	if err != nil {
		ve.logger.Error("Invalid regex pattern", "pattern", pattern, "error", err)
		return true
	}

	if !regex.MatchString(valueStr) {
		message := rule.Message
		if message == "" {
			message = fmt.Sprintf("Поле %s не соответствует требуемому формату", fieldName)
		}
		result.Errors = append(result.Errors, message)
		return false
	}
	return true
}

// validateEmail проверяет email
func (ve *ValidationEngine) validateEmail(fieldName string, value interface{}, rule ValidationRule, result *ValidationResult) bool {
	email, ok := value.(string)
	if !ok {
		return true
	}

	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		message := rule.Message
		if message == "" {
			message = fmt.Sprintf("Поле %s должно содержать корректный email", fieldName)
		}
		result.Errors = append(result.Errors, message)
		return false
	}
	return true
}

// validatePhone проверяет телефон
func (ve *ValidationEngine) validatePhone(fieldName string, value interface{}, rule ValidationRule, result *ValidationResult) bool {
	phone, ok := value.(string)
	if !ok {
		return true
	}

	// Убираем все нецифровые символы
	cleanPhone := regexp.MustCompile(`\D`).ReplaceAllString(phone, "")

	// Проверяем длину (7-15 цифр)
	if len(cleanPhone) < 7 || len(cleanPhone) > 15 {
		message := rule.Message
		if message == "" {
			message = fmt.Sprintf("Поле %s должно содержать корректный номер телефона", fieldName)
		}
		result.Errors = append(result.Errors, message)
		return false
	}
	return true
}

// validateCustom проверяет по кастомному правилу
func (ve *ValidationEngine) validateCustom(fieldName string, value interface{}, rule ValidationRule, result *ValidationResult) bool {
	// Здесь можно добавить кастомную логику валидации
	// Например, вызов внешних сервисов, проверка в базе данных и т.д.

	ve.logger.Info("Custom validation", "field", fieldName, "rule", rule.Name)
	return true
}

// validateBusinessRule проверяет по бизнес-правилу
func (ve *ValidationEngine) validateBusinessRule(fieldName string, value interface{}, rule ValidationRule, result *ValidationResult) bool {
	// Здесь должна быть интеграция с бизнес-логикой
	// Например, проверка кредитоспособности, валидация документов и т.д.

	ve.logger.Info("Business rule validation", "field", fieldName, "rule", rule.BusinessRule)

	// Пример бизнес-правил:
	switch rule.BusinessRule {
	case "credit_score_check":
		return ve.validateCreditScore(fieldName, value, rule, result)
	case "income_verification":
		return ve.validateIncome(fieldName, value, rule, result)
	case "age_verification":
		return ve.validateAge(fieldName, value, rule, result)
	default:
		ve.logger.Warn("Unknown business rule", "rule", rule.BusinessRule)
		return true
	}
}

// validateCreditScore проверяет кредитный рейтинг
func (ve *ValidationEngine) validateCreditScore(fieldName string, value interface{}, rule ValidationRule, result *ValidationResult) bool {
	score, ok := value.(float64)
	if !ok {
		// Попробуем конвертировать из строки
		if scoreStr, ok := value.(string); ok {
			if parsed, err := strconv.ParseFloat(scoreStr, 64); err == nil {
				score = parsed
			} else {
				result.Errors = append(result.Errors, "Некорректный формат кредитного рейтинга")
				return false
			}
		} else {
			result.Errors = append(result.Errors, "Кредитный рейтинг должен быть числом")
			return false
		}
	}

	// Минимальный кредитный рейтинг для одобрения
	minScore := 600.0
	if score < minScore {
		message := rule.Message
		if message == "" {
			message = fmt.Sprintf("Кредитный рейтинг должен быть не менее %.0f", minScore)
		}
		result.Errors = append(result.Errors, message)
		return false
	}
	return true
}

// validateIncome проверяет доход
func (ve *ValidationEngine) validateIncome(fieldName string, value interface{}, rule ValidationRule, result *ValidationResult) bool {
	income, ok := value.(float64)
	if !ok {
		if incomeStr, ok := value.(string); ok {
			if parsed, err := strconv.ParseFloat(incomeStr, 64); err == nil {
				income = parsed
			} else {
				result.Errors = append(result.Errors, "Некорректный формат дохода")
				return false
			}
		} else {
			result.Errors = append(result.Errors, "Доход должен быть числом")
			return false
		}
	}

	// Минимальный доход для одобрения кредита
	minIncome := 30000.0
	if income < minIncome {
		message := rule.Message
		if message == "" {
			message = fmt.Sprintf("Доход должен быть не менее %.0f рублей", minIncome)
		}
		result.Errors = append(result.Errors, message)
		return false
	}
	return true
}

// validateAge проверяет возраст
func (ve *ValidationEngine) validateAge(fieldName string, value interface{}, rule ValidationRule, result *ValidationResult) bool {
	age, ok := value.(float64)
	if !ok {
		if ageStr, ok := value.(string); ok {
			if parsed, err := strconv.ParseFloat(ageStr, 64); err == nil {
				age = parsed
			} else {
				result.Errors = append(result.Errors, "Некорректный формат возраста")
				return false
			}
		} else {
			result.Errors = append(result.Errors, "Возраст должен быть числом")
			return false
		}
	}

	// Возрастные ограничения
	minAge := 18.0
	maxAge := 65.0
	if age < minAge || age > maxAge {
		message := rule.Message
		if message == "" {
			message = fmt.Sprintf("Возраст должен быть от %.0f до %.0f лет", minAge, maxAge)
		}
		result.Errors = append(result.Errors, message)
		return false
	}
	return true
}

// ValidateForm валидирует всю форму
func (ve *ValidationEngine) ValidateForm(ctx context.Context, formData map[string]interface{}, formSchema UIForm) *ValidationResult {
	result := &ValidationResult{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}

	// Валидируем каждое поле формы
	for _, field := range formSchema.Fields {
		fieldValue, exists := formData[field.Name]
		if !exists {
			fieldValue = nil
		}

		// Получаем правила валидации для поля
		rules := ve.extractValidationRules(field.Validation)

		// Валидируем поле
		fieldResult := ve.ValidateField(ctx, field.Name, fieldValue, rules)
		if !fieldResult.Valid {
			result.Valid = false
			result.Errors = append(result.Errors, fieldResult.Errors...)
		}
		result.Warnings = append(result.Warnings, fieldResult.Warnings...)
	}

	return result
}

// extractValidationRules извлекает правила валидации из поля
func (ve *ValidationEngine) extractValidationRules(validation map[string]interface{}) []ValidationRule {
	var rules []ValidationRule

	if validation == nil {
		return rules
	}

	// Обрабатываем каждое правило валидации
	for ruleType, ruleValue := range validation {
		rule := ValidationRule{
			Name:  ruleType,
			Type:  ruleType,
			Value: ruleValue,
		}

		// Добавляем сообщение об ошибке если есть
		if message, ok := validation[ruleType+"_message"]; ok {
			rule.Message = message.(string)
		}

		rules = append(rules, rule)
	}

	return rules
}
