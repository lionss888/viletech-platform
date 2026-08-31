package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/storage"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

// CounterpartyBank / CounterpartyBankAccount are stored inside Counterparty.Banks JSON.
type CounterpartyBank struct {
	UUID     string                    `json:"uuid"`
	Name     string                    `json:"name,omitempty"`
	Accounts []CounterpartyBankAccount `json:"accounts"`
}

type CounterpartyBankAccount struct {
	UUID     string `json:"uuid"`
	Number   string `json:"number,omitempty"`
	Currency string `json:"currency,omitempty"`
	IBAN     string `json:"iban,omitempty"`
}

func (s *CatalogService) Blobs() storage.BlobStore {
	if s.blobs == nil {
		s.blobs = storage.NewMemoryBlobStore()
	}
	return s.blobs
}

func (s *CatalogService) CreateCounterparty(ctx context.Context, principal authz.Principal, name, country, inn, banksJSON string) (domain.Counterparty, error) {
	if name == "" {
		return domain.Counterparty{}, apperrors.ErrInvalidInput
	}
	if banksJSON == "" {
		banksJSON = "[]"
	}
	c := domain.Counterparty{
		ID: s.newID(), CreatedBy: principal.AccountID, Name: name, Country: country, INN: inn,
		Banks: banksJSON, FormPaymentIDs: []string{}, LastApprovalStatus: domain.CounterpartyApprovalPending,
		CreatedAt: time.Now().UTC(),
	}
	return c, s.store.SaveCounterparty(ctx, c)
}

func (s *CatalogService) GetCounterparty(ctx context.Context, principal authz.Principal, id string) (domain.Counterparty, error) {
	c, err := s.store.CounterpartyByID(ctx, id)
	if err != nil {
		return domain.Counterparty{}, err
	}
	if err := s.canReadCounterparty(principal, c); err != nil {
		return domain.Counterparty{}, err
	}
	return c, nil
}

func (s *CatalogService) ListCounterpartiesFor(ctx context.Context, principal authz.Principal) ([]domain.Counterparty, error) {
	all, err := s.store.ListCounterparties(ctx)
	if err != nil {
		return nil, err
	}
	if s.isComplianceOrRoot(principal) {
		return all, nil
	}
	out := make([]domain.Counterparty, 0)
	for _, c := range all {
		if c.CreatedBy == principal.AccountID {
			out = append(out, c)
		}
	}
	return out, nil
}

func (s *CatalogService) UpdateCounterparty(ctx context.Context, principal authz.Principal, id, name, country, inn, banksJSON string) (domain.Counterparty, error) {
	c, err := s.requireOwnCounterparty(ctx, principal, id)
	if err != nil {
		return domain.Counterparty{}, err
	}
	if name != "" {
		c.Name = name
	}
	if country != "" {
		c.Country = country
	}
	if inn != "" {
		c.INN = inn
	}
	if banksJSON != "" {
		c.Banks = banksJSON
	}
	return c, s.store.SaveCounterparty(ctx, c)
}

func (s *CatalogService) DeleteCounterparty(ctx context.Context, principal authz.Principal, id string) error {
	if _, err := s.requireOwnCounterparty(ctx, principal, id); err != nil {
		return err
	}
	return s.store.DeleteCounterparty(ctx, id)
}

func (s *CatalogService) AddBankAccount(ctx context.Context, principal authz.Principal, id, bankUUID string, account CounterpartyBankAccount) (domain.Counterparty, error) {
	c, err := s.requireOwnCounterparty(ctx, principal, id)
	if err != nil {
		return domain.Counterparty{}, err
	}
	banks := decodeBanks(c.Banks)
	found := false
	for i := range banks {
		if banks[i].UUID != bankUUID {
			continue
		}
		found = true
		if account.UUID == "" {
			account.UUID = s.newID()
		}
		banks[i].Accounts = append(banks[i].Accounts, account)
		break
	}
	if !found {
		return domain.Counterparty{}, apperrors.ErrResourceNotFound
	}
	c.Banks = encodeBanks(banks)
	return c, s.store.SaveCounterparty(ctx, c)
}

func (s *CatalogService) UpdateBankAccount(ctx context.Context, principal authz.Principal, id, bankUUID, accountUUID string, patch CounterpartyBankAccount) (domain.Counterparty, error) {
	c, err := s.requireOwnCounterparty(ctx, principal, id)
	if err != nil {
		return domain.Counterparty{}, err
	}
	banks := decodeBanks(c.Banks)
	ok := false
	for i := range banks {
		if banks[i].UUID != bankUUID {
			continue
		}
		for j := range banks[i].Accounts {
			if banks[i].Accounts[j].UUID != accountUUID {
				continue
			}
			if patch.Number != "" {
				banks[i].Accounts[j].Number = patch.Number
			}
			if patch.Currency != "" {
				banks[i].Accounts[j].Currency = patch.Currency
			}
			if patch.IBAN != "" {
				banks[i].Accounts[j].IBAN = patch.IBAN
			}
			ok = true
			break
		}
	}
	if !ok {
		return domain.Counterparty{}, apperrors.ErrResourceNotFound
	}
	c.Banks = encodeBanks(banks)
	return c, s.store.SaveCounterparty(ctx, c)
}

func (s *CatalogService) RemoveBankAccount(ctx context.Context, principal authz.Principal, id, bankUUID, accountUUID string) (domain.Counterparty, error) {
	c, err := s.requireOwnCounterparty(ctx, principal, id)
	if err != nil {
		return domain.Counterparty{}, err
	}
	banks := decodeBanks(c.Banks)
	ok := false
	for i := range banks {
		if banks[i].UUID != bankUUID {
			continue
		}
		filtered := make([]CounterpartyBankAccount, 0, len(banks[i].Accounts))
		for _, a := range banks[i].Accounts {
			if a.UUID == accountUUID {
				ok = true
				continue
			}
			filtered = append(filtered, a)
		}
		banks[i].Accounts = filtered
	}
	if !ok {
		return domain.Counterparty{}, apperrors.ErrResourceNotFound
	}
	c.Banks = encodeBanks(banks)
	return c, s.store.SaveCounterparty(ctx, c)
}

func (s *CatalogService) LinkFormPayment(ctx context.Context, principal authz.Principal, id, formPaymentID string) (domain.Counterparty, error) {
	c, err := s.requireOwnCounterparty(ctx, principal, id)
	if err != nil {
		return domain.Counterparty{}, err
	}
	for _, existing := range c.FormPaymentIDs {
		if existing == formPaymentID {
			return c, nil
		}
	}
	c.FormPaymentIDs = append(c.FormPaymentIDs, formPaymentID)
	if form, ferr := s.store.FormByID(ctx, formPaymentID); ferr == nil {
		form.CounterpartyID = id
		form.UpdatedAt = time.Now().UTC()
		_ = s.store.SaveForm(ctx, form)
	}
	return c, s.store.SaveCounterparty(ctx, c)
}

func (s *CatalogService) UnlinkFormPayment(ctx context.Context, principal authz.Principal, id, formPaymentID string) (domain.Counterparty, error) {
	c, err := s.requireOwnCounterparty(ctx, principal, id)
	if err != nil {
		return domain.Counterparty{}, err
	}
	filtered := make([]string, 0, len(c.FormPaymentIDs))
	for _, existing := range c.FormPaymentIDs {
		if existing != formPaymentID {
			filtered = append(filtered, existing)
		}
	}
	c.FormPaymentIDs = filtered
	return c, s.store.SaveCounterparty(ctx, c)
}

func (s *CatalogService) FindOrCreateCounterparty(ctx context.Context, principal authz.Principal, name, inn, banksJSON string) (domain.Counterparty, error) {
	all, err := s.store.ListCounterparties(ctx)
	if err != nil {
		return domain.Counterparty{}, err
	}
	for _, c := range all {
		if c.CreatedBy == principal.AccountID && inn != "" && c.INN == inn {
			return c, nil
		}
	}
	if name == "" {
		name = "Counterparty"
	}
	return s.CreateCounterparty(ctx, principal, name, "", inn, banksJSON)
}

func (s *CatalogService) CounterpartyRequests(ctx context.Context, principal authz.Principal, id string) ([]formpayment.Form, error) {
	c, err := s.GetCounterparty(ctx, principal, id)
	if err != nil {
		return nil, err
	}
	out := make([]formpayment.Form, 0)
	for _, formID := range c.FormPaymentIDs {
		form, ferr := s.store.FormByID(ctx, formID)
		if ferr == nil {
			out = append(out, form)
		}
	}
	for _, form := range s.store.ListForms(ctx) {
		if form.CounterpartyID == id {
			out = append(out, form)
		}
	}
	return out, nil
}

func (s *CatalogService) CreateCommentTyped(ctx context.Context, principal authz.Principal, entityType, entityID, body string, kind domain.CommentKind, fileIDs []string) (domain.Comment, error) {
	if entityID == "" || body == "" {
		return domain.Comment{}, apperrors.ErrInvalidInput
	}
	if entityType == "" {
		entityType = "form_payment"
	}
	if kind == "" {
		kind = domain.CommentKindExternal
	}
	if principal.Role == domain.RoleUser {
		kind = domain.CommentKindExternal
	}
	c := domain.Comment{
		ID: s.newID(), EntityType: entityType, EntityID: entityID, AuthorID: principal.AccountID,
		Body: body, Kind: kind, FileIDs: fileIDs, CreatedAt: time.Now().UTC(),
	}
	return c, s.store.SaveComment(ctx, c)
}

func (s *CatalogService) UpdateComment(ctx context.Context, principal authz.Principal, id, body string) (domain.Comment, error) {
	c, err := s.store.CommentByID(ctx, id)
	if err != nil {
		return domain.Comment{}, err
	}
	if c.AuthorID != principal.AccountID && principal.Role != domain.RoleRoot {
		return domain.Comment{}, apperrors.ErrForbidden
	}
	if body != "" {
		c.Body = body
	}
	return c, s.store.SaveComment(ctx, c)
}

func (s *CatalogService) DeleteComment(ctx context.Context, principal authz.Principal, id string) error {
	c, err := s.store.CommentByID(ctx, id)
	if err != nil {
		return err
	}
	if c.AuthorID != principal.AccountID && !s.isStaffCommentRole(principal) {
		return apperrors.ErrForbidden
	}
	return s.store.DeleteComment(ctx, id)
}

func (s *CatalogService) ListCommentsFiltered(ctx context.Context, principal authz.Principal, entityType, entityID string, kinds []domain.CommentKind) ([]domain.Comment, error) {
	var items []domain.Comment
	var err error
	if entityType != "" && entityID != "" {
		items, err = s.store.ListComments(ctx, entityType, entityID)
	} else {
		items, err = s.store.ListAllComments(ctx)
	}
	if err != nil {
		return nil, err
	}
	out := make([]domain.Comment, 0, len(items))
	for _, c := range items {
		if len(kinds) > 0 && !kindAllowed(c.Kind, kinds) {
			continue
		}
		if principal.Role == domain.RoleUser && c.Kind != domain.CommentKindExternal {
			continue
		}
		out = append(out, c)
	}
	return out, nil
}

func (s *CatalogService) ListUnreadComments(ctx context.Context, principal authz.Principal, kind domain.CommentKind) ([]domain.Comment, error) {
	items, err := s.store.ListAllComments(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]domain.Comment, 0)
	for _, c := range items {
		if c.Read {
			continue
		}
		if kind != "" && c.Kind != kind {
			continue
		}
		if principal.Role == domain.RoleUser && c.Kind != domain.CommentKindExternal {
			continue
		}
		out = append(out, c)
	}
	return out, nil
}

func (s *CatalogService) MarkCommentsRead(ctx context.Context, principal authz.Principal, entityID string, kind domain.CommentKind) error {
	if entityID == "" {
		return apperrors.ErrInvalidInput
	}
	if form, err := s.store.FormByID(ctx, entityID); err == nil {
		if err := authz.CanAccessForm(principal, form); err != nil {
			return err
		}
	}
	items, err := s.store.ListComments(ctx, "form_payment", entityID)
	if err != nil {
		return err
	}
	for _, c := range items {
		if kind != "" && c.Kind != kind {
			continue
		}
		if c.Read {
			continue
		}
		c.Read = true
		_ = s.store.SaveComment(ctx, c)
	}
	return nil
}

func (s *CatalogService) EntitiesWithUnreadComments(ctx context.Context, principal authz.Principal, kind domain.CommentKind) ([]string, error) {
	items, err := s.ListUnreadComments(ctx, principal, kind)
	if err != nil {
		return nil, err
	}
	seen := map[string]struct{}{}
	out := make([]string, 0)
	for _, c := range items {
		if _, ok := seen[c.EntityID]; ok {
			continue
		}
		seen[c.EntityID] = struct{}{}
		out = append(out, c.EntityID)
	}
	return out, nil
}

func (s *CatalogService) UploadFileBytes(ctx context.Context, principal authz.Principal, formID, contentType string, data []byte) (domain.FileMeta, error) {
	if len(data) == 0 {
		return domain.FileMeta{}, apperrors.ErrInvalidInput
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	id := s.newID()
	key := "files/" + id
	sum := sha256.Sum256(data)
	if err := s.Blobs().Put(ctx, key, contentType, data); err != nil {
		return domain.FileMeta{}, err
	}
	f := domain.FileMeta{
		ID: id, OwnerID: principal.AccountID, FormID: formID, StorageKey: key,
		ContentType: contentType, ContentHash: hex.EncodeToString(sum[:]), CreatedAt: time.Now().UTC(),
	}
	return f, s.store.SaveFile(ctx, f)
}

func (s *CatalogService) PreviewFile(ctx context.Context, principal authz.Principal, id string) (domain.FileMeta, string, []byte, error) {
	f, err := s.store.FileByID(ctx, id)
	if err != nil {
		return domain.FileMeta{}, "", nil, err
	}
	if err := s.canPreviewFile(ctx, principal, f); err != nil {
		return domain.FileMeta{}, "", nil, err
	}
	ct, data, err := s.Blobs().Get(ctx, f.StorageKey)
	if err != nil {
		if err == io.EOF {
			return domain.FileMeta{}, "", nil, apperrors.ErrResourceNotFound
		}
		return domain.FileMeta{}, "", nil, err
	}
	if ct == "" {
		ct = f.ContentType
	}
	return f, ct, data, nil
}

func (s *CatalogService) AttachFileToForm(ctx context.Context, principal authz.Principal, formID, fileID, kind, label string) (formpayment.Form, error) {
	form, err := s.store.FormByID(ctx, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	form.UnpackDocsJSON()
	if err := authz.CanAccessForm(principal, form); err != nil {
		return formpayment.Form{}, err
	}
	f, err := s.store.FileByID(ctx, fileID)
	if err != nil {
		return formpayment.Form{}, err
	}
	refs := formpayment.ParseDocRefs(form.DocsJSON)
	refs = append(refs, formpayment.DocFileRef{FileID: fileID, Kind: kind, Label: label})
	var pog *formpayment.POGState
	if form.POGStatus != "" || form.POGFileID != "" {
		pog = &formpayment.POGState{Status: form.POGStatus, FileID: form.POGFileID, Attempts: form.POGAttempts, Kind: form.POGKind}
	}
	form.DocsJSON = formpayment.EncodeDocRefs(refs, pog)
	f.FormID = formID
	_ = s.store.SaveFile(ctx, f)
	_ = s.store.SaveDocument(ctx, formpayment.Document{
		ID: s.newID(), FormPaymentID: formID, Type: kind, StorageKey: f.StorageKey, ContentHash: f.ContentHash,
	})
	form.UpdatedAt = time.Now().UTC()
	return form, s.store.SaveForm(ctx, form)
}

func (s *CatalogService) ListComplianceClients(ctx context.Context, principal authz.Principal) ([]domain.Organization, error) {
	if err := authz.RequireRoles(principal, domain.RoleComplianceOfficer, domain.RoleInternalComplianceOfficer, domain.RoleRoot); err != nil {
		return nil, err
	}
	return s.store.ListOrganizations(ctx)
}

func (s *CatalogService) ClientDetails(ctx context.Context, principal authz.Principal, orgID string) (map[string]any, error) {
	if err := authz.RequireRoles(principal, domain.RoleComplianceOfficer, domain.RoleInternalComplianceOfficer, domain.RoleRoot); err != nil {
		return nil, err
	}
	org, err := s.store.OrganizationByID(ctx, orgID)
	if err != nil {
		return nil, err
	}
	requests, _ := s.ClientRequests(ctx, principal, orgID)
	contracts, _ := s.store.ListContractsByOrg(ctx, orgID)
	return map[string]any{
		"id":                        org.ID,
		"organization":              org,
		"requests_count":            len(requests),
		"contracts_count":           len(contracts),
		"organization_card_file_id": org.OrganizationCardFileID,
		"client_status":             org.ClientStatus(),
	}, nil
}

func (s *CatalogService) OrganizationCardFile(ctx context.Context, principal authz.Principal, orgID string) (domain.FileMeta, string, []byte, error) {
	if err := authz.RequireRoles(principal, domain.RoleComplianceOfficer, domain.RoleInternalComplianceOfficer, domain.RoleRoot); err != nil {
		return domain.FileMeta{}, "", nil, err
	}
	org, err := s.store.OrganizationByID(ctx, orgID)
	if err != nil {
		return domain.FileMeta{}, "", nil, err
	}
	if org.OrganizationCardFileID == "" {
		return domain.FileMeta{}, "", nil, apperrors.ErrResourceNotFound
	}
	return s.PreviewFile(ctx, principal, org.OrganizationCardFileID)
}

func (s *CatalogService) SetOrganizationCard(ctx context.Context, principal authz.Principal, orgID, fileID string) (domain.Organization, error) {
	if err := authz.RequireRoles(principal, domain.RoleInternalComplianceOfficer, domain.RoleComplianceOfficer, domain.RoleRoot, domain.RoleManager); err != nil {
		return domain.Organization{}, err
	}
	org, err := s.store.OrganizationByID(ctx, orgID)
	if err != nil {
		return domain.Organization{}, err
	}
	if fileID != "" {
		if _, err := s.store.FileByID(ctx, fileID); err != nil {
			return domain.Organization{}, err
		}
	}
	org.OrganizationCardFileID = fileID
	return org, s.store.SaveOrganization(ctx, org)
}

const approvalExpiryDays = 180
const daysPerMonth = 30

func (s *CatalogService) CounterpartyApprovalIndicator(ctx context.Context, principal authz.Principal, id string) (map[string]any, error) {
	c, err := s.GetCounterparty(ctx, principal, id)
	if err != nil {
		return nil, err
	}
	if c.LastApprovalDate == nil ||
		c.LastApprovalStatus == domain.CounterpartyApprovalRejected ||
		c.LastApprovalStatus == domain.CounterpartyApprovalPending ||
		c.LastApprovalStatus == "" {
		return map[string]any{"requiresReview": true, "monthsSinceApproval": nil}, nil
	}
	days := int(time.Since(*c.LastApprovalDate).Hours() / 24)
	if days < 0 {
		days = 0
	}
	months := days / daysPerMonth
	return map[string]any{
		"requiresReview":      days >= approvalExpiryDays,
		"monthsSinceApproval": months,
	}, nil
}

func (s *CatalogService) CounterpartyCanSkipCompliance(ctx context.Context, principal authz.Principal, id string) (bool, error) {
	c, err := s.GetCounterparty(ctx, principal, id)
	if err != nil {
		return false, err
	}
	if c.LastApprovalStatus != domain.CounterpartyApprovalApproved {
		return false, nil
	}
	ind, err := s.CounterpartyApprovalIndicator(ctx, principal, id)
	if err != nil {
		return false, err
	}
	requires, _ := ind["requiresReview"].(bool)
	return !requires, nil
}

func (s *CatalogService) SetCounterpartyApproval(ctx context.Context, principal authz.Principal, id string, status domain.CounterpartyApprovalStatus, comment string) (domain.Counterparty, error) {
	if err := authz.RequireRoles(principal, domain.RoleComplianceOfficer, domain.RoleInternalComplianceOfficer, domain.RoleRoot); err != nil {
		return domain.Counterparty{}, err
	}
	c, err := s.store.CounterpartyByID(ctx, id)
	if err != nil {
		return domain.Counterparty{}, err
	}
	now := time.Now().UTC()
	c.LastApprovalStatus = status
	c.LastApprovalDate = &now
	c.LastApprovalComment = comment
	return c, s.store.SaveCounterparty(ctx, c)
}

func (s *CatalogService) CounterpartyRequestsExportRows(ctx context.Context, principal authz.Principal, id string) ([]string, [][]string, error) {
	items, err := s.CounterpartyRequests(ctx, principal, id)
	if err != nil {
		return nil, nil, err
	}
	headers := []string{"id", "status", "currency", "invoice_amount", "organization_id"}
	rows := make([][]string, 0, len(items))
	for _, f := range items {
		rows = append(rows, []string{f.ID, string(f.Status), f.Currency, f.InvoiceAmount, f.OrganizationID})
	}
	return headers, rows, nil
}

func (s *CatalogService) ClientRequestsExportRows(ctx context.Context, principal authz.Principal, orgID string) ([]string, [][]string, error) {
	items, err := s.ClientRequests(ctx, principal, orgID)
	if err != nil {
		return nil, nil, err
	}
	headers := []string{"id", "status", "currency", "invoice_amount", "direction"}
	rows := make([][]string, 0, len(items))
	for _, f := range items {
		rows = append(rows, []string{f.ID, string(f.Status), f.Currency, f.InvoiceAmount, string(f.Direction)})
	}
	return headers, rows, nil
}

func (s *CatalogService) ComplianceClientsExportRows(ctx context.Context, principal authz.Principal) ([]string, [][]string, error) {
	items, err := s.ListComplianceClients(ctx, principal)
	if err != nil {
		return nil, nil, err
	}
	headers := []string{"id", "name", "inn", "status", "country"}
	rows := make([][]string, 0, len(items))
	for _, o := range items {
		rows = append(rows, []string{o.ID, o.Name, o.INN, string(o.Status), o.Country})
	}
	return headers, rows, nil
}

func (s *CatalogService) ClientRequests(ctx context.Context, principal authz.Principal, orgID string) ([]formpayment.Form, error) {
	if err := authz.RequireRoles(principal, domain.RoleComplianceOfficer, domain.RoleInternalComplianceOfficer, domain.RoleRoot); err != nil {
		return nil, err
	}
	out := make([]formpayment.Form, 0)
	for _, form := range s.store.ListForms(ctx) {
		if form.OrganizationID == orgID || form.OnBehalfOrganizationID == orgID {
			out = append(out, form)
		}
	}
	return out, nil
}

func (s *CatalogService) ListFormHistory(ctx context.Context, principal authz.Principal, formID string) ([]formpayment.ComplianceHistoryEntry, error) {
	if formID != "" {
		form, err := s.store.FormByID(ctx, formID)
		if err != nil {
			return nil, err
		}
		if err := authz.CanAccessForm(principal, form); err != nil {
			if err2 := authz.RequireRoles(principal, domain.RoleComplianceOfficer, domain.RoleInternalComplianceOfficer, domain.RoleManager, domain.RoleRoot); err2 != nil {
				return nil, err
			}
		}
		return s.store.HistoryByForm(ctx, formID), nil
	}
	if err := authz.RequireRoles(principal, domain.RoleComplianceOfficer, domain.RoleInternalComplianceOfficer, domain.RoleRoot); err != nil {
		return nil, err
	}
	return s.store.ListAllHistory(ctx), nil
}

func (s *CatalogService) canReadCounterparty(principal authz.Principal, c domain.Counterparty) error {
	if s.isComplianceOrRoot(principal) || c.CreatedBy == principal.AccountID {
		return nil
	}
	if principal.Role == domain.RoleManager {
		return nil
	}
	return apperrors.ErrForbidden
}

func (s *CatalogService) requireOwnCounterparty(ctx context.Context, principal authz.Principal, id string) (domain.Counterparty, error) {
	c, err := s.store.CounterpartyByID(ctx, id)
	if err != nil {
		return domain.Counterparty{}, err
	}
	if c.CreatedBy != principal.AccountID && principal.Role != domain.RoleRoot {
		return domain.Counterparty{}, apperrors.ErrForbidden
	}
	return c, nil
}

func (s *CatalogService) isComplianceOrRoot(principal authz.Principal) bool {
	return principal.Role == domain.RoleComplianceOfficer ||
		principal.Role == domain.RoleInternalComplianceOfficer ||
		principal.Role == domain.RoleRoot
}

func (s *CatalogService) isStaffCommentRole(principal authz.Principal) bool {
	switch principal.Role {
	case domain.RoleManager, domain.RoleProvider, domain.RoleSeniorProvider, domain.RoleRoot:
		return true
	default:
		return false
	}
}

func (s *CatalogService) canPreviewFile(ctx context.Context, principal authz.Principal, f domain.FileMeta) error {
	if f.OwnerID == principal.AccountID || principal.Role == domain.RoleRoot {
		return nil
	}
	switch principal.Role {
	case domain.RoleManager, domain.RoleComplianceOfficer,
		domain.RoleInternalComplianceOfficer, domain.RoleProvider, domain.RoleSeniorProvider, domain.RoleOneC:
		return nil
	}
	if f.FormID != "" {
		if form, err := s.store.FormByID(ctx, f.FormID); err == nil {
			return authz.CanAccessForm(principal, form)
		}
	}
	return apperrors.ErrForbidden
}

func decodeBanks(raw string) []CounterpartyBank {
	if raw == "" {
		return []CounterpartyBank{}
	}
	var banks []CounterpartyBank
	if err := json.Unmarshal([]byte(raw), &banks); err != nil {
		return []CounterpartyBank{}
	}
	return banks
}

func encodeBanks(banks []CounterpartyBank) string {
	raw, err := json.Marshal(banks)
	if err != nil {
		return "[]"
	}
	return string(raw)
}

func kindAllowed(kind domain.CommentKind, allowed []domain.CommentKind) bool {
	for _, a := range allowed {
		if a == kind {
			return true
		}
	}
	return false
}
