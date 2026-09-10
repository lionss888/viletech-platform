package experience

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// Event records HITL / conflict outcomes for later template tuning (not ML training).
type Event struct {
	At             string   `json:"at"`
	CardID         string   `json:"card_id"`
	Kind           string   `json:"kind"` // approve|decline|stale|conflict|clarify|proposal
	Class          string   `json:"class,omitempty"`
	TimelinePhrase string   `json:"timeline_phrase,omitempty"`
	Conflicts      []string `json:"conflicts,omitempty"`
	ReminderCount  int      `json:"reminder_count,omitempty"`
}

var mu sync.Mutex

// Append writes one redacted experience line under home/experience/.
func Append(home string, ev Event) error {
	mu.Lock()
	defer mu.Unlock()
	if ev.At == "" {
		ev.At = time.Now().UTC().Format(time.RFC3339)
	}
	dir := filepath.Join(home, "experience")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	day := time.Now().UTC().Format("2006-01-02")
	path := filepath.Join(dir, day+".jsonl")
	f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	defer f.Close()
	enc := json.NewEncoder(f)
	return enc.Encode(ev)
}
