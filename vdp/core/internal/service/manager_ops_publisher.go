package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/pkg/logger"
	"github.com/viletech/vdp/shared/managerops"
)

// ManagerOpsPublisher posts behavioral events to manager-ops (best-effort).
type ManagerOpsPublisher struct {
	baseURL string
	secret  string
	client  *http.Client
}

// NewManagerOpsPublisher builds a publisher. Empty baseURL disables sends.
func NewManagerOpsPublisher(baseURL, secret string, timeout time.Duration) *ManagerOpsPublisher {
	if timeout <= 0 {
		timeout = 3 * time.Second
	}
	return &ManagerOpsPublisher{
		baseURL: strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		secret:  secret,
		client:  &http.Client{Timeout: timeout},
	}
}

// Publish posts one event; errors are returned for logging only.
func (p *ManagerOpsPublisher) Publish(ctx context.Context, e managerops.Event) error {
	if p == nil || p.baseURL == "" {
		return nil
	}
	body, err := json.Marshal(e)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.baseURL+"/v1/events", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if p.secret != "" {
		req.Header.Set("X-VDP-S2S", p.secret)
	}
	res, err := p.client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		return fmt.Errorf("manager-ops status %d", res.StatusCode)
	}
	return nil
}

// MapManagerAction maps form-payment actions to behavioral kinds.
func MapManagerAction(action formpayment.Action) (managerops.Kind, bool) {
	switch action {
	case formpayment.ActionManagerFormAccept, formpayment.ActionOrderAccept, formpayment.ActionAdvanceAccept,
		formpayment.ActionReportAccept, formpayment.ActionShipmentAccept, formpayment.ActionICOApprove, formpayment.ActionECOAccept:
		return managerops.KindApprove, true
	case formpayment.ActionManagerFormReject, formpayment.ActionOrderReject, formpayment.ActionAdvanceReject,
		formpayment.ActionReportReject, formpayment.ActionShipmentReject, formpayment.ActionICOReject, formpayment.ActionECOReject:
		return managerops.KindReject, true
	case formpayment.ActionAssignProvider, formpayment.ActionAssignAgent, formpayment.ActionAssignDeadline:
		return managerops.KindAssign, true
	case formpayment.ActionManagerFormStart, formpayment.ActionOrderStart, formpayment.ActionPaymentStart,
		formpayment.ActionProviderStart:
		return managerops.KindFirstTouch, true
	default:
		return "", false
	}
}

func (s *FormPaymentService) WithManagerOps(p *ManagerOpsPublisher) *FormPaymentService {
	s.managerOps = p
	return s
}

func (s *FormPaymentService) emitManagerOps(ctx context.Context, principal authz.Principal, form formpayment.Form, action formpayment.Action, historyID string) {
	if s.managerOps == nil {
		return
	}
	if principal.Role != domain.RoleManager && principal.Role != domain.RoleRoot {
		return
	}
	kind, ok := MapManagerAction(action)
	if !ok {
		return
	}
	key := form.ID + "|" + string(action) + "|" + historyID
	e := managerops.Event{
		IdempotencyKey: key,
		AccountID:      principal.AccountID,
		Source:         managerops.SourceCore,
		Kind:           kind,
		FormPaymentID:  form.ID,
		OccurredAt:     time.Now().UTC(),
		Payload:        map[string]any{"action": string(action), "role": string(principal.Role)},
	}
	if err := s.managerOps.Publish(ctx, e); err != nil {
		logger.FromContext(ctx, nil).Warn("manager-ops emit failed", "err", err, "form_payment_id", form.ID, "action", action)
	}
}
