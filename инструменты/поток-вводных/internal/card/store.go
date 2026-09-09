package card

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

// Status is HITL lifecycle for one intake card.
type Status string

const (
	StatusDraft           Status = "draft"
	StatusAwaitingClarify Status = "awaiting_clarify"
	StatusAwaitingApprove Status = "awaiting_approve"
	StatusApproved        Status = "approved"
	StatusDeclined        Status = "declined"
	StatusStale           Status = "stale"
)

// Card is the durable intake work item (no PII beyond redacted summary).
type Card struct {
	ID              string    `json:"id"`
	ChatID          int64     `json:"chat_id"`
	RootMessageID   int64     `json:"root_message_id"`
	FromUsername    string    `json:"from_username,omitempty"`
	Status          Status    `json:"status"`
	Class           string    `json:"class,omitempty"`
	Summary         string    `json:"summary"`
	Proposal        string    `json:"proposal,omitempty"`
	TimelinePhrase  string    `json:"timeline_phrase,omitempty"`
	Conflicts       []string  `json:"conflicts,omitempty"`
	Texts           []string  `json:"texts,omitempty"`
	ReminderCount   int       `json:"reminder_count"`
	LastAskAt       time.Time `json:"last_ask_at"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// Store persists cards under ~/.vdp-intake/cards.
type Store struct {
	mu   sync.Mutex
	home string
}

// NewStore creates a card store.
func NewStore(home string) *Store {
	return &Store{home: home}
}

func (s *Store) dir() string {
	return filepath.Join(s.home, "cards")
}

func (s *Store) path(id string) string {
	safe := strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		return '-'
	}, id)
	return filepath.Join(s.dir(), safe+".json")
}

// NewID builds a stable card id from chat and root message.
func NewID(chatID, messageID int64) string {
	return fmt.Sprintf("card-%d-%d", chatID, messageID)
}

// Save writes the card atomically-ish.
func (s *Store) Save(c *Card) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if c.ID == "" {
		return fmt.Errorf("card id required")
	}
	c.UpdatedAt = time.Now().UTC()
	if c.CreatedAt.IsZero() {
		c.CreatedAt = c.UpdatedAt
	}
	if err := os.MkdirAll(s.dir(), 0o700); err != nil {
		return err
	}
	b, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.path(c.ID), b, 0o600)
}

// Get loads a card by id.
func (s *Store) Get(id string) (*Card, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	b, err := os.ReadFile(s.path(id))
	if err != nil {
		return nil, err
	}
	var c Card
	if err := json.Unmarshal(b, &c); err != nil {
		return nil, err
	}
	return &c, nil
}

// ListOpenInChat returns awaiting cards for a chat (newest first).
func (s *Store) ListOpenInChat(chatID int64) ([]*Card, error) {
	all, err := s.listAll()
	if err != nil {
		return nil, err
	}
	var out []*Card
	for _, c := range all {
		if c.ChatID != chatID {
			continue
		}
		if c.Status == StatusAwaitingApprove || c.Status == StatusAwaitingClarify {
			out = append(out, c)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].UpdatedAt.After(out[j].UpdatedAt)
	})
	return out, nil
}

// ListDueReminders returns cards needing a soft nudge or stale transition.
func (s *Store) ListDueReminders(now time.Time, interval time.Duration) ([]*Card, error) {
	all, err := s.listAll()
	if err != nil {
		return nil, err
	}
	var out []*Card
	for _, c := range all {
		if c.Status != StatusAwaitingApprove && c.Status != StatusAwaitingClarify {
			continue
		}
		if c.LastAskAt.IsZero() {
			continue
		}
		if now.Sub(c.LastAskAt) >= interval {
			out = append(out, c)
		}
	}
	return out, nil
}

func (s *Store) listAll() ([]*Card, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	dir := s.dir()
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var out []*Card
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		b, err := os.ReadFile(filepath.Join(dir, e.Name()))
		if err != nil {
			continue
		}
		var c Card
		if err := json.Unmarshal(b, &c); err != nil {
			continue
		}
		out = append(out, &c)
	}
	return out, nil
}
