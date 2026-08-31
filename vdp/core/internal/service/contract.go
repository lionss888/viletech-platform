package service

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

func (s *CatalogService) CreateContract(ctx context.Context, principal authz.Principal, orgID string) (domain.Contract, error) {
	return s.CreateContractFull(ctx, principal, domain.Contract{
		OrganizationID: orgID,
		Type:           domain.ContractTypeAgency,
		Status:         domain.ContractStatusCreated,
	})
}

func (s *CatalogService) CreateContractFull(ctx context.Context, principal authz.Principal, in domain.Contract) (domain.Contract, error) {
	if err := authz.RequireRoles(principal, domain.RoleUser, domain.RoleManager, domain.RoleRoot); err != nil {
		return domain.Contract{}, err
	}
	if in.Type == "" {
		in.Type = domain.ContractTypeAgency
	}
	if err := validateContractTypeFields(in); err != nil {
		return domain.Contract{}, err
	}
	now := time.Now().UTC()
	if in.ID == "" {
		in.ID = s.newID()
	}
	if in.Status == "" {
		in.Status = domain.ContractStatusCreated
	}
	if in.UploadedBy == "" {
		in.UploadedBy = principal.AccountID
	}
	if in.OrganizationID == "" && !in.IsTemplate && in.Type != domain.ContractTypeServices {
		in.OrganizationID = principal.OrganizationID
	}
	in.CreatedAt = now
	in.UpdatedAt = now
	in.HistoryJSON = appendContractHistory(in.HistoryJSON, principal.AccountID, "create", "", string(in.Status), "")
	return in, s.store.SaveContract(ctx, in)
}

func (s *CatalogService) CreateContractTemplate(ctx context.Context, principal authz.Principal, agentID, name, fileID string, ctype domain.ContractType) (domain.Contract, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleRoot); err != nil {
		return domain.Contract{}, err
	}
	if agentID == "" {
		return domain.Contract{}, apperrors.New(apperrors.ErrCodeValidation, "agent_id required for contract template")
	}
	if _, err := s.store.AgentByID(ctx, agentID); err != nil {
		return domain.Contract{}, err
	}
	if ctype == "" {
		ctype = domain.ContractTypeAgency
	}
	c := domain.Contract{
		ID: s.newID(), Type: ctype, AgentID: agentID, IsTemplate: true,
		Status: domain.ContractStatusAccepted, UploadedBy: principal.AccountID, FileID: fileID,
		Number: name, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(),
	}
	c.HistoryJSON = appendContractHistory("", principal.AccountID, "create_template", "", string(c.Status), name)
	return c, s.store.SaveContract(ctx, c)
}

func (s *CatalogService) ListContracts(ctx context.Context) ([]domain.Contract, error) {
	return s.store.ListContracts(ctx)
}

func (s *CatalogService) ListContractsForOrg(ctx context.Context, orgID string) ([]domain.Contract, error) {
	return s.store.ListContractsByOrg(ctx, orgID)
}

func (s *CatalogService) GetContract(ctx context.Context, id string) (domain.Contract, error) {
	return s.store.ContractByID(ctx, id)
}

func (s *CatalogService) TemplatesForAgent(ctx context.Context, agentID string) ([]domain.Contract, error) {
	return s.store.ListContractTemplatesByAgent(ctx, agentID)
}

func (s *CatalogService) UpdateContract(ctx context.Context, principal authz.Principal, id string, patch domain.Contract) (domain.Contract, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleRoot, domain.RoleUser); err != nil {
		return domain.Contract{}, err
	}
	cur, err := s.store.ContractByID(ctx, id)
	if err != nil {
		return domain.Contract{}, err
	}
	from := string(cur.Status)
	if patch.Type != "" && (principal.Role == domain.RoleRoot || principal.Role == domain.RoleManager) {
		cur.Type = patch.Type
	}
	if patch.FileID != "" {
		cur.FileID = patch.FileID
	}
	if patch.Number != "" {
		cur.Number = patch.Number
	}
	if patch.Date != "" {
		cur.Date = patch.Date
	}
	if patch.AccountRef != "" {
		cur.AccountRef = patch.AccountRef
	}
	if patch.OrganizationID != "" {
		cur.OrganizationID = patch.OrganizationID
	}
	if patch.AgentID != "" {
		cur.AgentID = patch.AgentID
	}
	if patch.Status != "" && (principal.Role == domain.RoleManager || principal.Role == domain.RoleRoot) {
		cur.Status = patch.Status
	}
	if err := validateContractTypeFields(cur); err != nil {
		return domain.Contract{}, err
	}
	cur.UpdatedAt = time.Now().UTC()
	cur.HistoryJSON = appendContractHistory(cur.HistoryJSON, principal.AccountID, "update", from, string(cur.Status), "")
	return cur, s.store.SaveContract(ctx, cur)
}

func (s *CatalogService) AcceptContract(ctx context.Context, principal authz.Principal, id string) (domain.Contract, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleRoot); err != nil {
		return domain.Contract{}, err
	}
	cur, err := s.store.ContractByID(ctx, id)
	if err != nil {
		return domain.Contract{}, err
	}
	from := string(cur.Status)
	cur.Status = domain.ContractStatusAccepted
	cur.UpdatedAt = time.Now().UTC()
	cur.HistoryJSON = appendContractHistory(cur.HistoryJSON, principal.AccountID, "accept", from, string(cur.Status), "")
	return cur, s.store.SaveContract(ctx, cur)
}

func (s *CatalogService) RejectContract(ctx context.Context, principal authz.Principal, id, text string) (domain.Contract, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleRoot); err != nil {
		return domain.Contract{}, err
	}
	cur, err := s.store.ContractByID(ctx, id)
	if err != nil {
		return domain.Contract{}, err
	}
	from := string(cur.Status)
	cur.Status = domain.ContractStatusRejected
	cur.RejectText = text
	cur.UpdatedAt = time.Now().UTC()
	cur.HistoryJSON = appendContractHistory(cur.HistoryJSON, principal.AccountID, "reject", from, string(cur.Status), text)
	return cur, s.store.SaveContract(ctx, cur)
}

func (s *CatalogService) ChangeContractType(ctx context.Context, principal authz.Principal, id string, ctype domain.ContractType) (domain.Contract, error) {
	if err := authz.RequireRoles(principal, domain.RoleRoot, domain.RoleManager); err != nil {
		return domain.Contract{}, err
	}
	cur, err := s.store.ContractByID(ctx, id)
	if err != nil {
		return domain.Contract{}, err
	}
	from := string(cur.Type)
	cur.Type = ctype
	cur.UpdatedAt = time.Now().UTC()
	cur.HistoryJSON = appendContractHistory(cur.HistoryJSON, principal.AccountID, "change_type", from, string(ctype), "")
	if err := validateContractTypeFields(cur); err != nil {
		return domain.Contract{}, err
	}
	return cur, s.store.SaveContract(ctx, cur)
}

// ManualAttachAndConfirm §2: manager uploads contract → auto-accepted + form leaves CONTRACT_*.
func (s *FormPaymentService) ManualAttachContract(ctx context.Context, principal authz.Principal, formID string, ctype domain.ContractType, fileID, number string, accountRef string) (formpayment.Form, domain.Contract, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleRoot); err != nil {
		return formpayment.Form{}, domain.Contract{}, err
	}
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, domain.Contract{}, err
	}
	if ctype == "" {
		ctype = domain.ContractTypeAgency
	}
	if fileID == "" {
		return formpayment.Form{}, domain.Contract{}, apperrors.New(apperrors.ErrCodeValidation, "file_id required")
	}
	switch form.Status {
	case formpayment.StatusFormAccepted, formpayment.StatusContractWaiting,
		formpayment.StatusContractVerification, formpayment.StatusContractWaitingCorrection:
		// ok
	default:
		return formpayment.Form{}, domain.Contract{}, apperrors.New(apperrors.ErrCodeConflict, "manual attach only from form_accepted or CONTRACT_*")
	}
	c := domain.Contract{
		ID: s.newID(), Type: ctype, OrganizationID: form.OrganizationID, AgentID: form.AgentID,
		AccountRef: accountRef, Status: domain.ContractStatusAccepted, UploadedBy: principal.AccountID,
		FileID: fileID, Number: number, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(),
	}
	if ctype == domain.ContractTypeServices && accountRef == "" {
		c.AccountRef = principal.AccountID
	}
	if err := validateContractTypeFields(c); err != nil {
		return formpayment.Form{}, domain.Contract{}, err
	}
	c.HistoryJSON = appendContractHistory("", principal.AccountID, "manual_attach_auto_confirm", string(form.Status), string(c.Status), "")
	if err := s.store.SaveContract(ctx, c); err != nil {
		return formpayment.Form{}, domain.Contract{}, err
	}
	form.ContractID = c.ID
	form.ContractNumber = number
	prev := form.Status
	form.PrevStatus = prev
	form.Status = formpayment.StatusSigningOrder
	form.UpdatedAt = time.Now().UTC()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, domain.Contract{}, err
	}
	_ = s.store.AppendHistory(ctx, formpayment.ComplianceHistoryEntry{
		ID: s.newID(), FormPaymentID: form.ID, ActorID: principal.AccountID,
		FromStatus: prev, ToStatus: form.Status, Comment: "manual_contract_attach:" + c.ID, CreatedAt: time.Now().UTC(),
	})
	return form, c, nil
}

// ResolveContractBranch after agent assign: set form CONTRACT_* or ready for order.
func (s *FormPaymentService) ResolveContractBranch(ctx context.Context, principal authz.Principal, formID string) (formpayment.Form, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleRoot); err != nil {
		return formpayment.Form{}, err
	}
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	if form.AgentID == "" {
		return formpayment.Form{}, apperrors.New(apperrors.ErrCodeValidation, "agent_id required before contract branch")
	}
	orgs, err := s.store.ListContractsByOrg(ctx, form.OrganizationID)
	if err != nil {
		return formpayment.Form{}, err
	}
	var best *domain.Contract
	for i := range orgs {
		c := orgs[i]
		if c.AgentID != "" && c.AgentID != form.AgentID {
			continue
		}
		if c.Type != domain.ContractTypeAgency && c.Type != domain.ContractTypeSubagency {
			continue
		}
		best = &c
		if c.Status == domain.ContractStatusAccepted {
			break
		}
	}
	prev := form.Status
	switch {
	case best == nil:
		form.Status = formpayment.StatusContractWaiting
	case best.Status == domain.ContractStatusAccepted:
		form.ContractID = best.ID
		if prev == formpayment.StatusFormAccepted || prev == formpayment.StatusContractWaiting ||
			prev == formpayment.StatusContractVerification || prev == formpayment.StatusContractWaitingCorrection {
			form.Status = formpayment.StatusSigningOrder
		}
	case best.Status == domain.ContractStatusDeactivated || best.Status == domain.ContractStatusRejected:
		form.ContractID = best.ID
		form.Status = formpayment.StatusContractWaitingCorrection
	default:
		form.ContractID = best.ID
		form.Status = formpayment.StatusContractVerification
	}
	form.PrevStatus = prev
	form.UpdatedAt = time.Now().UTC()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, err
	}
	_ = s.store.AppendHistory(ctx, formpayment.ComplianceHistoryEntry{
		ID: s.newID(), FormPaymentID: form.ID, ActorID: principal.AccountID,
		FromStatus: prev, ToStatus: form.Status, Comment: "resolve_contract_branch", CreatedAt: time.Now().UTC(),
	})
	return form, nil
}

func (s *FormPaymentService) SetOnBehalfOrganization(ctx context.Context, principal authz.Principal, formID, onBehalfOrgID, contractTypeHint string) (formpayment.Form, error) {
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	ctype := domain.ContractType(contractTypeHint)
	if ctype == "" && form.ContractID != "" {
		if c, cerr := s.store.ContractByID(ctx, form.ContractID); cerr == nil {
			ctype = c.Type
		}
	}
	if ctype == domain.ContractTypeSubagency && strings.TrimSpace(onBehalfOrgID) == "" {
		return formpayment.Form{}, apperrors.New(apperrors.ErrCodeValidation, "on_behalf_organization_id required for subagency")
	}
	if ctype == domain.ContractTypeAgency && onBehalfOrgID != "" {
		// allowed but optional — keep value
	}
	if onBehalfOrgID != "" {
		if _, err := s.store.OrganizationByID(ctx, onBehalfOrgID); err != nil {
			return formpayment.Form{}, err
		}
	}
	form.OnBehalfOrganizationID = onBehalfOrgID
	form.UpdatedAt = time.Now().UTC()
	return form, s.store.SaveForm(ctx, form)
}

func (s *FormPaymentService) RequiresOnBehalf(ctx context.Context, formID string) (bool, error) {
	form, err := s.store.FormByID(ctx, formID)
	if err != nil {
		return false, err
	}
	if form.ContractID == "" {
		return false, nil
	}
	c, err := s.store.ContractByID(ctx, form.ContractID)
	if err != nil {
		return false, err
	}
	return c.Type == domain.ContractTypeSubagency, nil
}

func validateContractTypeFields(c domain.Contract) error {
	switch c.Type {
	case domain.ContractTypeAgency, domain.ContractTypeSubagency:
		if !c.IsTemplate && c.OrganizationID == "" {
			return apperrors.New(apperrors.ErrCodeValidation, "organization_id required for agency/subagency contract")
		}
	case domain.ContractTypeServices:
		if !c.IsTemplate && c.AccountRef == "" {
			return apperrors.New(apperrors.ErrCodeValidation, "account_ref required for services contract")
		}
	default:
		return apperrors.New(apperrors.ErrCodeValidation, "invalid contract type")
	}
	return nil
}

func appendContractHistory(raw, actor, action, from, to, comment string) string {
	var entries []domain.ContractHistoryEntry
	if strings.TrimSpace(raw) != "" {
		_ = json.Unmarshal([]byte(raw), &entries)
	}
	entries = append(entries, domain.ContractHistoryEntry{
		At: time.Now().UTC(), ActorID: actor, Action: action, From: from, To: to, Comment: comment,
	})
	b, err := json.Marshal(entries)
	if err != nil {
		return raw
	}
	return string(b)
}
