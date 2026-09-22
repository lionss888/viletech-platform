package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
	"github.com/viletech/vdp/core/pkg/logger"
	"github.com/viletech/vdp/shared/events"
)

// IDFunc generates opaque string ids for forms, docs, and related entities.
type IDFunc func() string

// FormPaymentService orchestrates form-payment create, transition, assign, and side effects.
type FormPaymentService struct {
	store           repository.Store
	box             outbox.Store
	newID           IDFunc
	bus             *FormEventBus
	roles           *ProcessRoleService
	extractionURL   string
	hubSharedSecret string
	managerOps      *ManagerOpsPublisher
}

// NewFormPaymentService wires store, outbox, and default process-role service.
func NewFormPaymentService(store repository.Store, box outbox.Store, newID IDFunc) *FormPaymentService {
	return &FormPaymentService{store: store, box: box, newID: newID, roles: NewProcessRoleService(store)}
}

func (s *FormPaymentService) WithEventBus(bus *FormEventBus) *FormPaymentService {
	s.bus = bus
	return s
}

func (s *FormPaymentService) WithProcessRoles(roles *ProcessRoleService) *FormPaymentService {
	if roles != nil {
		s.roles = roles
	}
	return s
}

// WithExtractionURL sets base URL for gold/human S2S (e.g. http://extraction:8093).
func (s *FormPaymentService) WithExtractionURL(url, hubSecret string) *FormPaymentService {
	s.extractionURL = strings.TrimRight(strings.TrimSpace(url), "/")
	s.hubSharedSecret = hubSecret
	return s
}

func (s *FormPaymentService) ProcessRoles() *ProcessRoleService {
	return s.roles
}

type CreateInput struct {
	Direction      formpayment.Direction
	Kind           formpayment.Kind
	InvoiceAmount  string
	Currency       string
	NoDocuments    bool
	ContractNumber string
	ContractDate   string
	OrganizationID string
	CounterpartyID string
	PaymentMethod  string
}

func (s *FormPaymentService) Create(ctx context.Context, principal authz.Principal, input CreateInput) (formpayment.Form, error) {
	if err := authz.AuthorizeRoles(principal, domain.RoleUser); err != nil {
		return formpayment.Form{}, err
	}
	if input.Direction == "" {
		input.Direction = formpayment.DirectionImport
	}
	if input.Kind == "" {
		input.Kind = formpayment.KindGood
	}
	orgID, err := s.resolveCreateOrganizationID(ctx, principal, input.OrganizationID)
	if err != nil {
		return formpayment.Form{}, err
	}
	now := time.Now().UTC()
	policyVersion := 1
	if s.roles != nil {
		if snap, err := s.roles.GetSnapshot(ctx); err == nil {
			policyVersion = snap.Version
		}
	}
	form := formpayment.Form{
		ID:                   s.newID(),
		AccountID:            principal.AccountID,
		OrganizationID:       orgID,
		CounterpartyID:       input.CounterpartyID,
		Status:               formpayment.StatusCreating,
		Channel:              formpayment.ChannelUI,
		Direction:            input.Direction,
		Kind:                 input.Kind,
		InvoiceAmount:        input.InvoiceAmount,
		Currency:             input.Currency,
		NoDocuments:          input.NoDocuments,
		ContractNumber:       input.ContractNumber,
		ContractDate:         input.ContractDate,
		PaymentMethod:        input.PaymentMethod,
		ProcessPolicyVersion: policyVersion,
		CreatedAt:            now,
		UpdatedAt:            now,
		Rate:                 formpayment.Rate{Value: "0", Currency: input.Currency, Source: "manual"},
		Commission:           formpayment.Commission{FeeAmount: "0", FeePercent: "0", FeeCurrency: input.Currency},
	}
	formpayment.ApplyImportPostpayDefaults(&form)
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}
	if saved, err := s.store.FormByID(ctx, form.ID); err == nil {
		form = saved
	}
	ctx = logger.WithFormPaymentID(ctx, form.ID)
	logger.FromContext(ctx, nil).Info("form created")
	// OCR is deferred to first document attach (CatalogService.AttachFileToForm).
	// NoDocuments still skips OCR entirely; form stays CREATING until recognize_complete.
	return form, nil
}

// resolveCreateOrganizationID requires a visible client org for RoleUser and prefers an explicit id.
func (s *FormPaymentService) resolveCreateOrganizationID(ctx context.Context, principal authz.Principal, requested string) (string, error) {
	visible, err := s.visibleClientOrganizations(ctx, principal)
	if err != nil {
		return "", err
	}
	if len(visible) == 0 {
		return "", apperrors.New(apperrors.ErrCodeForbidden, "client organization required before creating a form")
	}
	if requested != "" {
		for _, org := range visible {
			if org.ID == requested {
				return requested, nil
			}
		}
		return "", apperrors.New(apperrors.ErrCodeForbidden, "organization not available to this account")
	}
	if principal.OrganizationID != "" {
		for _, org := range visible {
			if org.ID == principal.OrganizationID {
				return principal.OrganizationID, nil
			}
		}
	}
	return visible[0].ID, nil
}

func (s *FormPaymentService) visibleClientOrganizations(ctx context.Context, principal authz.Principal) ([]domain.Organization, error) {
	all, err := s.store.ListOrganizations(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]domain.Organization, 0)
	for _, org := range all {
		if org.Type == domain.OrgTypeProvider {
			continue
		}
		if formOrgVisibleTo(principal, org) {
			out = append(out, org)
		}
	}
	return out, nil
}

func formOrgVisibleTo(principal authz.Principal, org domain.Organization) bool {
	switch principal.Role {
	case domain.RoleRoot, domain.RoleManager, domain.RoleTreasurer,
		domain.RoleComplianceOfficer, domain.RoleInternalComplianceOfficer:
		return true
	case domain.RoleUser:
		if org.AccountID == principal.AccountID || org.ID == principal.OrganizationID {
			return true
		}
		for _, id := range org.Subaccounts {
			if id == principal.AccountID {
				return true
			}
		}
		for _, id := range org.InvitedIDs {
			if id == principal.AccountID {
				return true
			}
		}
		return false
	default:
		return false
	}
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
	if err := s.guardBeforeApply(ctx, principal, &form, action); err != nil {
		return formpayment.Form{}, err
	}
	var policy *formpayment.ProcessPolicySnapshot
	if s.roles != nil {
		if snap, err := s.roles.GetSnapshot(ctx); err == nil {
			policy = &snap
		}
	}
	next, err := formpayment.Apply(formpayment.Command{
		Form:        form,
		Action:      action,
		Role:        principal.Role,
		OrgApproved: org.IsClientActive(),
		Policy:      policy,
	})
	if err != nil {
		return formpayment.Form{}, err
	}
	// Claim the manager who takes or confirms the form, not only a disabled compliance slot.
	if principal.Role == domain.RoleManager && next.ManagerID == "" {
		next.ManagerID = principal.AccountID
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
	if err := s.enqueueTelegram(ctx, next, payload); err != nil {
		return formpayment.Form{}, err
	}
	if err := s.afterStatusChanged(ctx, form, next, action, payload); err != nil {
		return formpayment.Form{}, err
	}
	if action == formpayment.ActionManagerSendOrder {
		if err := s.RequestPaymentOrderGeneration(ctx, principal, next.ID, pogKindForDirection(next.Direction)); err != nil {
			return formpayment.Form{}, err
		}
		if reloaded, err := s.store.FormByID(ctx, next.ID); err == nil {
			reloaded.UnpackDocsJSON()
			next = reloaded
		}
	}
	s.maybeEnqueueBankWebhook(ctx, next, payload)
	s.emitManagerOps(ctx, principal, next, action, history.ID)
	return next, nil
}

// guardBeforeApply enforces policy that is not a status-graph edge: invoice on confirm,
// one accepted agency contract per organization, and creating that contract from the uploaded file.
func (s *FormPaymentService) guardBeforeApply(ctx context.Context, principal authz.Principal, form *formpayment.Form, action formpayment.Action) error {
	switch action {
	case formpayment.ActionECOAccept, formpayment.ActionManagerFormAccept:
		if form.Status == formpayment.StatusFormAccepted {
			return nil
		}
		if !form.HasInvoiceDocument() {
			return apperrors.New(apperrors.ErrCodeConflict, "invoice document is required")
		}
	case formpayment.ActionUserUploadContract:
		if form.Status == formpayment.StatusContractWaitingCorrection {
			return nil
		}
		accepted, err := s.orgHasAcceptedAgencyContract(ctx, form.OrganizationID)
		if err != nil {
			return err
		}
		if accepted {
			return apperrors.New(apperrors.ErrCodeConflict, "organization already has an accepted agency contract")
		}
	case formpayment.ActionManagerSendOrder:
		if form.ContractID != "" || form.Status != formpayment.StatusContractVerification {
			return nil
		}
		fileID := form.ContractFileID()
		if fileID == "" {
			return apperrors.New(apperrors.ErrCodeConflict, "contract file is required")
		}
		contractID, err := s.saveAcceptedAgencyContract(ctx, principal, *form, fileID)
		if err != nil {
			return err
		}
		form.ContractID = contractID
	}
	return nil
}

func (s *FormPaymentService) orgHasAcceptedAgencyContract(ctx context.Context, orgID string) (bool, error) {
	if strings.TrimSpace(orgID) == "" {
		return false, nil
	}
	rows, err := s.store.ListContractsByOrg(ctx, orgID)
	if err != nil {
		return false, err
	}
	for _, row := range rows {
		if row.Status != domain.ContractStatusAccepted {
			continue
		}
		if row.Type == domain.ContractTypeAgency || row.Type == domain.ContractTypeSubagency {
			return true, nil
		}
	}
	return false, nil
}

func (s *FormPaymentService) saveAcceptedAgencyContract(ctx context.Context, principal authz.Principal, form formpayment.Form, fileID string) (string, error) {
	now := time.Now().UTC()
	contract := domain.Contract{
		ID:             s.newID(),
		Type:           domain.ContractTypeAgency,
		OrganizationID: form.OrganizationID,
		AgentID:        form.AgentID,
		Status:         domain.ContractStatusAccepted,
		UploadedBy:     principal.AccountID,
		FileID:         fileID,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if err := s.store.SaveContract(ctx, contract); err != nil {
		return "", err
	}
	return contract.ID, nil
}

func (s *FormPaymentService) afterStatusChanged(ctx context.Context, prev, next formpayment.Form, action formpayment.Action, payload map[string]any) error {
	if s.bus != nil {
		s.bus.Publish(next.ID, "status_changed", payload)
	}
	if tpl := mailTemplateForStatus(next.Status); tpl != "" {
		mailPayload := map[string]any{"template": tpl, "from": string(prev.Status), "status_to": string(next.Status)}
		if acc, err := s.store.AccountByID(ctx, next.AccountID); err == nil && acc.Email != "" {
			mailPayload["to"] = acc.Email
		}
		if err := s.enqueue(ctx, next, events.TypeMailNotify, mailPayload); err != nil {
			return err
		}
	}
	if err := s.enqueueSMSIfNeeded(ctx, next, action); err != nil {
		return err
	}
	if next.Status == formpayment.StatusPaymentSent {
		_ = s.enqueue(ctx, next, events.TypeOneCPaymentRequested, map[string]any{"operation": "cover"})
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
	if err := authz.AuthorizeRoles(principal, domain.RoleManager, domain.RoleProvider); err != nil {
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
			if principal.Role == domain.RoleProvider || principal.Role == domain.RoleSeniorProvider {
				form = formpayment.ScrubFormForProvider(form)
			}
			out = append(out, form)
		}
	}
	return out
}

func (s *FormPaymentService) SetRate(ctx context.Context, principal authz.Principal, formID string, rate formpayment.Rate) (formpayment.Form, error) {
	if err := authz.AuthorizeRoles(principal, domain.RoleManager, domain.RoleTreasurer, domain.RoleRoot, domain.RoleUser); err != nil {
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

// SetCommission fixes deal commission with reward mode (fixed / percent / percent_plus_fixed).
// Validates and normalizes input (§10.5). Role: Manager/Treasurer/User or Root. No status change; stored for order generation.
func (s *FormPaymentService) SetCommission(ctx context.Context, principal authz.Principal, formID string, commission formpayment.Commission) (formpayment.Form, error) {
	if err := authz.AuthorizeRoles(principal, domain.RoleManager, domain.RoleTreasurer, domain.RoleRoot, domain.RoleUser); err != nil {
		return formpayment.Form{}, err
	}
	form, err := s.store.FormByID(ctx, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	normalized, err := commission.NormalizeAndCompute(form.InvoiceAmount)
	if err != nil {
		return formpayment.Form{}, apperrors.New(apperrors.ErrCodeValidation, err.Error())
	}
	form.Commission = normalized
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}
	s.maybeAutoEnqueuePOG(ctx, principal, form)
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
