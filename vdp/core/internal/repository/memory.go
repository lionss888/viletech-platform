package repository

import (
	"context"
	"sync"
	"time"

	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

type Store struct {
	mu            sync.RWMutex
	accounts      map[string]domain.Account
	accountsEmail map[string]string
	orgs          map[string]domain.Organization
	forms         map[string]formpayment.Form
	history       []formpayment.ComplianceHistoryEntry
	docs          []formpayment.Document
}

func NewStore() *Store {
	return &Store{
		accounts:      map[string]domain.Account{},
		accountsEmail: map[string]string{},
		orgs:          map[string]domain.Organization{},
		forms:         map[string]formpayment.Form{},
		history:       []formpayment.ComplianceHistoryEntry{},
		docs:          []formpayment.Document{},
	}
}

func (s *Store) SaveAccount(_ context.Context, account domain.Account) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.accounts[account.ID] = account
	s.accountsEmail[account.Email] = account.ID
	return nil
}

func (s *Store) AccountByID(_ context.Context, id string) (domain.Account, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	account, ok := s.accounts[id]
	if !ok {
		return domain.Account{}, apperrors.ErrResourceNotFound
	}
	return account, nil
}

func (s *Store) AccountByEmail(_ context.Context, email string) (domain.Account, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	id, ok := s.accountsEmail[email]
	if !ok {
		return domain.Account{}, apperrors.ErrResourceNotFound
	}
	return s.accounts[id], nil
}

func (s *Store) SaveOrganization(_ context.Context, org domain.Organization) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.orgs[org.ID] = org
	return nil
}

func (s *Store) OrganizationByID(_ context.Context, id string) (domain.Organization, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	org, ok := s.orgs[id]
	if !ok {
		return domain.Organization{}, apperrors.ErrResourceNotFound
	}
	return org, nil
}

func (s *Store) ListAwaiting(_ context.Context) []domain.Organization {
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

func (s *Store) SaveForm(_ context.Context, form formpayment.Form) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	form.UpdatedAt = time.Now().UTC()
	s.forms[form.ID] = form
	return nil
}

func (s *Store) FormByID(_ context.Context, id string) (formpayment.Form, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	form, ok := s.forms[id]
	if !ok {
		return formpayment.Form{}, apperrors.ErrResourceNotFound
	}
	return form, nil
}

func (s *Store) ListForms(_ context.Context) []formpayment.Form {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]formpayment.Form, 0, len(s.forms))
	for _, form := range s.forms {
		out = append(out, form)
	}
	return out
}

func (s *Store) AppendHistory(_ context.Context, entry formpayment.ComplianceHistoryEntry) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.history = append(s.history, entry)
	return nil
}

func (s *Store) HistoryByForm(_ context.Context, formID string) []formpayment.ComplianceHistoryEntry {
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
