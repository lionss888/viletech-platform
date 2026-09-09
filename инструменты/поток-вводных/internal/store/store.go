package store

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"time"
)

// Record is one inbox line.
type Record struct {
	UpdateID     int64  `json:"update_id"`
	MessageID    int64  `json:"message_id"`
	ChatID       int64  `json:"chat_id"`
	FromID       int64  `json:"from_id"`
	FromUsername string `json:"from_username,omitempty"`
	Trigger      string `json:"trigger"`
	Kind         string `json:"kind,omitempty"`
	Text         string `json:"text"`
	Class        string `json:"class,omitempty"`
	Confidence   string `json:"confidence,omitempty"`
	Chars        int    `json:"chars,omitempty"`
	Tags         []string `json:"tags,omitempty"`
	ReceivedAt   string `json:"received_at"`
}

// Store persists inbox jsonl and seen update ids.
type Store struct {
	mu   sync.Mutex
	home string
}

// New creates a store under home (~/.vdp-intake).
func New(home string) *Store {
	return &Store{home: home}
}

// Home returns the intake data directory.
func (s *Store) Home() string {
	if s == nil {
		return ""
	}
	return s.home
}

// Seen reports whether update_id was already processed.
func (s *Store) Seen(updateID int64) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	ids, err := s.loadSeenLocked()
	if err != nil {
		return false, err
	}
	_, ok := ids[updateID]
	return ok, nil
}

// MarkSeen records update_id.
func (s *Store) MarkSeen(updateID int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	ids, err := s.loadSeenLocked()
	if err != nil {
		return err
	}
	if _, ok := ids[updateID]; ok {
		return nil
	}
	path := filepath.Join(s.home, "seen", "update_ids")
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = fmt.Fprintf(f, "%d\n", updateID)
	return err
}

// AppendInbox writes one redacted record.
func (s *Store) AppendInbox(rec Record) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if rec.ReceivedAt == "" {
		rec.ReceivedAt = time.Now().UTC().Format(time.RFC3339)
	}
	day := time.Now().UTC().Format("2006-01-02")
	dir := filepath.Join(s.home, "inbox")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	path := filepath.Join(dir, day+".jsonl")
	f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	defer f.Close()
	enc := json.NewEncoder(f)
	return enc.Encode(rec)
}

func (s *Store) loadSeenLocked() (map[int64]struct{}, error) {
	path := filepath.Join(s.home, "seen", "update_ids")
	out := map[int64]struct{}{}
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return out, nil
		}
		return nil, err
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := sc.Text()
		if line == "" {
			continue
		}
		id, err := strconv.ParseInt(line, 10, 64)
		if err != nil {
			continue
		}
		out[id] = struct{}{}
	}
	return out, sc.Err()
}
