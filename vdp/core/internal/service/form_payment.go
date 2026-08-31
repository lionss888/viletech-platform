package service

import (
	"context"
	"fmt"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/pkg/logger"
	"github.com/viletech/vdp/shared/events"
)

type IDFunc func() string

type FormPaymentService struct {
	store repository.Store
	box   outbox.Store
	newID IDFunc
	bus   *FormEventBus
}

func NewFormPaymentService(store repository.Store, box outbox.Store, newID IDFunc) *FormPaymentService {
	return &FormPaymentService{store: store, box: box, newID: newID}
}

func (s *FormPaymentService) WithEventBus(bus *FormEventBus) *FormPaymentService {
	s.bus = bus
	return s
}

type CreateInput struct {
	Direction      formpayment.Direction
	Kind           formpayment.Kind
	InvoiceAmount  string
	Currency       string
	NoDocuments    bool
	ContractNumber string
	ContractDate   string
}

func (s *FormPaymentService) Create(ctx context.Context, principal authz.Principal, input CreateInput) (formpayment.Form, error) {
	if err := authz.RequireRoles(principal, domain.RoleUser); err != nil {
		return formpayment.Form{}, err
	}
	if input.Direction == "" {
		input.Direction = formpayment.DirectionImport
	}
	if input.Kind == "" {
		input.Kind = formpayment.KindGood
	}
	now := time.Now().UTC()
	form := formpayment.Form{
		ID:             s.newID(),
		AccountID:      principal.AccountID,
		OrganizationID: principal.OrganizationID,
		Status:         formpayment.StatusCreating,
		Channel:        formpayment.ChannelUI,
		Direction:      input.Direction,
		Kind:           input.Kind,
		InvoiceAmount:  input.InvoiceAmount,
		Currency:       input.Currency,
		NoDocuments:    input.NoDocuments,
		ContractNumber: input.ContractNumber,
		ContractDate:   input.ContractDate,
		CreatedAt:      now,
		UpdatedAt:      now,
		Rate:           formpayment.Rate{Value: "0", Currency: input.Currency, Source: "manual"},
		Commission:     formpayment.Commission{FeeAmount: "0", FeePercent: "0", FeeCurrency: input.Currency},
	}
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}
	if saved, err := s.store.FormByID(ctx, form.ID); err == nil {
		form = saved
	}
	ctx = logger.WithFormPaymentID(ctx, form.ID)
	logger.FromContext(ctx, nil).Info("form created")
	if input.NoDocuments {
		// Explicit API contract: skip OCR; form stays CREATING until recognize_complete / manual draft.
		return form, nil
	}
	if err := s.enqueue(ctx, form, events.TypeOCRRequested, map[string]any{"status": string(form.Status)}); err != nil {
		return formpayment.Form{}, err
	}
	return form, nil
}

func (s *FormPaymentService) Transition(ctx context.Context, principal authz.Principal, formID string, action formpayment.Action) (formpayment.Form, error) {
	return s.TransitionWithComment(ctx, principal, formID, action, "")
}

func (s *FormPaymentService) TransitionWithComment(ctx context.Context, principal authz.Principal, formID string, action formpayment.Action, comment string) (formpayment.Form, error) {
	form, err := s.store.FormByID(ctx, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	form.UnpackDocsJSON()
	ctx = logger.WithFormPaymentID(ctx, form.ID)
	if err := authz.CanAccessForm(principal, form); err != nil {
		return formpayment.Form{}, err
	}
	org, err := s.store.OrganizationByID(ctx, form.OrganizationID)
	if err != nil {
		return formpayment.Form{}, err
	}
	next, err := formpayment.Apply(formpayment.Command{
		Form:        form,
		Action:      action,
		Role:        principal.Role,
		OrgApproved: org.IsClientActive(),
	})
	if err != nil {
		return formpayment.Form{}, err
	}
	next.PackDocsJSON()
	if err := s.store.SaveForm(ctx, next); err != nil {
		return formpayment.Form{}, err
	}
	if err := s.syncOrdersAfterTransition(ctx, form, next, action); err != nil {
		return formpayment.Form{}, err
	}
	if err := s.syncRefundAfterTransition(ctx, form, next, action, principal.AccountID); err != nil {
		return formpayment.Form{}, err
	}
	// reload after order/refund sync
	if updated, err := s.store.FormByID(ctx, next.ID); err == nil {
		next = updated
		next.UnpackDocsJSON()
	}
	history := formpayment.ComplianceHistoryEntry{
		ID:            s.newID(),
		FormPaymentID: next.ID,
		ActorID:       principal.AccountID,
		FromStatus:    form.Status,
		ToStatus:      next.Status,
		Comment:       comment,
		CreatedAt:     time.Now().UTC(),
	}
	if err := s.store.AppendHistory(ctx, history); err != nil {
		return formpayment.Form{}, err
	}
	logger.FromContext(ctx, nil).Info("form transition", "from", form.Status, "to", next.Status, "action", action)
	payload := map[string]any{
		"from":   string(form.Status),
		"to":     string(next.Status),
		"action": string(action),
		"role":   string(principal.Role),
	}
	if err := s.enqueue(ctx, next, events.TypeFormPaymentStatusChanged, payload); err != nil {
		return formpayment.Form{}, err
	}
	if err := s.enqueue(ctx, next, events.TypeTelegramNotify, payload); err != nil {
		return formpayment.Form{}, err
	}
	if err := s.afterStatusChanged(ctx, form, next, action, payload); err != nil {
		return formpayment.Form{}, err
	}
	s.maybeEnqueueBankWebhook(ctx, next, payload)
	return next, nil
}

func (s *FormPaymentService) afterStatusChanged(ctx context.Context, prev, next formpayment.Form, action formpayment.Action, payload map[string]any) error {
	if s.bus != nil {
		s.bus.Publish(next.ID, "status_changed", payload)
	}
	if tpl := mailTemplateForStatus(next.Status); tpl != "" {
		mailPayload := map[string]any{"template": tpl, "from": string(prev.Status), "to": string(next.Status)}
		if err := s.enqueue(ctx, next, events.TypeMailNotify, mailPayload); err != nil {
			return err
		}
	}
	if action == formpayment.ActionRefundInit {
		task := domain.TreasurerTask{
			ID: s.newID(), FormPaymentID: next.ID, Kind: "refund", Status: "open",
			Amount: next.InvoiceAmount, Currency: next.Currency, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(),
		}
		_ = s.store.SaveTreasurerTask(ctx, task)
	}
	return nil
}

func mailTemplateForStatus(st formpayment.Status) string {
	switch st {
	case formpayment.StatusFormAccepted:
		return "form_accepted"
	case formpayment.StatusSigningOrderAccepted:
		return "order_accepted"
	case formpayment.StatusPaymentSent:
		return "payment_sent"
	case formpayment.StatusCompleted:
		return "completed"
	case formpayment.StatusPaymentRefundSent:
		return "refund_sent"
	default:
		return ""
	}
}

func (s *FormPaymentService) CalculateAndSetCommission(ctx context.Context, principal authz.Principal, formID, percent string) (formpayment.Form, error) {
	form, _, err := s.CalculateAndApplyCommission(ctx, principal, formID, percent)
	return form, err
}

func (s *FormPaymentService) SetImportant(ctx context.Context, principal authz.Principal, formID string, important bool) (formpayment.Form, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleProvider); err != nil {
		return formpayment.Form{}, err
	}
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	form.Important = important
	return form, s.store.SaveForm(ctx, form)
}

func (s *FormPaymentService) Get(ctx context.Context, principal authz.Principal, formID string) (formpayment.Form, error) {
	form, err := s.store.FormByID(ctx, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	if err := authz.CanAccessForm(principal, form); err != nil {
		return formpayment.Form{}, err
	}
	form.UnpackDocsJSON()
	return form, nil
}

func (s *FormPaymentService) List(ctx context.Context, principal authz.Principal) []formpayment.Form {
	out := make([]formpayment.Form, 0)
	for _, form := range s.store.ListForms(ctx) {
		if formpayment.CanSeeForm(principal.Role, principal.AccountID, form) {
			out = append(out, form)
		}
	}
	return out
}

func (s *FormPaymentService) SetRate(ctx context.Context, principal authz.Principal, formID string, rate formpayment.Rate) (formpayment.Form, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleTreasurer, domain.RoleRoot, domain.RoleUser); err != nil {
		return formpayment.Form{}, err
	}
	form, err := s.store.FormByID(ctx, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	form.Rate = rate
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}
	return form, nil
}

func (s *FormPaymentService) SetCommission(ctx context.Context, principal authz.Principal, formID string, commission formpayment.Commission) (formpayment.Form, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleTreasurer, domain.RoleRoot, domain.RoleUser); err != nil {
		return formpayment.Form{}, err
	}
	form, err := s.store.FormByID(ctx, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	form.Commission = commission
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}
	return form, nil
}

func (s *FormPaymentService) enqueue(ctx context.Context, form formpayment.Form, eventType string, payload map[string]any) error {
	if s.box == nil {
		return nil
	}
	event := outbox.Event{
		ID:            s.newID(),
		AggregateID:   form.ID,
		AggregateType: events.AggregateFormPayment,
		EventType:     eventType,
		FormPaymentID: form.ID,
		Payload:       payload,
		Status:        "pending",
		MaxRetries:    3,
		CreatedAt:     time.Now().UTC(),
	}
	if err := s.box.Enqueue(ctx, event); err != nil {
		return fmt.Errorf("enqueue outbox: %w", err)
	}
	return nil
}
