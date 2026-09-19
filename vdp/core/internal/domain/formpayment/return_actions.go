package formpayment

import (
	"time"

	"github.com/viletech/vdp/core/internal/domain"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

// ValidateProvReturnReport checks guards for provider-initiated return report (stage 1).
// Инварианты:
// 1. Только импорт
// 2. Только после исполнения (payment_sent и далее)
// 3. Один активный эпизод
// 4. Провайдер назначен и является актором
// 5. Сумма обязательна
func (f Form) ValidateProvReturnReport(amount, currency, reason string, actorRole domain.Role, actorOrgID, actorUserID string) error {
	// Guard: только импорт
	if f.Direction != DirectionImport {
		return apperrors.New(apperrors.ErrCodeValidation, "return after execution only for import")
	}

	// Guard: только после исполнения (payment_sent, report_*, completed)
	if !f.IsAfterExecution() {
		return apperrors.New(apperrors.ErrCodeValidation, "return report only after payment execution")
	}

	// Guard: один активный эпизод
	if f.ReturnEpisode.Active {
		return apperrors.New(apperrors.ErrCodeConflict, "return episode already active")
	}

	// Guard: провайдер назначен
	if f.ProviderID == "" {
		return apperrors.New(apperrors.ErrCodeValidation, "provider not assigned")
	}

	// Guard: актор — провайдер этой заявки
	if actorRole != domain.RoleProvider && actorRole != domain.RoleSeniorProvider {
		return apperrors.New(apperrors.ErrCodeForbidden, "only provider can report return")
	}
	if actorOrgID != f.ProviderID {
		return apperrors.New(apperrors.ErrCodeForbidden, "not assigned provider")
	}

	// Guard: сумма обязательна
	if amount == "" {
		return apperrors.New(apperrors.ErrCodeValidation, "amount required")
	}

	// currency опционально — возьмём из формы, если пусто
	return nil
}

// IsAfterExecution returns true when form is in payment_sent or later (report_*, completed).
func (f Form) IsAfterExecution() bool {
	switch f.Status {
	case StatusPaymentSent, StatusReportWaiting, StatusReportWaitingDiadoc, StatusReportWaitingVerification,
		StatusReportWaitingCorrections, StatusReportVerification, StatusReportAccepted,
		StatusShipmentWaiting, StatusShipmentWaitingVerification, StatusShipmentWaitingCorrections, StatusShipmentVerification,
		StatusCompleted:
		return true
	default:
		return false
	}
}

// ApplyProvReturnReport activates return episode with provider's report (idempotent).
func (f *Form) ApplyProvReturnReport(amount, currency, reason, actorUserID string) {
	// Идемпотентность: если уже активен с теми же параметрами, не дублируем
	if f.ReturnEpisode.Active &&
		f.ReturnEpisode.ReportedAmount == amount &&
		f.ReturnEpisode.ReportedCurrency == currency {
		return
	}

	// Currency default: берём из формы
	if currency == "" {
		currency = f.Currency
	}

	f.ReturnEpisode = ReturnEpisode{
		Active:           true,
		ReportedAmount:   amount,
		ReportedCurrency: currency,
		Reason:           reason,
		ReportedBy:       actorUserID,
		ReportedAt:       time.Now(),
	}

	// Переход в return_reported (или остаётся прежний статус + флаг Active)
	// Для этапа 1 можно оставить status как есть, просто флаг Active = true.
	// Либо явно f.Status = StatusReturnReported.
	// По плану: переход в return_reported.
	f.Status = StatusReturnReported
}
