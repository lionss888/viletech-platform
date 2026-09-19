package formpayment

import (
	"testing"
	"time"

	"github.com/viletech/vdp/core/internal/domain"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

func TestValidateMgrReturnClarify(t *testing.T) {
	tests := []struct {
		name        string
		form        Form
		question    string
		fileID      string
		actorRole   domain.Role
		actorUserID string
		wantErr     bool
		errCode     apperrors.ErrorCode
	}{
		{
			name: "happy path manager clarify",
			form: Form{
				Status:        StatusReturnReported,
				ReturnEpisode: ReturnEpisode{Active: true},
			},
			question:    "Please provide invoice",
			fileID:      "file123",
			actorRole:   domain.RoleManager,
			actorUserID: "mgr1",
			wantErr:     false,
		},
		{
			name: "happy path from mgr decision point",
			form: Form{
				Status:        StatusReturnMgrDecision,
				ReturnEpisode: ReturnEpisode{Active: true},
			},
			question:    "Need additional docs",
			actorRole:   domain.RoleManager,
			actorUserID: "mgr1",
			wantErr:     false,
		},
		{
			name: "episode not active denied",
			form: Form{
				Status:        StatusReturnReported,
				ReturnEpisode: ReturnEpisode{Active: false},
			},
			question:    "Question",
			actorRole:   domain.RoleManager,
			wantErr:     true,
			errCode: apperrors.ErrCodeValidation,
		},
		{
			name: "client cannot clarify",
			form: Form{
				Status:        StatusReturnReported,
				ReturnEpisode: ReturnEpisode{Active: true},
			},
			question:    "Question",
			actorRole:   domain.RoleUser,
			wantErr:     true,
			errCode: apperrors.ErrCodeForbidden,
		},
		{
			name: "provider cannot clarify",
			form: Form{
				Status:        StatusReturnReported,
				ReturnEpisode: ReturnEpisode{Active: true},
			},
			question:    "Question",
			actorRole:   domain.RoleProvider,
			wantErr:     true,
			errCode: apperrors.ErrCodeForbidden,
		},
		{
			name: "empty question denied",
			form: Form{
				Status:        StatusReturnReported,
				ReturnEpisode: ReturnEpisode{Active: true},
			},
			question:    "",
			actorRole:   domain.RoleManager,
			wantErr:     true,
			errCode: apperrors.ErrCodeValidation,
		},
		{
			name: "wrong status denied",
			form: Form{
				Status:        StatusPaymentSent, // not a valid clarify state
				ReturnEpisode: ReturnEpisode{Active: true},
			},
			question:    "Question",
			actorRole:   domain.RoleManager,
			wantErr:     true,
			errCode: apperrors.ErrCodeValidation,
		},
		{
			name: "root can clarify",
			form: Form{
				Status:        StatusReturnReported,
				ReturnEpisode: ReturnEpisode{Active: true},
			},
			question:    "Question",
			actorRole:   domain.RoleRoot,
			wantErr:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.form.ValidateMgrReturnClarify(tt.question, tt.fileID, tt.actorRole, tt.actorUserID)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateMgrReturnClarify() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if err != nil && tt.errCode != "" {
				appErr, ok := err.(*apperrors.AppError)
				if !ok {
					t.Errorf("expected AppError, got %T", err)
					return
				}
				if appErr.Code != tt.errCode {
					t.Errorf("error code = %v, want %v", appErr.Code, tt.errCode)
				}
			}
		})
	}
}

func TestApplyMgrReturnClarify(t *testing.T) {
	form := Form{
		Status:        StatusReturnReported,
		ReturnEpisode: ReturnEpisode{Active: true},
	}

	// First clarify
	form.ApplyMgrReturnClarify("Question 1", "file123", "mgr1")

	if form.ReturnEpisode.ClarifyQuestion != "Question 1" {
		t.Errorf("ClarifyQuestion = %v, want Question 1", form.ReturnEpisode.ClarifyQuestion)
	}
	if form.ReturnEpisode.ClarifyFileID != "file123" {
		t.Errorf("ClarifyFileID = %v, want file123", form.ReturnEpisode.ClarifyFileID)
	}
	if form.ReturnEpisode.ClarifyAskedBy != "mgr1" {
		t.Errorf("ClarifyAskedBy = %v, want mgr1", form.ReturnEpisode.ClarifyAskedBy)
	}
	if form.ReturnEpisode.ClarifyCycleCount != 1 {
		t.Errorf("ClarifyCycleCount = %v, want 1", form.ReturnEpisode.ClarifyCycleCount)
	}
	if form.Status != StatusReturnAwaitingClientClarify {
		t.Errorf("Status = %v, want %v", form.Status, StatusReturnAwaitingClientClarify)
	}

	// Client replies
	form.Status = StatusReturnAwaitingClientClarify
	form.ReturnEpisode.ClarifyAnswer = "Answer 1"
	form.ReturnEpisode.ClarifyAnsweredBy = "client1"
	form.ReturnEpisode.ClarifyAnsweredAt = time.Now()
	form.Status = StatusReturnMgrDecision

	// Second clarify (new question)
	form.ApplyMgrReturnClarify("Question 2", "file456", "mgr1")

	if form.ReturnEpisode.ClarifyQuestion != "Question 2" {
		t.Errorf("ClarifyQuestion = %v, want Question 2", form.ReturnEpisode.ClarifyQuestion)
	}
	if form.ReturnEpisode.ClarifyCycleCount != 2 {
		t.Errorf("ClarifyCycleCount = %v, want 2", form.ReturnEpisode.ClarifyCycleCount)
	}
	// Previous answer should be cleared
	if form.ReturnEpisode.ClarifyAnswer != "" {
		t.Errorf("ClarifyAnswer should be empty, got %v", form.ReturnEpisode.ClarifyAnswer)
	}

	// Idempotent repeat (same question)
	oldTimestamp := form.ReturnEpisode.ClarifyAskedAt
	time.Sleep(10 * time.Millisecond)
	form.ApplyMgrReturnClarify("Question 2", "file456", "mgr1")
	if form.ReturnEpisode.ClarifyCycleCount != 2 {
		t.Errorf("ClarifyCycleCount should remain 2 on idempotent repeat, got %v", form.ReturnEpisode.ClarifyCycleCount)
	}
	if !form.ReturnEpisode.ClarifyAskedAt.After(oldTimestamp) {
		t.Errorf("ClarifyAskedAt should be updated on idempotent repeat")
	}
}

func TestValidateClientReturnClarifyReply(t *testing.T) {
	tests := []struct {
		name        string
		form        Form
		answer      string
		fileID      string
		actorRole   domain.Role
		actorUserID string
		wantErr     bool
		errCode     apperrors.ErrorCode
	}{
		{
			name: "happy path client reply",
			form: Form{
				AccountID: "client1",
				Status: StatusReturnAwaitingClientClarify,
				ReturnEpisode: ReturnEpisode{
					Active:          true,
					ClarifyQuestion: "Question?",
				},
			},
			answer:      "Here is answer",
			fileID:      "file789",
			actorRole:   domain.RoleUser,
			actorUserID: "client1",
			wantErr:     false,
		},
		{
			name: "episode not active denied",
			form: Form{
				AccountID: "client1",
				Status: StatusReturnAwaitingClientClarify,
				ReturnEpisode: ReturnEpisode{
					Active:          false,
					ClarifyQuestion: "Question?",
				},
			},
			answer:      "Answer",
			actorRole:   domain.RoleUser,
			actorUserID: "client1",
			wantErr:     true,
			errCode: apperrors.ErrCodeValidation,
		},
		{
			name: "manager cannot reply as client",
			form: Form{
				AccountID: "client1",
				Status: StatusReturnAwaitingClientClarify,
				ReturnEpisode: ReturnEpisode{
					Active:          true,
					ClarifyQuestion: "Question?",
				},
			},
			answer:      "Answer",
			actorRole:   domain.RoleManager,
			actorUserID: "mgr1",
			wantErr:     true,
			errCode: apperrors.ErrCodeForbidden,
		},
		{
			name: "provider cannot reply",
			form: Form{
				AccountID: "client1",
				Status: StatusReturnAwaitingClientClarify,
				ReturnEpisode: ReturnEpisode{
					Active:          true,
					ClarifyQuestion: "Question?",
				},
			},
			answer:      "Answer",
			actorRole:   domain.RoleProvider,
			actorUserID: "prov1",
			wantErr:     true,
			errCode: apperrors.ErrCodeForbidden,
		},
		{
			name: "empty answer denied",
			form: Form{
				AccountID: "client1",
				Status: StatusReturnAwaitingClientClarify,
				ReturnEpisode: ReturnEpisode{
					Active:          true,
					ClarifyQuestion: "Question?",
				},
			},
			answer:      "",
			actorRole:   domain.RoleUser,
			actorUserID: "client1",
			wantErr:     true,
			errCode: apperrors.ErrCodeValidation,
		},
		{
			name: "wrong status denied",
			form: Form{
				AccountID: "client1",
				Status: StatusReturnReported, // not awaiting client
				ReturnEpisode: ReturnEpisode{
					Active:          true,
					ClarifyQuestion: "Question?",
				},
			},
			answer:      "Answer",
			actorRole:   domain.RoleUser,
			actorUserID: "client1",
			wantErr:     true,
			errCode: apperrors.ErrCodeValidation,
		},
		{
			name: "no question to answer denied",
			form: Form{
				AccountID: "client1",
				Status: StatusReturnAwaitingClientClarify,
				ReturnEpisode: ReturnEpisode{
					Active:          true,
					ClarifyQuestion: "", // no question asked
				},
			},
			answer:      "Answer",
			actorRole:   domain.RoleUser,
			actorUserID: "client1",
			wantErr:     true,
			errCode: apperrors.ErrCodeValidation,
		},
		{
			name: "different user denied",
			form: Form{
				AccountID: "client1",
				Status: StatusReturnAwaitingClientClarify,
				ReturnEpisode: ReturnEpisode{
					Active:          true,
					ClarifyQuestion: "Question?",
				},
			},
			answer:      "Answer",
			actorRole:   domain.RoleUser,
			actorUserID: "client2", // different user
			wantErr:     true,
			errCode: apperrors.ErrCodeForbidden,
		},
		{
			name: "root can reply",
			form: Form{
				AccountID: "client1",
				Status: StatusReturnAwaitingClientClarify,
				ReturnEpisode: ReturnEpisode{
					Active:          true,
					ClarifyQuestion: "Question?",
				},
			},
			answer:      "Answer",
			actorRole:   domain.RoleRoot,
			actorUserID: "root1",
			wantErr:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.form.ValidateClientReturnClarifyReply(tt.answer, tt.fileID, tt.actorRole, tt.actorUserID)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateClientReturnClarifyReply() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if err != nil && tt.errCode != "" {
				appErr, ok := err.(*apperrors.AppError)
				if !ok {
					t.Errorf("expected AppError, got %T", err)
					return
				}
				if appErr.Code != tt.errCode {
					t.Errorf("error code = %v, want %v", appErr.Code, tt.errCode)
				}
			}
		})
	}
}

func TestApplyClientReturnClarifyReply(t *testing.T) {
	form := Form{
		AccountID: "client1",
		Status: StatusReturnAwaitingClientClarify,
		ReturnEpisode: ReturnEpisode{
			Active:          true,
			ClarifyQuestion: "Question?",
			ClarifyAskedBy:  "mgr1",
		},
	}

	// Client replies
	form.ApplyClientReturnClarifyReply("Answer", "file999", "client1")

	if form.ReturnEpisode.ClarifyAnswer != "Answer" {
		t.Errorf("ClarifyAnswer = %v, want Answer", form.ReturnEpisode.ClarifyAnswer)
	}
	if form.ReturnEpisode.ClarifyAnswerFileID != "file999" {
		t.Errorf("ClarifyAnswerFileID = %v, want file999", form.ReturnEpisode.ClarifyAnswerFileID)
	}
	if form.ReturnEpisode.ClarifyAnsweredBy != "client1" {
		t.Errorf("ClarifyAnsweredBy = %v, want client1", form.ReturnEpisode.ClarifyAnsweredBy)
	}
	if form.Status != StatusReturnMgrDecision {
		t.Errorf("Status = %v, want %v", form.Status, StatusReturnMgrDecision)
	}
	// Episode should remain active (not terminal)
	if !form.ReturnEpisode.Active {
		t.Errorf("ReturnEpisode.Active should remain true")
	}

	// Idempotent repeat
	oldTimestamp := form.ReturnEpisode.ClarifyAnsweredAt
	time.Sleep(10 * time.Millisecond)
	form.ApplyClientReturnClarifyReply("Answer", "file999", "client1")
	if !form.ReturnEpisode.ClarifyAnsweredAt.After(oldTimestamp) {
		t.Errorf("ClarifyAnsweredAt should be updated on idempotent repeat")
	}
}

func TestClarifyNotTerminal(t *testing.T) {
	// After client replies, episode remains active
	form := Form{
		AccountID: "client1",
		Status: StatusReturnAwaitingClientClarify,
		ReturnEpisode: ReturnEpisode{
			Active:          true,
			ClarifyQuestion: "Question?",
		},
	}

	form.ApplyClientReturnClarifyReply("Answer", "", "client1")

	if form.Status != StatusReturnMgrDecision {
		t.Errorf("Status = %v, want %v", form.Status, StatusReturnMgrDecision)
	}
	if !form.ReturnEpisode.Active {
		t.Errorf("ReturnEpisode.Active should be true (clarify is not terminal)")
	}

	// Manager can clarify again or choose final decision
	// (final decisions will be in stages 3-4)
}
