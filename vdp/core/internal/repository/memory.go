package repository

import (
	"context"
	"sync"
	"time"

	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

// MemoryStore is an in-process Store used for unit tests and STORE_DRIVER=memory.
type MemoryStore struct {
	mu              sync.RWMutex
	accounts        map[string]domain.Account
	accountsEmail   map[string]string
	orgs            map[string]domain.Organization
	forms           map[string]formpayment.Form
	history         []formpayment.ComplianceHistoryEntry
	docs            []formpayment.Document
	contracts       map[string]domain.Contract
	counterparties  map[string]domain.Counterparty
	comments        []domain.Comment
	files           map[string]domain.FileMeta
	agents          map[string]domain.Agent
	hsCodes         map[string]domain.HsCode
	currencies      map[string]domain.Currency
	config          map[string]string
	liquidity       []domain.LiquidityOffer
	virtualAccounts []domain.VirtualAccount
	treasurerTasks  map[string]domain.TreasurerTask
	unblock         []domain.UnblockRequest
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		accounts:       map[string]domain.Account{},
		accountsEmail:  map[string]string{},
		orgs:           map[string]domain.Organization{},
		forms:          map[string]formpayment.Form{},
		contracts:      map[string]domain.Contract{},
		counterparties: map[string]domain.Counterparty{},
		files:          map[string]domain.FileMeta{},
		agents:         map[string]domain.Agent{},
		hsCodes:        map[string]domain.HsCode{},
		currencies:     map[string]domain.Currency{},
		config:         map[string]string{},
		treasurerTasks: map[string]domain.TreasurerTask{},
	}
}

// NewStore keeps backward-compatible constructor for tests/seed.
func NewStore() *MemoryStore { return NewMemoryStore() }

func (s *MemoryStore) SaveAccount(_ context.Context, account domain.Account) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.accounts[account.ID] = account
	s.accountsEmail[account.Email] = account.ID
	return nil
}

func (s *MemoryStore) AccountByID(_ context.Context, id string) (domain.Account, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	account, ok := s.accounts[id]
	if !ok {
		return domain.Account{}, apperrors.ErrResourceNotFound
	}
	return account, nil
}

func (s *MemoryStore) AccountByEmail(_ context.Context, email string) (domain.Account, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	id, ok := s.accountsEmail[email]
	if !ok {
		return domain.Account{}, apperrors.ErrResourceNotFound
	}
	return s.accounts[id], nil
}

func (s *MemoryStore) ListAccounts(_ context.Context) ([]domain.Account, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.Account, 0, len(s.accounts))
	for _, a := range s.accounts {
		out = append(out, a)
	}
	return out, nil
}

func (s *MemoryStore) SaveOrganization(_ context.Context, org domain.Organization) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.orgs[org.ID] = org
	return nil
}

func (s *MemoryStore) OrganizationByID(_ context.Context, id string) (domain.Organization, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	org, ok := s.orgs[id]
	if !ok {
		return domain.Organization{}, apperrors.ErrResourceNotFound
	}
	return org, nil
}

func (s *MemoryStore) ListOrganizations(_ context.Context) ([]domain.Organization, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.Organization, 0, len(s.orgs))
	for _, o := range s.orgs {
		out = append(out, o)
	}
	return out, nil
}

func (s *MemoryStore) ListAwaiting(_ context.Context) []domain.Organization {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.Organization, 0)
	for _, org := range s.orgs {
		if org.Status == domain.OrgAwaitingProcessing || org.Rating == domain.RatingRed || org.Rating == domain.RatingYellow {
			out = append(out, org)
		}
	}
	return out
}

func (s *MemoryStore) SaveForm(_ context.Context, form formpayment.Form) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	form.UpdatedAt = time.Now().UTC()
	s.forms[form.ID] = form
	return nil
}

func (s *MemoryStore) FormByID(_ context.Context, id string) (formpayment.Form, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	form, ok := s.forms[id]
	if !ok {
		return formpayment.Form{}, apperrors.ErrResourceNotFound
	}
	return form, nil
}

func (s *MemoryStore) ListForms(_ context.Context) []formpayment.Form {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]formpayment.Form, 0, len(s.forms))
	for _, form := range s.forms {
		out = append(out, form)
	}
	return out
}

func (s *MemoryStore) AppendHistory(_ context.Context, entry formpayment.ComplianceHistoryEntry) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.history = append(s.history, entry)
	return nil
}

func (s *MemoryStore) HistoryByForm(_ context.Context, formID string) []formpayment.ComplianceHistoryEntry {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]formpayment.ComplianceHistoryEntry, 0)
	for _, entry := range s.history {
		if entry.FormPaymentID == formID {
			out = append(out, entry)
		}
	}
	return out
}

func (s *MemoryStore) SaveDocument(_ context.Context, doc formpayment.Document) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.docs = append(s.docs, doc)
	return nil
}

func (s *MemoryStore) DocumentsByForm(_ context.Context, formID string) []formpayment.Document {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]formpayment.Document, 0)
	for _, d := range s.docs {
		if d.FormPaymentID == formID {
			out = append(out, d)
		}
	}
	return out
}

func (s *MemoryStore) SaveContract(_ context.Context, c domain.Contract) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.contracts[c.ID] = c
	return nil
}

func (s *MemoryStore) ContractByID(_ context.Context, id string) (domain.Contract, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	c, ok := s.contracts[id]
	if !ok {
		return domain.Contract{}, apperrors.ErrResourceNotFound
	}
	return c, nil
}

func (s *MemoryStore) ListContracts(_ context.Context) ([]domain.Contract, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.Contract, 0, len(s.contracts))
	for _, c := range s.contracts {
		out = append(out, c)
	}
	return out, nil
}

func (s *MemoryStore) SaveCounterparty(_ context.Context, c domain.Counterparty) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.counterparties[c.ID] = c
	return nil
}

func (s *MemoryStore) CounterpartyByID(_ context.Context, id string) (domain.Counterparty, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	c, ok := s.counterparties[id]
	if !ok {
		return domain.Counterparty{}, apperrors.ErrResourceNotFound
	}
	return c, nil
}

func (s *MemoryStore) ListCounterparties(_ context.Context) ([]domain.Counterparty, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.Counterparty, 0, len(s.counterparties))
	for _, c := range s.counterparties {
		out = append(out, c)
	}
	return out, nil
}

func (s *MemoryStore) SaveComment(_ context.Context, c domain.Comment) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.comments = append(s.comments, c)
	return nil
}

func (s *MemoryStore) ListComments(_ context.Context, entityType, entityID string) ([]domain.Comment, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.Comment, 0)
	for _, c := range s.comments {
		if c.EntityType == entityType && c.EntityID == entityID {
			out = append(out, c)
		}
	}
	return out, nil
}

func (s *MemoryStore) SaveFile(_ context.Context, f domain.FileMeta) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.files[f.ID] = f
	return nil
}

func (s *MemoryStore) FileByID(_ context.Context, id string) (domain.FileMeta, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	f, ok := s.files[id]
	if !ok {
		return domain.FileMeta{}, apperrors.ErrResourceNotFound
	}
	return f, nil
}

func (s *MemoryStore) SaveAgent(_ context.Context, a domain.Agent) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.agents[a.ID] = a
	return nil
}

func (s *MemoryStore) AgentByID(_ context.Context, id string) (domain.Agent, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	a, ok := s.agents[id]
	if !ok {
		return domain.Agent{}, apperrors.ErrResourceNotFound
	}
	return a, nil
}

func (s *MemoryStore) ListAgents(_ context.Context) ([]domain.Agent, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.Agent, 0, len(s.agents))
	for _, a := range s.agents {
		out = append(out, a)
	}
	return out, nil
}

func (s *MemoryStore) SaveHsCode(_ context.Context, h domain.HsCode) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.hsCodes[h.Code] = h
	return nil
}

func (s *MemoryStore) ListHsCodes(_ context.Context) ([]domain.HsCode, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.HsCode, 0, len(s.hsCodes))
	for _, h := range s.hsCodes {
		out = append(out, h)
	}
	return out, nil
}

func (s *MemoryStore) SaveCurrency(_ context.Context, c domain.Currency) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.currencies[c.Code] = c
	return nil
}

func (s *MemoryStore) ListCurrencies(_ context.Context) ([]domain.Currency, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.Currency, 0, len(s.currencies))
	for _, c := range s.currencies {
		out = append(out, c)
	}
	return out, nil
}

func (s *MemoryStore) SaveConfiguration(_ context.Context, key, value string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.config[key] = value
	return nil
}

func (s *MemoryStore) Configuration(_ context.Context, key string) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	v, ok := s.config[key]
	if !ok {
		return "", apperrors.ErrResourceNotFound
	}
	return v, nil
}

func (s *MemoryStore) SaveLiquidityOffer(_ context.Context, o domain.LiquidityOffer) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.liquidity = append(s.liquidity, o)
	return nil
}

func (s *MemoryStore) ListLiquidity(_ context.Context, direction string) ([]domain.LiquidityOffer, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.LiquidityOffer, 0)
	for _, o := range s.liquidity {
		if direction == "" || o.Direction == direction {
			out = append(out, o)
		}
	}
	return out, nil
}

func (s *MemoryStore) SaveVirtualAccount(_ context.Context, a domain.VirtualAccount) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.virtualAccounts = append(s.virtualAccounts, a)
	return nil
}

func (s *MemoryStore) VirtualAccountsByAccount(_ context.Context, accountID string) ([]domain.VirtualAccount, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.VirtualAccount, 0)
	for _, a := range s.virtualAccounts {
		if a.AccountID == accountID {
			out = append(out, a)
		}
	}
	return out, nil
}

func (s *MemoryStore) SaveTreasurerTask(_ context.Context, t domain.TreasurerTask) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.treasurerTasks[t.ID] = t
	return nil
}

func (s *MemoryStore) ListTreasurerTasks(_ context.Context) ([]domain.TreasurerTask, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.TreasurerTask, 0, len(s.treasurerTasks))
	for _, t := range s.treasurerTasks {
		out = append(out, t)
	}
	return out, nil
}

func (s *MemoryStore) TreasurerTaskByID(_ context.Context, id string) (domain.TreasurerTask, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	t, ok := s.treasurerTasks[id]
	if !ok {
		return domain.TreasurerTask{}, apperrors.ErrResourceNotFound
	}
	return t, nil
}

func (s *MemoryStore) SaveUnblockRequest(_ context.Context, r domain.UnblockRequest) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.unblock = append(s.unblock, r)
	return nil
}

func (s *MemoryStore) ListUnblockRequests(_ context.Context) ([]domain.UnblockRequest, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.UnblockRequest, len(s.unblock))
	copy(out, s.unblock)
	return out, nil
}
