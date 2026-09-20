package formpayment

import (
	"testing"

	"github.com/viletech/vdp/core/internal/domain"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

// TestValidateProvReturnReport uses table-driven tests for return report guards (stage 1).
func TestValidateProvReturnReport(t *testing.T) {
	tests := []struct {
		name        string
		form        Form
		amount      string
		currency    string
		reason      string
		actorRole   domain.Role
		actorOrgID  string
		actorUserID string
		wantErr     bool
		errCode     apperrors.ErrorCode
	}{
		{
			name: "happy path: import, after execution, provider assigned",
			form: Form{
				ID:         "f1",
				Direction:  DirectionImport,
				Status:     StatusPaymentSent,
				ProviderID: "prov1",
				ReturnEpisode: ReturnEpisode{
					Active: false,
				},
			},
			amount:      "1000.00",
			currency:    "USD",
			reason:      "chargeback",
			actorRole:   domain.RoleProvider,
			actorOrgID:  "prov1",
			actorUserID: "u1",
			wantErr:     false,
		},
		{
			name: "export denied",
			form: Form{
				ID:         "f2",
				Direction:  DirectionExport,
				Status:     StatusPaymentSent,
				ProviderID: "prov1",
			},
			amount:      "1000.00",
			actorRole:   domain.RoleProvider,
			actorOrgID:  "prov1",
			actorUserID: "u1",
			wantErr:     true,
			errCode:     apperrors.ErrCodeValidation,
		},
		{
			name: "before execution denied",
			form: Form{
				ID:         "f3",
				Direction:  DirectionImport,
				Status:     StatusPaymentProcessing,
				ProviderID: "prov1",
			},
			amount:      "1000.00",
			actorRole:   domain.RoleProvider,
			actorOrgID:  "prov1",
			actorUserID: "u1",
			wantErr:     true,
			errCode:     apperrors.ErrCodeValidation,
		},
		{
			name: "second active denied",
			form: Form{
				ID:         "f4",
				Direction:  DirectionImport,
				Status:     StatusPaymentSent,
				ProviderID: "prov1",
				ReturnEpisode: ReturnEpisode{
					Active: true,
				},
			},
			amount:      "1000.00",
			actorRole:   domain.RoleProvider,
			actorOrgID:  "prov1",
			actorUserID: "u1",
			wantErr:     true,
			errCode:     apperrors.ErrCodeConflict,
		},
		{
			name: "not assigned provider denied",
			form: Form{
				ID:         "f5",
				Direction:  DirectionImport,
				Status:     StatusPaymentSent,
				ProviderID: "prov1",
			},
			amount:      "1000.00",
			actorRole:   domain.RoleProvider,
			actorOrgID:  "prov-other",
			actorUserID: "u1",
			wantErr:     true,
			errCode:     apperrors.ErrCodeForbidden,
		},
		{
			name: "amount required",
			form: Form{
				ID:         "f6",
				Direction:  DirectionImport,
				Status:     StatusPaymentSent,
				ProviderID: "prov1",
			},
			amount:      "",
			actorRole:   domain.RoleProvider,
			actorOrgID:  "prov1",
			actorUserID: "u1",
			wantErr:     true,
			errCode:     apperrors.ErrCodeValidation,
		},
		{
			name: "manager role denied",
			form: Form{
				ID:         "f7",
				Direction:  DirectionImport,
				Status:     StatusPaymentSent,
				ProviderID: "prov1",
			},
			amount:      "1000.00",
			actorRole:   domain.RoleManager,
			actorOrgID:  "prov1",
			actorUserID: "u1",
			wantErr:     true,
			errCode:     apperrors.ErrCodeForbidden,
		},
		{
			name: "after report_accepted ok",
			form: Form{
				ID:         "f8",
				Direction:  DirectionImport,
				Status:     StatusReportAccepted,
				ProviderID: "prov1",
			},
			amount:      "1000.00",
			actorRole:   domain.RoleProvider,
			actorOrgID:  "prov1",
			actorUserID: "u1",
			wantErr:     false,
		},
		{
			name: "after completed ok",
			form: Form{
				ID:         "f9",
				Direction:  DirectionImport,
				Status:     StatusCompleted,
				ProviderID: "prov1",
			},
			amount:      "1000.00",
			actorRole:   domain.RoleProvider,
			actorOrgID:  "prov1",
			actorUserID: "u1",
			wantErr:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.form.ValidateProvReturnReport(tt.amount, tt.currency, tt.reason, tt.actorRole, tt.actorOrgID, tt.actorUserID)
			if tt.wantErr {
				if err == nil {
					t.Errorf("expected error, got nil")
					return
				}
				appErr, ok := err.(*apperrors.AppError)
				if !ok {
					t.Errorf("expected AppError, got %T", err)
					return
				}
				if appErr.Code != tt.errCode {
					t.Errorf("expected code %s, got %s", tt.errCode, appErr.Code)
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
				}
			}
		})
	}
}

// TestApplyProvReturnReport verifies return episode activation and idempotency.
func TestApplyProvReturnReport(t *testing.T) {
	t.Run("activates episode", func(t *testing.T) {
		f := Form{
			ID:         "f1",
			Currency:   "USD",
			Status:     StatusPaymentSent,
			ProviderID: "prov1",
		}
		f.ApplyProvReturnReport("1000.00", "", "chargeback", "u1")

		if !f.ReturnEpisode.Active {
			t.Error("expected episode active")
		}
		if f.ReturnEpisode.ReportedAmount != "1000.00" {
			t.Errorf("expected amount 1000.00, got %s", f.ReturnEpisode.ReportedAmount)
		}
		if f.ReturnEpisode.ReportedCurrency != "USD" {
			t.Errorf("expected currency USD (from form), got %s", f.ReturnEpisode.ReportedCurrency)
		}
		if f.ReturnEpisode.Reason != "chargeback" {
			t.Errorf("expected reason chargeback, got %s", f.ReturnEpisode.Reason)
		}
		if f.ReturnEpisode.ReportedBy != "u1" {
			t.Errorf("expected reported by u1, got %s", f.ReturnEpisode.ReportedBy)
		}
		if f.Status != StatusReturnReported {
			t.Errorf("expected status return_reported, got %s", f.Status)
		}
	})

	t.Run("idempotent repeat same params", func(t *testing.T) {
		f := Form{
			ID:         "f1",
			Currency:   "USD",
			Status:     StatusPaymentSent,
			ProviderID: "prov1",
		}
		f.ApplyProvReturnReport("1000.00", "USD", "chargeback", "u1")
		firstReportedAt := f.ReturnEpisode.ReportedAt

		// Повтор с теми же параметрами
		f.ApplyProvReturnReport("1000.00", "USD", "chargeback", "u1")

		if f.ReturnEpisode.ReportedAt != firstReportedAt {
			t.Error("idempotent repeat should not change ReportedAt")
		}
	})
}

// TestIsAfterExecution verifies status guard for return entry.
func TestIsAfterExecution(t *testing.T) {
	tests := []struct {
		name   string
		status Status
		want   bool
	}{
		{"payment_sent ok", StatusPaymentSent, true},
		{"report_waiting ok", StatusReportWaiting, true},
		{"report_accepted ok", StatusReportAccepted, true},
		{"completed ok", StatusCompleted, true},
		{"payment_processing denied", StatusPaymentProcessing, false},
		{"draft denied", StatusDraft, false},
		{"form_accepted denied", StatusFormAccepted, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := Form{Status: tt.status}
			if got := f.IsAfterExecution(); got != tt.want {
				t.Errorf("IsAfterExecution() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestReturnEpisodeVisibleTo(t *testing.T) {
	t.Parallel()
	episode := ReturnEpisode{
		Active:              true,
		RepeatComment:       "internal retry note",
		ClientConsentFileID: "consent-file",
		ClarifyQuestion:     "why returned",
		ClarifyAnswer:       "bank rejected",
	}
	tests := []struct {
		name           string
		role           domain.Role
		wantComment    string
		wantConsent    string
		wantClarifyAsk string
	}{
		{name: "client hides repeat comment", role: domain.RoleUser, wantConsent: "consent-file", wantClarifyAsk: "why returned"},
		{name: "provider hides client letter and clarify", role: domain.RoleProvider, wantComment: "internal retry note"},
		{name: "manager sees all", role: domain.RoleManager, wantComment: "internal retry note", wantConsent: "consent-file", wantClarifyAsk: "why returned"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := episode.VisibleTo(tt.role)
			if got.RepeatComment != tt.wantComment {
				t.Errorf("RepeatComment = %q, want %q", got.RepeatComment, tt.wantComment)
			}
			if got.ClientConsentFileID != tt.wantConsent {
				t.Errorf("ClientConsentFileID = %q, want %q", got.ClientConsentFileID, tt.wantConsent)
			}
			if got.ClarifyQuestion != tt.wantClarifyAsk {
				t.Errorf("ClarifyQuestion = %q, want %q", got.ClarifyQuestion, tt.wantClarifyAsk)
			}
		})
	}
}
