package file

import (
	"bufio"
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/viletech/vdp/manager-ops/internal/domain"
	"github.com/viletech/vdp/shared/managerops"
)

// Store persists roster + behavioral events under dir (JSON / JSONL).
type Store struct {
	dir string
	mu  sync.Mutex
	mem *memoryMirror
}

type memoryMirror struct {
	people      map[string]domain.Person
	chats       map[string]domain.Chat
	memberships map[string][]domain.Membership
	consent     map[string]domain.Consent
	events      map[string]managerops.Event
	eventOrder  []string
	scores      map[string]domain.ScoreAggregate
}

type rosterSnapshot struct {
	People      map[string]domain.Person         `json:"people"`
	Chats       map[string]domain.Chat           `json:"chats"`
	Memberships map[string][]domain.Membership   `json:"memberships"`
	Scores      map[string]domain.ScoreAggregate `json:"scores"`
}

// New loads existing files from dir or starts empty.
func New(dir string) (*Store, error) {
	s := &Store{
		dir: dir,
		mem: &memoryMirror{
			people:      map[string]domain.Person{},
			chats:       map[string]domain.Chat{},
			memberships: map[string][]domain.Membership{},
			consent:     map[string]domain.Consent{},
			events:      map[string]managerops.Event{},
			scores:      map[string]domain.ScoreAggregate{},
		},
	}
	if err := os.MkdirAll(dir, 0o750); err != nil {
		return nil, err
	}
	if err := s.load(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Store) rosterPath() string  { return filepath.Join(s.dir, "roster.json") }
func (s *Store) consentPath() string { return filepath.Join(s.dir, "consent.json") }
func (s *Store) eventsPath() string  { return filepath.Join(s.dir, "events.jsonl") }

func (s *Store) load() error {
	if raw, err := os.ReadFile(s.rosterPath()); err == nil && len(raw) > 0 {
		var snap rosterSnapshot
		if err := json.Unmarshal(raw, &snap); err != nil {
			return err
		}
		if snap.People != nil {
			s.mem.people = snap.People
		}
		if snap.Chats != nil {
			s.mem.chats = snap.Chats
		}
		if snap.Memberships != nil {
			s.mem.memberships = snap.Memberships
		}
		if snap.Scores != nil {
			s.mem.scores = snap.Scores
		}
	}
	if raw, err := os.ReadFile(s.consentPath()); err == nil && len(raw) > 0 {
		var c map[string]domain.Consent
		if err := json.Unmarshal(raw, &c); err != nil {
			return err
		}
		if c != nil {
			s.mem.consent = c
		}
	}
	f, err := os.Open(s.eventsPath())
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for sc.Scan() {
		line := sc.Bytes()
		if len(line) == 0 {
			continue
		}
		var e managerops.Event
		if err := json.Unmarshal(line, &e); err != nil {
			continue
		}
		key := e.Key()
		if key == "" {
			continue
		}
		if _, ok := s.mem.events[key]; ok {
			continue
		}
		s.mem.events[key] = e
		s.mem.eventOrder = append(s.mem.eventOrder, key)
	}
	return sc.Err()
}

func (s *Store) persistRosterLocked() error {
	snap := rosterSnapshot{
		People:      s.mem.people,
		Chats:       s.mem.chats,
		Memberships: s.mem.memberships,
		Scores:      s.mem.scores,
	}
	raw, err := json.MarshalIndent(snap, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.rosterPath(), raw, 0o640)
}

func (s *Store) persistConsentLocked() error {
	raw, err := json.MarshalIndent(s.mem.consent, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.consentPath(), raw, 0o640)
}

func (s *Store) UpsertPerson(_ context.Context, p domain.Person) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.mem.people[p.TelegramUserID] = p
	return s.persistRosterLocked()
}

func (s *Store) UpsertChat(_ context.Context, c domain.Chat) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := c.ChatID
	if key == "" {
		key = c.WorkChatID
	}
	s.mem.chats[key] = c
	return s.persistRosterLocked()
}

func (s *Store) ReplaceMemberships(_ context.Context, chatID string, members []domain.Membership) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := make([]domain.Membership, len(members))
	copy(cp, members)
	s.mem.memberships[chatID] = cp
	return s.persistRosterLocked()
}

func (s *Store) ListMemberships(_ context.Context, chatID string) ([]domain.Membership, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	src := s.mem.memberships[chatID]
	out := make([]domain.Membership, len(src))
	copy(out, src)
	return out, nil
}

func (s *Store) PersonByTelegram(_ context.Context, telegramUserID string) (domain.Person, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	p, ok := s.mem.people[telegramUserID]
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
		for id, p := range s.mem.people {
			if p.AccountID == accountID {
				tgIDs[id] = struct{}{}
			}
		}
	}
	if len(tgIDs) == 0 {
		return false, nil
	}
	for chatID, members := range s.mem.memberships {
		if !chatActiveLocked(s.mem, chatID) {
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

func chatActiveLocked(mem *memoryMirror, chatID string) bool {
	c, ok := mem.chats[chatID]
	if !ok {
		return true
	}
	return c.Active
}

func (s *Store) SetConsent(_ context.Context, c domain.Consent) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.mem.consent[c.AccountID] = c
	return s.persistConsentLocked()
}

func (s *Store) Consent(_ context.Context, accountID string) (domain.Consent, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	c, ok := s.mem.consent[accountID]
	return c, ok, nil
}

func (s *Store) SaveEvent(_ context.Context, e managerops.Event) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := e.Key()
	if _, ok := s.mem.events[key]; ok {
		return false, nil
	}
	s.mem.events[key] = e
	s.mem.eventOrder = append(s.mem.eventOrder, key)
	f, err := os.OpenFile(s.eventsPath(), os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o640)
	if err != nil {
		return false, err
	}
	defer f.Close()
	enc := json.NewEncoder(f)
	if err := enc.Encode(e); err != nil {
		return false, err
	}
	return true, nil
}

func (s *Store) ListEvents(_ context.Context, accountID string, since time.Time) ([]managerops.Event, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]managerops.Event, 0)
	for _, key := range s.mem.eventOrder {
		e := s.mem.events[key]
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
	s.mem.scores[score.AccountID+"|"+score.Period] = score
	return s.persistRosterLocked()
}

func (s *Store) Score(_ context.Context, accountID, period string) (domain.ScoreAggregate, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	sc, ok := s.mem.scores[accountID+"|"+period]
	return sc, ok, nil
}
