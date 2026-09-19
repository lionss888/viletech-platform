package formpayment

import (
	"testing"

	"github.com/viletech/vdp/core/internal/domain"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

func TestMgrReturnRepeat(t *testing.T) {
	tests := []struct {
		name             string
		form             Form
		comment          string
		newProviderOrgID string
		errCode          apperrors.ErrorCode
	}{
		{
			name: "happy without org change",
			form: Form{
				Status:        StatusReturnMgrDecision,
				ReturnEpisode: ReturnEpisode{Active: true},
			},
			comment: "Retry with same provider",
		},
		{
			name: "happy with org change",
			form: Form{
				Status:        StatusReturnMgrDecision,
				ReturnEpisode: ReturnEpisode{Active: true},
			},
			comment:          "Retry with new provider",
			newProviderOrgID: "neworg123",
		},
		{
			name: "no active episode denied",
			form: Form{
				Status:        StatusReturnMgrDecision,
				ReturnEpisode: ReturnEpisode{Active: false},
			},
			comment: "Retry",
			errCode: apperrors.ErrCodeConflict,
		},
		{
			name: "wrong status denied",
			form: Form{
				Status:        StatusReturnReported,
				ReturnEpisode: ReturnEpisode{Active: true},
			},
			comment: "Retry",
			errCode: apperrors.ErrCodeConflict,
		},
		{
			name: "empty comment denied",
			form: Form{
				Status:        StatusReturnMgrDecision,
				ReturnEpisode: ReturnEpisode{Active: true},
			},
			comment: "",
			errCode: apperrors.ErrCodeValidation,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.form.ValidateMgrReturnRepeat(tt.comment, tt.newProviderOrgID, "")
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

func TestApplyMgrReturnRepeat(t *testing.T) {
	t.Run("comment is recorded", func(t *testing.T) {
		f := Form{
			Status:        StatusReturnMgrDecision,
			ReturnEpisode: ReturnEpisode{Active: true},
		}

		f.ApplyMgrReturnRepeat("Retry with corrected account", "", "", "mgr1")

		if f.ReturnEpisode.RepeatComment != "Retry with corrected account" {
			t.Errorf("expected comment recorded, got %s", f.ReturnEpisode.RepeatComment)
		}
		if f.ReturnEpisode.RepeatInitiatedBy != "mgr1" {
			t.Errorf("expected initiatedBy mgr1, got %s", f.ReturnEpisode.RepeatInitiatedBy)
		}
	})

	t.Run("org change is recorded", func(t *testing.T) {
		f := Form{
			Status:        StatusReturnMgrDecision,
			ReturnEpisode: ReturnEpisode{Active: true},
		}

		f.ApplyMgrReturnRepeat("Retry with new provider", "neworg123", "newacc456", "mgr1")

		if !f.ReturnEpisode.RepeatProviderOrgChanged {
			t.Error("expected provider org changed flag to be true")
		}
		if f.ReturnEpisode.RepeatNewProviderOrgID != "neworg123" {
			t.Errorf("expected new org neworg123, got %s", f.ReturnEpisode.RepeatNewProviderOrgID)
		}
	})
}

func TestProvReturnRepeatExecute(t *testing.T) {
	tests := []struct {
		name           string
		form           Form
		paymentFileID  string
		providerOrgID  string
		errCode        apperrors.ErrorCode
	}{
		{
			name: "happy with original provider",
			form: Form{
				Status:     StatusProvReturnRepeatExecuting,
				ProviderID: "prov1",
				ReturnEpisode: ReturnEpisode{
					Active:                   true,
					RepeatProviderOrgChanged: false,
				},
			},
			paymentFileID: "newfile789",
			providerOrgID: "prov1",
		},
		{
			name: "happy with new provider",
			form: Form{
				Status:     StatusProvReturnRepeatExecuting,
				ProviderID: "prov1",
				ReturnEpisode: ReturnEpisode{
					Active:                   true,
					RepeatProviderOrgChanged: true,
					RepeatNewProviderOrgID:   "newprov2",
				},
			},
			paymentFileID: "newfile789",
			providerOrgID: "newprov2",
		},
		{
			name: "no active episode denied",
			form: Form{
				Status:     StatusProvReturnRepeatExecuting,
				ProviderID: "prov1",
				ReturnEpisode: ReturnEpisode{
					Active: false,
				},
			},
			paymentFileID: "newfile789",
			providerOrgID: "prov1",
			errCode:       apperrors.ErrCodeConflict,
		},
		{
			name: "wrong status denied",
			form: Form{
				Status:     StatusReturnMgrDecision,
				ProviderID: "prov1",
				ReturnEpisode: ReturnEpisode{
					Active: true,
				},
			},
			paymentFileID: "newfile789",
			providerOrgID: "prov1",
			errCode:       apperrors.ErrCodeConflict,
		},
		{
			name: "no file denied",
			form: Form{
				Status:     StatusProvReturnRepeatExecuting,
				ProviderID: "prov1",
				ReturnEpisode: ReturnEpisode{
					Active: true,
				},
			},
			paymentFileID: "",
			providerOrgID: "prov1",
			errCode:       apperrors.ErrCodeValidation,
		},
		{
			name: "not assigned provider denied",
			form: Form{
				Status:     StatusProvReturnRepeatExecuting,
				ProviderID: "prov1",
				ReturnEpisode: ReturnEpisode{
					Active: true,
				},
			},
			paymentFileID: "newfile789",
			providerOrgID: "otherprov",
			errCode:       apperrors.ErrCodeForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.form.ValidateProvReturnRepeatExecute(tt.paymentFileID, tt.providerOrgID)
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

func TestApplyProvReturnRepeatExecute(t *testing.T) {
	t.Run("execution closes episode and records new payment", func(t *testing.T) {
		f := Form{
			Status:               StatusProvReturnRepeatExecuting,
			ReturnEpisode: ReturnEpisode{
				Active: true,
			},
		}

		f.ApplyProvReturnRepeatExecute("newfile789", "prov1")

		// New payment file recorded
		if f.ReturnEpisode.RepeatPaymentFileID != "newfile789" {
			t.Errorf("expected new payment newfile789, got %s", f.ReturnEpisode.RepeatPaymentFileID)
		}

		// Episode closed
		if !f.ReturnEpisode.RepeatClosed {
			t.Error("expected episode to be closed")
		}
		if f.ReturnEpisode.Active {
			t.Error("expected episode to be inactive")
		}
	})
}

func TestRepeatClosed(t *testing.T) {
	t.Run("after execute episode is closed and inactive", func(t *testing.T) {
		f := Form{
			Status:     StatusProvReturnRepeatExecuting,
			ProviderID: "prov1",
			ReturnEpisode: ReturnEpisode{
				Active: true,
			},
		}

		err := f.ValidateProvReturnRepeatExecute("newfile789", "prov1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		f.ApplyProvReturnRepeatExecute("newfile789", "prov1")

		if f.ReturnEpisode.Active {
			t.Error("expected episode to be inactive after execution")
		}
		if !f.ReturnEpisode.RepeatClosed {
			t.Error("expected RepeatClosed to be true after execution")
		}
	})
}

func TestRepeat_RoleMatrix(t *testing.T) {
	t.Run("manager can initiate repeat", func(t *testing.T) {
		roles := RolesForAction(ActionMgrReturnRepeat)
		found := false
		for _, r := range roles {
			if r == domain.RoleManager {
				found = true
				break
			}
		}
		if !found {
			t.Error("expected manager to have permission for ActionMgrReturnRepeat")
		}
	})

	t.Run("provider can execute repeat", func(t *testing.T) {
		roles := RolesForAction(ActionProvReturnRepeatExecute)
		found := false
		for _, r := range roles {
			if r == domain.RoleProvider {
				found = true
				break
			}
		}
		if !found {
			t.Error("expected provider to have permission for ActionProvReturnRepeatExecute")
		}
	})

	t.Run("client cannot initiate repeat", func(t *testing.T) {
		roles := RolesForAction(ActionMgrReturnRepeat)
		for _, r := range roles {
			if r == domain.RoleUser {
				t.Error("expected client NOT to have permission for ActionMgrReturnRepeat")
			}
		}
	})
}
