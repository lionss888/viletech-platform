package gold

import (
	"bufio"
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/viletech/vdp/shared/extraction"
)

// Store appends/upserts GoldRecord JSONL under dir.
type Store struct {
	dir string
	mu  sync.Mutex
}

func NewStore(dir string) *Store {
	return &Store{dir: dir}
}

func (s *Store) path() string {
	return filepath.Join(s.dir, "gold.jsonl")
}

// Append writes a new gold row (primary+shadow).
func (s *Store) Append(rec extraction.GoldRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := os.MkdirAll(s.dir, 0o750); err != nil {
		return err
	}
	if rec.CreatedAt.IsZero() {
		rec.CreatedAt = time.Now().UTC()
	}
	rec.UpdatedAt = rec.CreatedAt
	if rec.SchemaVersion == "" {
		rec.SchemaVersion = extraction.SchemaVersion
	}
	f, err := os.OpenFile(s.path(), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o640)
	if err != nil {
		return err
	}
	defer f.Close()
	enc := json.NewEncoder(f)
	return enc.Encode(rec)
}

// UpsertHuman merges human_out into the latest matching gold_id / form_payment_id.
func (s *Store) UpsertHuman(formID, goldID string, human extraction.Result) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := os.MkdirAll(s.dir, 0o750); err != nil {
		return err
	}
	recs, err := s.readAllUnlocked()
	if err != nil {
		return err
	}
	updated := false
	now := time.Now().UTC()
	for i := len(recs) - 1; i >= 0; i-- {
		match := false
		if goldID != "" && recs[i].GoldID == goldID {
			match = true
		}
		if formID != "" && recs[i].FormPaymentID == formID {
			match = true
		}
		if !match {
			continue
		}
		h := human
		h.Meta.Confirmed = true
		recs[i].HumanOut = &h
		recs[i].UpdatedAt = now
		updated = true
		break
	}
	if !updated {
		id := goldID
		if id == "" {
			id = extraction.NewGoldID(formID, "human")
		}
		h := human
		h.Meta.Confirmed = true
		recs = append(recs, extraction.GoldRecord{
			GoldID:        id,
			FormPaymentID: formID,
			SchemaVersion: extraction.SchemaVersion,
			CreatedAt:     now,
			UpdatedAt:     now,
			HumanOut:      &h,
			PrimaryOut:    extraction.Result{SchemaVersion: extraction.SchemaVersion, Meta: extraction.Meta{EngineID: "unknown"}},
			ShadowOut:     extraction.Result{SchemaVersion: extraction.SchemaVersion, Meta: extraction.Meta{EngineID: "unknown"}},
		})
	}
	return s.rewriteUnlocked(recs)
}

func (s *Store) readAllUnlocked() ([]extraction.GoldRecord, error) {
	f, err := os.Open(s.path())
	if os.IsNotExist(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	defer f.Close()
	var out []extraction.GoldRecord
	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 0, 64*1024), 8*1024*1024)
	for sc.Scan() {
		line := sc.Bytes()
		if len(line) == 0 {
			continue
		}
		var rec extraction.GoldRecord
		if err := json.Unmarshal(line, &rec); err != nil {
			continue
		}
		out = append(out, rec)
	}
	return out, sc.Err()
}

func (s *Store) rewriteUnlocked(recs []extraction.GoldRecord) error {
	tmp := s.path() + ".tmp"
	f, err := os.OpenFile(tmp, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o640)
	if err != nil {
		return err
	}
	enc := json.NewEncoder(f)
	for _, rec := range recs {
		if err := enc.Encode(rec); err != nil {
			_ = f.Close()
			return err
		}
	}
	if err := f.Close(); err != nil {
		return err
	}
	return os.Rename(tmp, s.path())
}

// List returns all gold records (for export).
func (s *Store) List() ([]extraction.GoldRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.readAllUnlocked()
}
