package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/storage"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
	"github.com/viletech/vdp/shared/events"
)

type CatalogService struct {
	store repository.Store
	box   outbox.Store
	newID IDFunc
	blobs storage.BlobStore
}

func NewCatalogService(store repository.Store, box outbox.Store, newID IDFunc) *CatalogService {
	return &CatalogService{store: store, box: box, newID: newID, blobs: storage.NewMemoryBlobStore()}
}

func (s *CatalogService) SaveCounterparty(ctx context.Context, c domain.Counterparty) (domain.Counterparty, error) {
	if c.ID == "" {
		c.ID = s.newID()
	}
	return c, s.store.SaveCounterparty(ctx, c)
}

func (s *CatalogService) ListCounterparties(ctx context.Context) ([]domain.Counterparty, error) {
	return s.store.ListCounterparties(ctx)
}

func (s *CatalogService) AddComment(ctx context.Context, principal authz.Principal, entityType, entityID, body string) (domain.Comment, error) {
	c := domain.Comment{ID: s.newID(), EntityType: entityType, EntityID: entityID, AuthorID: principal.AccountID, Body: body, CreatedAt: time.Now().UTC()}
	return c, s.store.SaveComment(ctx, c)
}

func (s *CatalogService) ListComments(ctx context.Context, entityType, entityID string) ([]domain.Comment, error) {
	return s.store.ListComments(ctx, entityType, entityID)
}

func (s *CatalogService) UploadFile(ctx context.Context, principal authz.Principal, formID, storageKey, contentType, content string) (domain.FileMeta, error) {
	sum := sha256.Sum256([]byte(content))
	f := domain.FileMeta{
		ID: s.newID(), OwnerID: principal.AccountID, FormID: formID, StorageKey: storageKey,
		ContentType: contentType, ContentHash: hex.EncodeToString(sum[:]), CreatedAt: time.Now().UTC(),
	}
	return f, s.store.SaveFile(ctx, f)
}

func (s *CatalogService) SaveAgent(ctx context.Context, a domain.Agent) (domain.Agent, error) {
	if a.ID == "" {
		a.ID = s.newID()
	}
	return a, s.store.SaveAgent(ctx, a)
}

func (s *CatalogService) ListAgents(ctx context.Context) ([]domain.Agent, error) {
	return s.store.ListAgents(ctx)
}

func (s *CatalogService) SaveHsCode(ctx context.Context, h domain.HsCode) error {
	return s.store.SaveHsCode(ctx, h)
}

func (s *CatalogService) ListHsCodes(ctx context.Context) ([]domain.HsCode, error) {
	return s.store.ListHsCodes(ctx)
}

func (s *CatalogService) SaveCurrency(ctx context.Context, c domain.Currency) error {
	return s.store.SaveCurrency(ctx, c)
}

func (s *CatalogService) ListCurrencies(ctx context.Context) ([]domain.Currency, error) {
	return s.store.ListCurrencies(ctx)
}

func (s *CatalogService) SetConfig(ctx context.Context, key, value string) error {
	return s.store.SaveConfiguration(ctx, key, value)
}

func (s *CatalogService) GetConfig(ctx context.Context, key string) (string, error) {
	return s.store.Configuration(ctx, key)
}

func (s *CatalogService) SaveLiquidity(ctx context.Context, o domain.LiquidityOffer) (domain.LiquidityOffer, error) {
	if o.ID == "" {
		o.ID = s.newID()
	}
	if o.Status == "" {
		o.Status = "open"
	}
	return o, s.store.SaveLiquidityOffer(ctx, o)
}

func (s *CatalogService) ListLiquidity(ctx context.Context, direction string) ([]domain.LiquidityOffer, error) {
	return s.store.ListLiquidity(ctx, direction)
}

func (s *CatalogService) SaveVirtualAccount(ctx context.Context, a domain.VirtualAccount) (domain.VirtualAccount, error) {
	if a.ID == "" {
		a.ID = s.newID()
	}
	return a, s.store.SaveVirtualAccount(ctx, a)
}

func (s *CatalogService) ListVirtualAccounts(ctx context.Context, accountID string) ([]domain.VirtualAccount, error) {
	return s.store.VirtualAccountsByAccount(ctx, accountID)
}

func (s *CatalogService) CreateTreasurerTask(ctx context.Context, formID, kind string) (domain.TreasurerTask, error) {
	t := domain.TreasurerTask{ID: s.newID(), FormPaymentID: formID, Kind: kind, Status: "open", CreatedAt: time.Now().UTC()}
	return t, s.store.SaveTreasurerTask(ctx, t)
}

func (s *CatalogService) ListTreasurerTasks(ctx context.Context) ([]domain.TreasurerTask, error) {
	return s.store.ListTreasurerTasks(ctx)
}

func (s *CatalogService) GetTreasurerTask(ctx context.Context, id string) (domain.TreasurerTask, error) {
	return s.store.TreasurerTaskByID(ctx, id)
}

func (s *CatalogService) RequestUnblock(ctx context.Context, principal authz.Principal, orgID string) (domain.UnblockRequest, error) {
	r := domain.UnblockRequest{ID: s.newID(), OrganizationID: orgID, RequestedBy: principal.AccountID, Status: "pending", CreatedAt: time.Now().UTC()}
	return r, s.store.SaveUnblockRequest(ctx, r)
}

func (s *CatalogService) ListUnblockRequests(ctx context.Context) ([]domain.UnblockRequest, error) {
	return s.store.ListUnblockRequests(ctx)
}

func (s *CatalogService) ResolveUnblock(ctx context.Context, principal authz.Principal, reqID string, approve bool) (domain.UnblockRequest, error) {
	if err := authz.RequireRoles(principal, domain.RoleInternalComplianceOfficer, domain.RoleManager); err != nil {
		return domain.UnblockRequest{}, err
	}
	list, err := s.store.ListUnblockRequests(ctx)
	if err != nil {
		return domain.UnblockRequest{}, err
	}
	var found domain.UnblockRequest
	for _, r := range list {
		if r.ID == reqID {
			found = r
			break
		}
	}
	if found.ID == "" {
		return domain.UnblockRequest{}, apperrors.ErrResourceNotFound
	}
	if approve {
		found.Status = "approved"
		org, err := s.store.OrganizationByID(ctx, found.OrganizationID)
		if err != nil {
			return domain.UnblockRequest{}, err
		}
		org.Blocked = false
		org.Status = domain.OrgApproved
		org.IsActive = true
		if err := s.store.SaveOrganization(ctx, org); err != nil {
			return domain.UnblockRequest{}, err
		}
		if acct, err := s.store.AccountByID(ctx, org.AccountID); err == nil {
			acct.Blocked = false
			_ = s.store.SaveAccount(ctx, acct)
		}
	} else {
		found.Status = "rejected"
	}
	return found, s.store.SaveUnblockRequest(ctx, found)
}

// EnqueueDocsGenerate is a thin alias kept for catalog callers; canonical path is FormPaymentService.RequestPaymentOrderGeneration.
func (s *CatalogService) EnqueueDocsGenerate(ctx context.Context, formID string) error {
	if s.box == nil {
		return nil
	}
	return s.box.Enqueue(ctx, outbox.Event{
		ID: s.newID(), AggregateID: formID, AggregateType: events.AggregateFormPayment,
		EventType: events.TypeDocsGenerate, FormPaymentID: formID,
		Payload: map[string]any{"kind": "payment_order", "via": "catalog"}, Status: "pending", MaxRetries: 3, CreatedAt: time.Now().UTC(),
	})
}

func (s *CatalogService) EnqueueMail(ctx context.Context, formID, template string) error {
	if s.box == nil {
		return nil
	}
	return s.box.Enqueue(ctx, outbox.Event{
		ID: s.newID(), AggregateID: formID, AggregateType: events.AggregateFormPayment,
		EventType: events.TypeMailNotify, FormPaymentID: formID,
		Payload: map[string]any{"template": template}, Status: "pending", MaxRetries: 3, CreatedAt: time.Now().UTC(),
	})
}

// CalculateRate sets form rate from amount and optional market rate.
func CalculateRate(amount, marketRate, currency string) formpayment.Rate {
	return formpayment.Rate{Value: marketRate, Currency: currency, Source: "calculated"}
}

// CalculateCommission computes fee from amount and percent.
func CalculateCommission(amount, percent, currency string) (formpayment.Commission, error) {
	a, err := strconv.ParseFloat(strings.ReplaceAll(amount, ",", "."), 64)
	if err != nil {
		return formpayment.Commission{}, fmt.Errorf("amount: %w", err)
	}
	p, err := strconv.ParseFloat(strings.ReplaceAll(percent, ",", "."), 64)
	if err != nil {
		return formpayment.Commission{}, fmt.Errorf("percent: %w", err)
	}
	fee := a * p / 100
	return formpayment.Commission{
		FeeAmount:   strconv.FormatFloat(fee, 'f', 2, 64),
		FeePercent:  percent,
		FeeCurrency: currency,
	}, nil
}

// ConfirmationHashXOR builds provider confirmation hash from file content and currency.
func ConfirmationHashXOR(fileContent, currency string) string {
	sum := sha256.Sum256([]byte(fileContent + "|" + currency))
	return hex.EncodeToString(sum[:])
}
