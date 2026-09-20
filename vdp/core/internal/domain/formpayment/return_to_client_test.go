package formpayment

import (
	"testing"

	"github.com/viletech/vdp/core/internal/domain"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

func TestMgrReturnToClientRate(t *testing.T) {
	tests := []struct {
		name    string
		form    Form
		rate    string
		errCode apperrors.ErrorCode
	}{
		{
			name: "happy path from mgr_return_decision",
			form: Form{
				Status:        StatusReturnMgrDecision,
				ReturnEpisode: ReturnEpisode{Active: true},
			},
			rate: "75.50",
		},
		{
			name: "happy path after client refused",
			form: Form{
				Status:        StatusClientReturnRefused,
				ReturnEpisode: ReturnEpisode{Active: true},
			},
			rate: "76.00",
		},
		{
			name: "no active episode denied",
			form: Form{
				Status:        StatusReturnMgrDecision,
				ReturnEpisode: ReturnEpisode{Active: false},
			},
			rate:    "75.50",
			errCode: apperrors.ErrCodeConflict,
		},
		{
			name: "wrong status denied",
			form: Form{
				Status:        StatusReturnReported,
				ReturnEpisode: ReturnEpisode{Active: true},
			},
			rate:    "75.50",
			errCode: apperrors.ErrCodeConflict,
		},
		{
			name: "empty rate denied",
			form: Form{
				Status:        StatusReturnMgrDecision,
				ReturnEpisode: ReturnEpisode{Active: true},
			},
			rate:    "",
			errCode: apperrors.ErrCodeValidation,
		},
		{
			name: "invalid rate denied",
			form: Form{
				Status:        StatusReturnMgrDecision,
				ReturnEpisode: ReturnEpisode{Active: true},
			},
			rate:    "abc",
			errCode: apperrors.ErrCodeValidation,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.form.ValidateMgrReturnToClientRate(tt.rate)
			if tt.errCode != "" {
				if err == nil {
					t.Fatalf("expected error code %s, got nil", tt.errCode)
				}
				appErr, ok := err.(*apperrors.AppError)
				if !ok {
					t.Fatalf("expected *apperrors.AppError, got %T", err)
				}
				if appErr.Code != tt.errCode {
					t.Errorf("expected error code %s, got %s", tt.errCode, appErr.Code)
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
			}
		})
	}
}

func TestApplyMgrReturnToClientRate(t *testing.T) {
	t.Run("rate is recorded and history grows", func(t *testing.T) {
		f := Form{
			Status:        StatusReturnMgrDecision,
			ReturnEpisode: ReturnEpisode{Active: true},
		}

		f.ApplyMgrReturnToClientRate("75.50", "mgr1")

		if f.ReturnEpisode.ToClientRate != "75.50" {
			t.Errorf("expected rate 75.50, got %s", f.ReturnEpisode.ToClientRate)
		}
		if f.ReturnEpisode.ToClientRateSetBy != "mgr1" {
			t.Errorf("expected setBy mgr1, got %s", f.ReturnEpisode.ToClientRateSetBy)
		}
		if len(f.ReturnEpisode.ToClientRateHistory) != 1 {
			t.Errorf("expected 1 history entry, got %d", len(f.ReturnEpisode.ToClientRateHistory))
		}
		if f.ReturnEpisode.ToClientRateHistory[0].Rate != "75.50" {
			t.Errorf("expected history rate 75.50, got %s", f.ReturnEpisode.ToClientRateHistory[0].Rate)
		}
	})

	t.Run("new rate clears previous client answer", func(t *testing.T) {
		f := Form{
			Status: StatusReturnMgrDecision,
			ReturnEpisode: ReturnEpisode{
				Active:              true,
				ClientConsentFileID: "old-consent",
				ClientRefusalReason: "old-reason",
			},
		}

		f.ApplyMgrReturnToClientRate("76.00", "mgr1")

		if f.ReturnEpisode.ClientConsentFileID != "" {
			t.Errorf("expected consent cleared, got %s", f.ReturnEpisode.ClientConsentFileID)
		}
		if f.ReturnEpisode.ClientRefusalReason != "" {
			t.Errorf("expected refusal cleared, got %s", f.ReturnEpisode.ClientRefusalReason)
		}
	})

	t.Run("idempotent repeat updates timestamp", func(t *testing.T) {
		f := Form{
			Status:        StatusReturnMgrDecision,
			ReturnEpisode: ReturnEpisode{Active: true},
		}

		f.ApplyMgrReturnToClientRate("75.50", "mgr1")
		firstTimestamp := f.ReturnEpisode.ToClientRateSetAt

		f.ApplyMgrReturnToClientRate("75.50", "mgr1")
		secondTimestamp := f.ReturnEpisode.ToClientRateSetAt

		if secondTimestamp.Equal(firstTimestamp) {
			t.Error("expected timestamp to be updated on repeat")
		}
		if len(f.ReturnEpisode.ToClientRateHistory) != 2 {
			t.Errorf("expected 2 history entries, got %d", len(f.ReturnEpisode.ToClientRateHistory))
		}
	})
}

func TestClientReturnConsent(t *testing.T) {
	tests := []struct {
		name          string
		form          Form
		consentFileID string
		errCode       apperrors.ErrorCode
	}{
		{
			name: "happy path with consent file",
			form: Form{
				Status:        StatusClientReturnConsentPending,
				ReturnEpisode: ReturnEpisode{Active: true},
			},
			consentFileID: "file123",
		},
		{
			name: "no active episode denied",
			form: Form{
				Status:        StatusClientReturnConsentPending,
				ReturnEpisode: ReturnEpisode{Active: false},
			},
			consentFileID: "file123",
			errCode:       apperrors.ErrCodeConflict,
		},
		{
			name: "wrong status denied",
			form: Form{
				Status:        StatusReturnMgrDecision,
				ReturnEpisode: ReturnEpisode{Active: true},
			},
			consentFileID: "file123",
			errCode:       apperrors.ErrCodeConflict,
		},
		{
			name: "no file denied",
			form: Form{
				Status:        StatusClientReturnConsentPending,
				ReturnEpisode: ReturnEpisode{Active: true},
			},
			consentFileID: "",
			errCode:       apperrors.ErrCodeValidation,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.form.ValidateClientReturnConsent(tt.consentFileID)
			if tt.errCode != "" {
				if err == nil {
					t.Fatalf("expected error code %s, got nil", tt.errCode)
				}
				appErr, ok := err.(*apperrors.AppError)
				if !ok {
					t.Fatalf("expected *apperrors.AppError, got %T", err)
				}
				if appErr.Code != tt.errCode {
					t.Errorf("expected error code %s, got %s", tt.errCode, appErr.Code)
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
			}
		})
	}
}

func TestApplyClientReturnConsent(t *testing.T) {
	t.Run("consent is recorded", func(t *testing.T) {
		f := Form{
			Status:        StatusClientReturnConsentPending,
			ReturnEpisode: ReturnEpisode{Active: true},
		}

		f.ApplyClientReturnConsent("file123", "client1")

		if f.ReturnEpisode.ClientConsentFileID != "file123" {
			t.Errorf("expected consent file123, got %s", f.ReturnEpisode.ClientConsentFileID)
		}
		if f.ReturnEpisode.ClientConsentGivenBy != "client1" {
			t.Errorf("expected givenBy client1, got %s", f.ReturnEpisode.ClientConsentGivenBy)
		}
	})
}

func TestClientReturnRefuse(t *testing.T) {
	tests := []struct {
		name    string
		form    Form
		reason  string
		errCode apperrors.ErrorCode
	}{
		{
			name: "happy path with reason",
			form: Form{
				Status:        StatusClientReturnConsentPending,
				ReturnEpisode: ReturnEpisode{Active: true},
			},
			reason: "Rate is too low",
		},
		{
			name: "no active episode denied",
			form: Form{
				Status:        StatusClientReturnConsentPending,
				ReturnEpisode: ReturnEpisode{Active: false},
			},
			reason:  "Rate is too low",
			errCode: apperrors.ErrCodeConflict,
		},
		{
			name: "wrong status denied",
			form: Form{
				Status:        StatusReturnMgrDecision,
				ReturnEpisode: ReturnEpisode{Active: true},
			},
			reason:  "Rate is too low",
			errCode: apperrors.ErrCodeConflict,
		},
		{
			name: "empty reason denied",
			form: Form{
				Status:        StatusClientReturnConsentPending,
				ReturnEpisode: ReturnEpisode{Active: true},
			},
			reason:  "",
			errCode: apperrors.ErrCodeValidation,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.form.ValidateClientReturnRefuse(tt.reason)
			if tt.errCode != "" {
				if err == nil {
					t.Fatalf("expected error code %s, got nil", tt.errCode)
				}
				appErr, ok := err.(*apperrors.AppError)
				if !ok {
					t.Fatalf("expected *apperrors.AppError, got %T", err)
				}
				if appErr.Code != tt.errCode {
					t.Errorf("expected error code %s, got %s", tt.errCode, appErr.Code)
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
			}
		})
	}
}

func TestApplyClientReturnRefuse(t *testing.T) {
	t.Run("refusal is recorded and consent cleared", func(t *testing.T) {
		f := Form{
			Status: StatusClientReturnConsentPending,
			ReturnEpisode: ReturnEpisode{
				Active:              true,
				ClientConsentFileID: "old-consent",
			},
		}

		f.ApplyClientReturnRefuse("Rate is too low", "client1")

		if f.ReturnEpisode.ClientRefusalReason != "Rate is too low" {
			t.Errorf("expected reason 'Rate is too low', got %s", f.ReturnEpisode.ClientRefusalReason)
		}
		if f.ReturnEpisode.ClientConsentFileID != "" {
			t.Errorf("expected consent cleared, got %s", f.ReturnEpisode.ClientConsentFileID)
		}
	})
}

func TestMgrReturnToClientExecute(t *testing.T) {
	tests := []struct {
		name             string
		form             Form
		rubPaymentFileID string
		errCode          apperrors.ErrorCode
	}{
		{
			name: "happy path with consent and rub file",
			form: Form{
				Status: StatusMgrReturnToClientReadyExecute,
				ReturnEpisode: ReturnEpisode{
					Active:              true,
					ClientConsentFileID: "consent123",
				},
			},
			rubPaymentFileID: "rub456",
		},
		{
			name: "no active episode denied",
			form: Form{
				Status: StatusMgrReturnToClientReadyExecute,
				ReturnEpisode: ReturnEpisode{
					Active:              false,
					ClientConsentFileID: "consent123",
				},
			},
			rubPaymentFileID: "rub456",
			errCode:          apperrors.ErrCodeConflict,
		},
		{
			name: "wrong status denied",
			form: Form{
				Status: StatusReturnMgrDecision,
				ReturnEpisode: ReturnEpisode{
					Active:              true,
					ClientConsentFileID: "consent123",
				},
			},
			rubPaymentFileID: "rub456",
			errCode:          apperrors.ErrCodeConflict,
		},
		{
			name: "no consent denied (CRITICAL GUARD)",
			form: Form{
				Status: StatusMgrReturnToClientReadyExecute,
				ReturnEpisode: ReturnEpisode{
					Active:              true,
					ClientConsentFileID: "",
				},
			},
			rubPaymentFileID: "rub456",
			errCode:          apperrors.ErrCodeConflict,
		},
		{
			name: "no rub file denied",
			form: Form{
				Status: StatusMgrReturnToClientReadyExecute,
				ReturnEpisode: ReturnEpisode{
					Active:              true,
					ClientConsentFileID: "consent123",
				},
			},
			rubPaymentFileID: "",
			errCode:          apperrors.ErrCodeValidation,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.form.ValidateMgrReturnToClientExecute(tt.rubPaymentFileID)
			if tt.errCode != "" {
				if err == nil {
					t.Fatalf("expected error code %s, got nil", tt.errCode)
				}
				appErr, ok := err.(*apperrors.AppError)
				if !ok {
					t.Fatalf("expected *apperrors.AppError, got %T", err)
				}
				if appErr.Code != tt.errCode {
					t.Errorf("expected error code %s, got %s", tt.errCode, appErr.Code)
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
			}
		})
	}
}

func TestApplyMgrReturnToClientExecute(t *testing.T) {
	t.Run("execution closes episode", func(t *testing.T) {
		f := Form{
			Status: StatusMgrReturnToClientReadyExecute,
			ReturnEpisode: ReturnEpisode{
				Active:              true,
				ClientConsentFileID: "consent123",
			},
		}

		f.ApplyMgrReturnToClientExecute("rub456", "mgr1")

		if f.ReturnEpisode.ToClientRubPaymentFileID != "rub456" {
			t.Errorf("expected rub file rub456, got %s", f.ReturnEpisode.ToClientRubPaymentFileID)
		}
		if f.ReturnEpisode.ToClientExecutedBy != "mgr1" {
			t.Errorf("expected executedBy mgr1, got %s", f.ReturnEpisode.ToClientExecutedBy)
		}
		if !f.ReturnEpisode.ToClientClosed {
			t.Error("expected episode to be closed")
		}
		if f.ReturnEpisode.Active {
			t.Error("expected episode to be inactive")
		}
	})
}

func TestReturnToClientClosed(t *testing.T) {
	t.Run("after execute episode is closed and inactive", func(t *testing.T) {
		f := Form{
			Status: StatusMgrReturnToClientReadyExecute,
			ReturnEpisode: ReturnEpisode{
				Active:              true,
				ClientConsentFileID: "consent123",
			},
		}

		err := f.ValidateMgrReturnToClientExecute("rub456")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		f.ApplyMgrReturnToClientExecute("rub456", "mgr1")

		if f.ReturnEpisode.Active {
			t.Error("expected episode to be inactive after execution")
		}
		if !f.ReturnEpisode.ToClientClosed {
			t.Error("expected ToClientClosed to be true after execution")
		}
	})
}

func TestReturnToClient_RoleMatrix(t *testing.T) {
	t.Run("manager can set rate", func(t *testing.T) {
		roles := RolesForAction(ActionMgrReturnToClientRate)
		found := false
		for _, r := range roles {
			if r == domain.RoleManager {
				found = true
				break
			}
		}
		if !found {
			t.Error("expected manager to have permission for ActionMgrReturnToClientRate")
		}
	})

	t.Run("client can consent", func(t *testing.T) {
		roles := RolesForAction(ActionClientReturnConsent)
		found := false
		for _, r := range roles {
			if r == domain.RoleUser {
				found = true
				break
			}
		}
		if !found {
			t.Error("expected client to have permission for ActionClientReturnConsent")
		}
	})

	t.Run("manager can execute", func(t *testing.T) {
		roles := RolesForAction(ActionMgrReturnToClientExecute)
		found := false
		for _, r := range roles {
			if r == domain.RoleManager {
				found = true
				break
			}
		}
		if !found {
			t.Error("expected manager to have permission for ActionMgrReturnToClientExecute")
		}
	})

	t.Run("treasurer cannot execute", func(t *testing.T) {
		roles := RolesForAction(ActionMgrReturnToClientExecute)
		for _, r := range roles {
			if r == domain.RoleTreasurer {
				t.Error("expected treasurer NOT to have permission for ActionMgrReturnToClientExecute")
			}
		}
	})
}
