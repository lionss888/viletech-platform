package memory

import (
	"context"
	"sync"
	"time"

	"github.com/viletech/vdp/manager-ops/internal/domain"
	"github.com/viletech/vdp/shared/managerops"
)

// Store is an in-memory roster + behavior store for unit tests.
type Store struct {
	mu          sync.Mutex
	people      map[string]domain.Person
	chats       map[string]domain.Chat
	memberships map[string][]domain.Membership
	consent     map[string]domain.Consent
	events      map[string]managerops.Event
	eventOrder  []string
	scores      map[string]domain.ScoreAggregate
}

// New creates an empty memory store.
func New() *Store {
	return &Store{
		people:      map[string]domain.Person{},
		chats:       map[string]domain.Chat{},
		memberships: map[string][]domain.Membership{},
		consent:     map[string]domain.Consent{},
		events:      map[string]managerops.Event{},
		scores:      map[string]domain.ScoreAggregate{},
	}
}

func (s *Store) UpsertPerson(_ context.Context, p domain.Person) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.people[p.TelegramUserID] = p
	return nil
}

func (s *Store) UpsertChat(_ context.Context, c domain.Chat) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := c.ChatID
	if key == "" {
		key = c.WorkChatID
	}
	s.chats[key] = c
	return nil
}

func (s *Store) ReplaceMemberships(_ context.Context, chatID string, members []domain.Membership) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := make([]domain.Membership, len(members))
	copy(cp, members)
	s.memberships[chatID] = cp
	return nil
}

func (s *Store) ListMemberships(_ context.Context, chatID string) ([]domain.Membership, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	src := s.memberships[chatID]
	out := make([]domain.Membership, len(src))
	copy(out, src)
	return out, nil
}

func (s *Store) PersonByTelegram(_ context.Context, telegramUserID string) (domain.Person, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	p, ok := s.people[telegramUserID]
	return p, ok, nil
}

func (s *Store) HasActiveMembership(_ context.Context, telegramUserID, accountID string) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	tgIDs := map[string]struct{}{}
	if telegramUserID != "" {
		tgIDs[telegramUserID] = struct{}{}
	}
	if accountID != "" {
		for id, p := range s.people {
			if p.AccountID == accountID {
				tgIDs[id] = struct{}{}
			}
		}
	}
	if len(tgIDs) == 0 {
		return false, nil
	}
	for chatID, members := range s.memberships {
		if c, ok := s.chats[chatID]; ok && !c.Active {
			continue
		}
		for _, m := range members {
			if m.LeftAt != nil {
				continue
			}
			if _, ok := tgIDs[m.TelegramUserID]; ok {
				return true, nil
			}
		}
	}
	return false, nil
}

func (s *Store) SetConsent(_ context.Context, c domain.Consent) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.consent[c.AccountID] = c
	return nil
}

func (s *Store) Consent(_ context.Context, accountID string) (domain.Consent, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	c, ok := s.consent[accountID]
	return c, ok, nil
}

func (s *Store) SaveEvent(_ context.Context, e managerops.Event) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := e.Key()
	if _, ok := s.events[key]; ok {
		return false, nil
	}
	s.events[key] = e
	s.eventOrder = append(s.eventOrder, key)
	return true, nil
}

func (s *Store) ListEvents(_ context.Context, accountID string, since time.Time) ([]managerops.Event, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]managerops.Event, 0)
	for _, key := range s.eventOrder {
		e := s.events[key]
		if accountID != "" && e.AccountID != accountID {
			continue
		}
		if e.OccurredAt.Before(since) {
			continue
		}
		out = append(out, e)
	}
	return out, nil
}

func (s *Store) ListAllEvents(ctx context.Context, since time.Time) ([]managerops.Event, error) {
	return s.ListEvents(ctx, "", since)
}

func (s *Store) UpsertScore(_ context.Context, score domain.ScoreAggregate) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.scores[score.AccountID+"|"+score.Period] = score
	return nil
}

func (s *Store) Score(_ context.Context, accountID, period string) (domain.ScoreAggregate, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	sc, ok := s.scores[accountID+"|"+period]
	return sc, ok, nil
}
