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
	apperrors "github.com/viletech/vdp/core/pkg/errors"
	"github.com/viletech/vdp/shared/events"
)

type IDFunc func() string

type FormPaymentService struct {
	store repository.Store
	box   outbox.Store
	newID IDFunc
}

func NewFormPaymentService(store repository.Store, box outbox.Store, newID IDFunc) *FormPaymentService {
	return &FormPaymentService{store: store, box: box, newID: newID}
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
	ctx = logger.WithFormPaymentID(ctx, form.ID)
	logger.FromContext(ctx, nil).Info("form created")
	if err := s.enqueue(ctx, form, events.TypeOCRRequested, map[string]any{"status": string(form.Status)}); err != nil {
		return formpayment.Form{}, err
	}
	return form, nil
}

func (s *FormPaymentService) Transition(ctx context.Context, principal authz.Principal, formID string, action formpayment.Action) (formpayment.Form, error) {
	form, err := s.store.FormByID(ctx, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
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
	if err := s.store.SaveForm(ctx, next); err != nil {
		return formpayment.Form{}, err
	}
	history := formpayment.ComplianceHistoryEntry{
		ID:            s.newID(),
		FormPaymentID: next.ID,
		ActorID:       principal.AccountID,
		FromStatus:    form.Status,
		ToStatus:      next.Status,
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
	return next, nil
}

func (s *FormPaymentService) AssignDeadline(ctx context.Context, principal authz.Principal, formID string, deadline time.Time) (formpayment.Form, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager); err != nil {
		return formpayment.Form{}, err
	}
	form, err := s.store.FormByID(ctx, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	form.ExecutionDeadline = &deadline
	form.ManagerID = principal.AccountID
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}
	return form, nil
}

func (s *FormPaymentService) AssignProvider(ctx context.Context, principal authz.Principal, formID, providerID string, clientAgreed bool) (formpayment.Form, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager); err != nil {
		return formpayment.Form{}, err
	}
	provider, err := s.store.AccountByID(ctx, providerID)
	if err != nil {
		return formpayment.Form{}, err
	}
	if provider.Role != domain.RoleProvider && provider.Role != domain.RoleSeniorProvider {
		return formpayment.Form{}, apperrors.New(apperrors.ErrCodeValidation, "account is not a provider")
	}
	form, err := s.store.FormByID(ctx, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	form.ProviderID = providerID
	form.ManagerID = principal.AccountID
	form.ClientAgreedProvider = clientAgreed
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}
	return form, nil
}

func (s *FormPaymentService) SetConfirmation(ctx context.Context, principal authz.Principal, formID, fileContent, fileID string) (formpayment.Form, error) {
	if err := authz.RequireRoles(principal, domain.RoleProvider, domain.RoleSeniorProvider); err != nil {
		return formpayment.Form{}, err
	}
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	form.ConfirmationHash = ConfirmationHashXOR(fileContent, form.Currency)
	form.ConfirmationFileID = fileID
	return form, s.store.SaveForm(ctx, form)
}

func (s *FormPaymentService) CalculateAndSetCommission(ctx context.Context, principal authz.Principal, formID, percent string) (formpayment.Form, error) {
	form, err := s.store.FormByID(ctx, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	commission, err := CalculateCommission(form.InvoiceAmount, percent, form.Currency)
	if err != nil {
		return formpayment.Form{}, apperrors.New(apperrors.ErrCodeValidation, err.Error())
	}
	return s.SetCommission(ctx, principal, formID, commission)
}

func (s *FormPaymentService) TransitionByNestPath(ctx context.Context, principal authz.Principal, formID, rolePrefix, pathSuffix string) (formpayment.Form, error) {
	action, ok := formpayment.NestPathAction(rolePrefix, pathSuffix)
	if !ok {
		return formpayment.Form{}, apperrors.New(apperrors.ErrCodeValidation, "unknown nest path action")
	}
	return s.Transition(ctx, principal, formID, action)
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

func (s *FormPaymentService) RequestDocsGenerate(ctx context.Context, principal authz.Principal, formID string) error {
	if err := authz.RequireRoles(principal, domain.RoleManager); err != nil {
		return err
	}
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return err
	}
	return s.enqueue(ctx, form, events.TypeDocsGenerate, map[string]any{"kind": "payment_order"})
}

func (s *FormPaymentService) AssignAgent(ctx context.Context, principal authz.Principal, formID, agentID string) (formpayment.Form, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager); err != nil {
		return formpayment.Form{}, err
	}
	form, err := s.store.FormByID(ctx, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	form.AgentID = agentID
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}
	return form, nil
}

func (s *FormPaymentService) Get(ctx context.Context, principal authz.Principal, formID string) (formpayment.Form, error) {
	form, err := s.store.FormByID(ctx, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	if err := authz.CanAccessForm(principal, form); err != nil {
		return formpayment.Form{}, err
	}
	return form, nil
}

func (s *FormPaymentService) GetProviderView(ctx context.Context, principal authz.Principal, formID string) (formpayment.ProviderView, error) {
	if err := authz.RequireRoles(principal, domain.RoleProvider, domain.RoleSeniorProvider); err != nil {
		return formpayment.ProviderView{}, err
	}
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.ProviderView{}, err
	}
	return formpayment.ProjectForProvider(form), nil
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
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleTreasurer); err != nil {
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
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleTreasurer); err != nil {
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
