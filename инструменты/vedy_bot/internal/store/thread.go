package store

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// ThreadMsg is one chat line mirrored for the operator console.
type ThreadMsg struct {
	ID          string       `json:"id"`
	UpdateID    int64        `json:"update_id,omitempty"`
	MessageID   int64        `json:"message_id"`
	ChatID      int64        `json:"chat_id"`
	Channel     string       `json:"channel,omitempty"` // manager|operator
	FromID      int64        `json:"from_id,omitempty"`
	FromUser    string       `json:"from_user,omitempty"`
	Direction   string       `json:"direction"` // in|out|system|agent
	Text        string       `json:"text"`
	Kind        string       `json:"kind,omitempty"`
	Trigger     string       `json:"trigger,omitempty"`
	Attachments []Attachment `json:"attachments,omitempty"`
	At          string       `json:"at"`
}

// AppendThread writes one mirrored chat message.
func (s *Store) AppendThread(m ThreadMsg) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if m.At == "" {
		m.At = time.Now().UTC().Format(time.RFC3339)
	}
	if m.ID == "" {
		m.ID = fmt.Sprintf("%d:%d:%s", m.ChatID, m.MessageID, m.Direction)
	}
	day := time.Now().UTC().Format("2006-01-02")
	dir := filepath.Join(s.home, "thread")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	path := filepath.Join(dir, day+".jsonl")
	f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	defer f.Close()
	return json.NewEncoder(f).Encode(m)
}

// ListThreadRecent returns recent mirrored messages (oldest→newest within window).
func (s *Store) ListThreadRecent(limit int) ([]ThreadMsg, error) {
	if limit <= 0 {
		limit = 200
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	dir := filepath.Join(s.home, "thread")
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var files []string
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".jsonl") {
			continue
		}
		files = append(files, e.Name())
	}
	sort.Strings(files)
	var all []ThreadMsg
	for _, name := range files {
		path := filepath.Join(dir, name)
		f, err := os.Open(path)
		if err != nil {
			continue
		}
		sc := bufio.NewScanner(f)
		sc.Buffer(make([]byte, 0, 64*1024), 2*1024*1024)
		for sc.Scan() {
			line := sc.Bytes()
			if len(line) == 0 {
				continue
			}
			var m ThreadMsg
			if err := json.Unmarshal(line, &m); err != nil {
				continue
			}
			all = append(all, m)
		}
		f.Close()
	}
	if len(all) > limit {
		all = all[len(all)-limit:]
	}
	return all, nil
}

// GetThreadByIDs returns messages whose id is in the set.
func (s *Store) GetThreadByIDs(ids []string) ([]ThreadMsg, error) {
	want := map[string]struct{}{}
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id != "" {
			want[id] = struct{}{}
		}
	}
	if len(want) == 0 {
		return nil, nil
	}
	all, err := s.ListThreadRecent(2000)
	if err != nil {
		return nil, err
	}
	var out []ThreadMsg
	for _, m := range all {
		if _, ok := want[m.ID]; ok {
			out = append(out, m)
		}
	}
	return out, nil
}

// SaveAgentJob persists an agent job under agent/jobs/{id}.json.
func (s *Store) SaveAgentJob(id string, payload any) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	dir := filepath.Join(s.home, "agent", "jobs")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	b, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(dir, sanitizeID(id)+".json"), b, 0o600)
}

// LoadAgentJob loads a job JSON into dest.
func (s *Store) LoadAgentJob(id string, dest any) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	b, err := os.ReadFile(filepath.Join(s.home, "agent", "jobs", sanitizeID(id)+".json"))
	if err != nil {
		return err
	}
	return json.Unmarshal(b, dest)
}

func sanitizeID(id string) string {
	var b strings.Builder
	for _, r := range id {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			b.WriteRune(r)
		} else {
			b.WriteByte('-')
		}
	}
	out := b.String()
	if out == "" {
		return "job"
	}
	return out
}
