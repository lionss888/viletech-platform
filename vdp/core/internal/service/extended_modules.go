package service

import (
	"context"
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

// --- Liquidity ---

func (s *CatalogService) CreateLiquidity(ctx context.Context, principal authz.Principal, o domain.LiquidityOffer) (domain.LiquidityOffer, error) {
	if err := authz.RequireRoles(principal, domain.RoleProvider, domain.RoleSeniorProvider, domain.RoleManager, domain.RoleRoot); err != nil {
		return domain.LiquidityOffer{}, err
	}
	if o.Direction != "import" && o.Direction != "export" {
		return domain.LiquidityOffer{}, apperrors.New(apperrors.ErrCodeValidation, "direction must be import|export")
	}
	if o.Amount == "" || o.Currency == "" {
		return domain.LiquidityOffer{}, apperrors.New(apperrors.ErrCodeValidation, "amount and currency required")
	}
	if o.ProviderID == "" && (principal.Role == domain.RoleProvider || principal.Role == domain.RoleSeniorProvider) {
		o.ProviderID = principal.AccountID
	}
	return s.SaveLiquidity(ctx, o)
}

func (s *CatalogService) MatchLiquidityToForm(ctx context.Context, principal authz.Principal, offerID, formID string) (domain.LiquidityOffer, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleRoot); err != nil {
		return domain.LiquidityOffer{}, err
	}
	offers, err := s.store.ListLiquidity(ctx, "")
	if err != nil {
		return domain.LiquidityOffer{}, err
	}
	var offer domain.LiquidityOffer
	for _, o := range offers {
		if o.ID == offerID {
			offer = o
			break
		}
	}
	if offer.ID == "" {
		return domain.LiquidityOffer{}, apperrors.ErrResourceNotFound
	}
	if offer.Status != "open" {
		return domain.LiquidityOffer{}, apperrors.New(apperrors.ErrCodeConflict, "offer not open")
	}
	form, err := s.store.FormByID(ctx, formID)
	if err != nil {
		return domain.LiquidityOffer{}, err
	}
	if offer.ProviderID != "" {
		form.ProviderID = offer.ProviderID
		_ = s.store.SaveForm(ctx, form)
	}
	offer.Status = "matched"
	offer.FormID = formID
	return offer, s.store.SaveLiquidityOffer(ctx, offer)
}

func (s *CatalogService) SuggestedLiquidity(ctx context.Context, direction, currency string) ([]domain.LiquidityOffer, error) {
	items, err := s.store.ListLiquidity(ctx, direction)
	if err != nil {
		return nil, err
	}
	out := make([]domain.LiquidityOffer, 0)
	for _, o := range items {
		if o.Status != "open" {
			continue
		}
		if currency != "" && !strings.EqualFold(o.Currency, currency) {
			continue
		}
		out = append(out, o)
	}
	return out, nil
}

// --- VirtualAccount (single module) ---

func (s *CatalogService) CreateVirtualAccount(ctx context.Context, principal authz.Principal, a domain.VirtualAccount) (domain.VirtualAccount, error) {
	if a.AccountID == "" {
		a.AccountID = principal.AccountID
	}
	if a.AccountID != principal.AccountID {
		if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleRoot, domain.RoleTreasurer); err != nil {
			return domain.VirtualAccount{}, err
		}
	}
	if a.Kind == "" {
		a.Kind = "fiat"
	}
	if a.Balance == "" {
		a.Balance = "0"
	}
	if a.Currency == "" {
		a.Currency = "RUB"
	}
	// Single-module dedupe: one VA per account+kind+currency (MOD-DUP-VA).
	existing, err := s.store.VirtualAccountsByAccount(ctx, a.AccountID)
	if err != nil {
		return domain.VirtualAccount{}, err
	}
	for _, cur := range existing {
		if strings.EqualFold(cur.Kind, a.Kind) && strings.EqualFold(cur.Currency, a.Currency) {
			return cur, nil
		}
	}
	return s.SaveVirtualAccount(ctx, a)
}

func (s *CatalogService) AdjustVirtualAccount(ctx context.Context, principal authz.Principal, id, delta string) (domain.VirtualAccount, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleTreasurer, domain.RoleRoot); err != nil {
		return domain.VirtualAccount{}, err
	}
	found, err := s.store.VirtualAccountByID(ctx, id)
	if err != nil {
		return domain.VirtualAccount{}, err
	}
	cur, _ := strconv.ParseFloat(strings.ReplaceAll(found.Balance, ",", "."), 64)
	d, err := strconv.ParseFloat(strings.ReplaceAll(delta, ",", "."), 64)
	if err != nil {
		return domain.VirtualAccount{}, apperrors.New(apperrors.ErrCodeValidation, "invalid delta")
	}
	found.Balance = strconv.FormatFloat(cur+d, 'f', 2, 64)
	return found, s.store.SaveVirtualAccount(ctx, found)
}

// --- TreasurerTask ---

func (s *CatalogService) CreateTreasurerTaskFull(ctx context.Context, principal authz.Principal, t domain.TreasurerTask) (domain.TreasurerTask, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleTreasurer, domain.RoleRoot); err != nil {
		return domain.TreasurerTask{}, err
	}
	if t.FormPaymentID == "" {
		return domain.TreasurerTask{}, apperrors.New(apperrors.ErrCodeValidation, "form_payment_id required")
	}
	if _, err := s.store.FormByID(ctx, t.FormPaymentID); err != nil {
		return domain.TreasurerTask{}, err
	}
	if t.ID == "" {
		t.ID = s.newID()
	}
	if t.Kind == "" {
		t.Kind = "confirm"
	}
	if t.Status == "" {
		t.Status = "open"
	}
	now := time.Now().UTC()
	t.CreatedAt = now
	t.UpdatedAt = now
	return t, s.store.SaveTreasurerTask(ctx, t)
}

func (s *CatalogService) UpdateTreasurerTask(ctx context.Context, principal authz.Principal, id string, status, assignee string) (domain.TreasurerTask, error) {
	if err := authz.RequireRoles(principal, domain.RoleTreasurer, domain.RoleManager, domain.RoleRoot); err != nil {
		return domain.TreasurerTask{}, err
	}
	t, err := s.store.TreasurerTaskByID(ctx, id)
	if err != nil {
		return domain.TreasurerTask{}, err
	}
	if status != "" {
		t.Status = status
	}
	if assignee != "" {
		t.AssigneeID = assignee
	}
	t.UpdatedAt = time.Now().UTC()
	return t, s.store.SaveTreasurerTask(ctx, t)
}

// --- Agent / HsCode ---

func (s *CatalogService) GetAgent(ctx context.Context, id string) (domain.Agent, error) {
	return s.store.AgentByID(ctx, id)
}

func (s *CatalogService) UpdateAgent(ctx context.Context, principal authz.Principal, id string, patch domain.Agent, active *bool) (domain.Agent, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleRoot); err != nil {
		return domain.Agent{}, err
	}
	cur, err := s.store.AgentByID(ctx, id)
	if err != nil {
		return domain.Agent{}, err
	}
	if patch.Name != "" {
		cur.Name = patch.Name
	}
	if patch.INN != "" {
		cur.INN = patch.INN
	}
	if patch.StampID != "" {
		cur.StampID = patch.StampID
	}
	if patch.SignID != "" {
		cur.SignID = patch.SignID
	}
	if active != nil {
		cur.Active = *active
	}
	return cur, s.store.SaveAgent(ctx, cur)
}

func (s *CatalogService) CreateAgent(ctx context.Context, principal authz.Principal, a domain.Agent) (domain.Agent, error) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleRoot); err != nil {
		return domain.Agent{}, err
	}
	if a.Name == "" {
		return domain.Agent{}, apperrors.New(apperrors.ErrCodeValidation, "name required")
	}
	a.Active = true
	return s.SaveAgent(ctx, a)
}

func (s *CatalogService) CreateHsCode(ctx context.Context, principal authz.Principal, h domain.HsCode) (domain.HsCode, error) {
	if err := authz.RequireRoles(principal, domain.RoleRoot, domain.RoleManager); err != nil {
		return domain.HsCode{}, err
	}
	if h.Code == "" {
		return domain.HsCode{}, apperrors.New(apperrors.ErrCodeValidation, "code required")
	}
	return h, s.store.SaveHsCode(ctx, h)
}

// AttachHsCodesToForm stores TN VED codes on form invoice_json (Nest invoice hs-codes).
func (s *FormPaymentService) AttachHsCodes(ctx context.Context, principal authz.Principal, formID string, codes []string) (formpayment.Form, error) {
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, err
	}
	var inv map[string]any
	if form.InvoiceJSON != "" {
		_ = json.Unmarshal([]byte(form.InvoiceJSON), &inv)
	}
	if inv == nil {
		inv = map[string]any{}
	}
	inv["hs_codes"] = codes
	raw, _ := json.Marshal(inv)
	form.InvoiceJSON = string(raw)
	form.UpdatedAt = time.Now().UTC()
	return form, s.store.SaveForm(ctx, form)
}

func (s *FormPaymentService) ListFormHsCodes(ctx context.Context, principal authz.Principal, formID string) ([]string, error) {
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return nil, err
	}
	var inv map[string]any
	_ = json.Unmarshal([]byte(form.InvoiceJSON), &inv)
	raw, _ := inv["hs_codes"].([]any)
	out := make([]string, 0, len(raw))
	for _, v := range raw {
		if s, ok := v.(string); ok {
			out = append(out, s)
		}
	}
	return out, nil
}
