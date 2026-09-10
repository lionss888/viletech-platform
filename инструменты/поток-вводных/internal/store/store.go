package store

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Attachment is a local media reference under media/.
type Attachment struct {
	ID       string `json:"id"`
	Path     string `json:"path"`
	Name     string `json:"name,omitempty"`
	MIME     string `json:"mime,omitempty"`
	Size     int64  `json:"size,omitempty"`
	Source   string `json:"source,omitempty"` // telegram|console|upload
	TGFileID string `json:"tg_file_id,omitempty"`
}

// Record is one inbox line.
type Record struct {
	UpdateID     int64        `json:"update_id"`
	MessageID    int64        `json:"message_id"`
	ChatID       int64        `json:"chat_id"`
	FromID       int64        `json:"from_id"`
	FromUsername string       `json:"from_username,omitempty"`
	Trigger      string       `json:"trigger"`
	Kind         string       `json:"kind,omitempty"`
	Source       string       `json:"source,omitempty"` // telegram|console
	Text         string       `json:"text"`
	Class        string       `json:"class,omitempty"`
	Confidence   string       `json:"confidence,omitempty"`
	Chars        int          `json:"chars,omitempty"`
	Tags         []string     `json:"tags,omitempty"`
	Attachments  []Attachment `json:"attachments,omitempty"`
	ReceivedAt   string       `json:"received_at"`
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

// ListInboxRecent reads recent inbox records (newest last among returned, chronological within files).
func (s *Store) ListInboxRecent(limit int) ([]Record, error) {
	if limit <= 0 {
		limit = 100
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	dir := filepath.Join(s.home, "inbox")
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var files []string
	for _, e := range entries {
		if e.IsDir() || filepath.Ext(e.Name()) != ".jsonl" {
			continue
		}
		files = append(files, e.Name())
	}
	// Lexicographic YYYY-MM-DD.jsonl sorts oldest→newest.
	sortStrings(files)
	var all []Record
	for _, name := range files {
		path := filepath.Join(dir, name)
		f, err := os.Open(path)
		if err != nil {
			continue
		}
		sc := bufio.NewScanner(f)
		sc.Buffer(make([]byte, 0, 64*1024), 1024*1024)
		for sc.Scan() {
			line := sc.Bytes()
			if len(line) == 0 {
				continue
			}
			var rec Record
			if err := json.Unmarshal(line, &rec); err != nil {
				continue
			}
			all = append(all, rec)
		}
		f.Close()
	}
	if len(all) > limit {
		all = all[len(all)-limit:]
	}
	return all, nil
}

// MediaDir returns ~/.vdp-intake/media.
func (s *Store) MediaDir() string {
	return filepath.Join(s.home, "media")
}

// SaveMedia writes bytes under media/{id}_{safeName} and returns relative path from home.
func (s *Store) SaveMedia(id, name string, data []byte) (Attachment, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if id == "" {
		id = fmt.Sprintf("m-%d", time.Now().UnixNano())
	}
	safe := sanitizeFileName(name)
	if safe == "" {
		safe = "file.bin"
	}
	dir := s.MediaDir()
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return Attachment{}, err
	}
	rel := filepath.Join("media", id+"_"+safe)
	abs := filepath.Join(s.home, rel)
	if err := os.WriteFile(abs, data, 0o600); err != nil {
		return Attachment{}, err
	}
	return Attachment{
		ID:     id,
		Path:   rel,
		Name:   safe,
		Size:   int64(len(data)),
		Source: "upload",
	}, nil
}

// AbsMediaPath resolves attachment path under home.
func (s *Store) AbsMediaPath(rel string) string {
	rel = filepath.Clean(rel)
	if strings.Contains(rel, "..") {
		return ""
	}
	return filepath.Join(s.home, rel)
}

func sanitizeFileName(name string) string {
	base := filepath.Base(name)
	var b strings.Builder
	for _, r := range base {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '.' || r == '-' || r == '_' {
			b.WriteRune(r)
		} else {
			b.WriteByte('_')
		}
	}
	out := b.String()
	if len(out) > 120 {
		out = out[:120]
	}
	return out
}

func sortStrings(a []string) {
	for i := 0; i < len(a); i++ {
		for j := i + 1; j < len(a); j++ {
			if a[j] < a[i] {
				a[i], a[j] = a[j], a[i]
			}
		}
	}
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
