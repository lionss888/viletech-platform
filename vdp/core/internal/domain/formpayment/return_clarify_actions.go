package formpayment

import (
	"time"

	"github.com/viletech/vdp/core/internal/domain"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

// ValidateMgrReturnClarify checks guards for manager asking client for clarification (stage 2).
// Инварианты:
// 1. Эпизод возврата активен
// 2. Только менеджер может спрашивать
// 3. Вопрос обязателен
// 4. Статус позволяет clarify (return_reported или return_mgr_decision)
func (f Form) ValidateMgrReturnClarify(question, fileID string, actorRole domain.Role, actorUserID string) error {
	// Guard: эпизод активен
	if !f.ReturnEpisode.Active {
		return apperrors.New(apperrors.ErrCodeValidation, "return episode not active")
	}

	// Guard: только менеджер
	if actorRole != domain.RoleManager && actorRole != domain.RoleRoot {
		return apperrors.New(apperrors.ErrCodeForbidden, "only manager can clarify")
	}

	// Guard: вопрос обязателен
	if question == "" {
		return apperrors.New(apperrors.ErrCodeValidation, "clarify question required")
	}

	// Guard: статус должен позволять clarify (менеджер в точке решения)
	if f.Status != StatusReturnReported && f.Status != StatusReturnMgrDecision {
		return apperrors.New(apperrors.ErrCodeValidation, "clarify only from mgr decision point")
	}

	return nil
}

// ApplyMgrReturnClarify records manager's clarification question and moves to awaiting client reply.
func (f *Form) ApplyMgrReturnClarify(question, fileID, actorUserID string) {
	// Идемпотентность: если уже задан тот же вопрос, обновить timestamp
	if f.ReturnEpisode.ClarifyQuestion == question && f.ReturnEpisode.ClarifyFileID == fileID {
		f.ReturnEpisode.ClarifyAskedAt = time.Now()
		return
	}

	// Записать вопрос менеджера
	f.ReturnEpisode.ClarifyQuestion = question
	f.ReturnEpisode.ClarifyFileID = fileID
	f.ReturnEpisode.ClarifyAskedBy = actorUserID
	f.ReturnEpisode.ClarifyAskedAt = time.Now()

	// Увеличить счётчик кругов
	f.ReturnEpisode.ClarifyCycleCount++

	// Очистить предыдущий ответ клиента (если был)
	f.ReturnEpisode.ClarifyAnswer = ""
	f.ReturnEpisode.ClarifyAnswerFileID = ""
	f.ReturnEpisode.ClarifyAnsweredBy = ""
	f.ReturnEpisode.ClarifyAnsweredAt = time.Time{}

	// Переход в статус ожидания клиента
	f.Status = StatusReturnAwaitingClientClarify
}

// ValidateClientReturnClarifyReply checks guards for client replying to manager's question (stage 2).
// Инварианты:
// 1. Эпизод активен
// 2. Только клиент может отвечать
// 3. Ответ обязателен
// 4. Статус = return_awaiting_client_clarify
// 5. Менеджер задал вопрос
func (f Form) ValidateClientReturnClarifyReply(answer, fileID string, actorRole domain.Role, actorUserID string) error {
	// Guard: эпизод активен
	if !f.ReturnEpisode.Active {
		return apperrors.New(apperrors.ErrCodeValidation, "return episode not active")
	}

	// Guard: только клиент
	if actorRole != domain.RoleUser && actorRole != domain.RoleRoot {
		return apperrors.New(apperrors.ErrCodeForbidden, "only client can reply")
	}

	// Guard: клиент должен быть владельцем заявки
	if actorUserID != f.AccountID && actorRole != domain.RoleRoot {
		return apperrors.New(apperrors.ErrCodeForbidden, "not form owner")
	}

	// Guard: ответ обязателен
	if answer == "" {
		return apperrors.New(apperrors.ErrCodeValidation, "clarify answer required")
	}

	// Guard: статус должен быть awaiting_client_clarify
	if f.Status != StatusReturnAwaitingClientClarify {
		return apperrors.New(apperrors.ErrCodeValidation, "reply only when awaiting client clarify")
	}

	// Guard: менеджер должен был задать вопрос
	if f.ReturnEpisode.ClarifyQuestion == "" {
		return apperrors.New(apperrors.ErrCodeValidation, "no question to answer")
	}

	return nil
}

// ApplyClientReturnClarifyReply records client's answer and returns to manager decision point.
// Episode remains active (not terminal).
func (f *Form) ApplyClientReturnClarifyReply(answer, fileID, actorUserID string) {
	// Идемпотентность: если уже ответ с теми же параметрами, обновить timestamp
	if f.ReturnEpisode.ClarifyAnswer == answer && f.ReturnEpisode.ClarifyAnswerFileID == fileID {
		f.ReturnEpisode.ClarifyAnsweredAt = time.Now()
		return
	}

	// Записать ответ клиента
	f.ReturnEpisode.ClarifyAnswer = answer
	f.ReturnEpisode.ClarifyAnswerFileID = fileID
	f.ReturnEpisode.ClarifyAnsweredBy = actorUserID
	f.ReturnEpisode.ClarifyAnsweredAt = time.Now()

	// Переход обратно к точке решения менеджера
	// Эпизод остаётся активным (не закрывается)
	f.Status = StatusReturnMgrDecision
}
