package scenarioverify

import (
	"sync"
	"time"
)

// StepResult is one step outcome in a run report (no PII fields).
type StepResult struct {
	StepID         string `json:"step_id"`
	Title          string `json:"title"`
	OK             bool   `json:"ok"`
	ExpectedStatus string `json:"expected_status,omitempty"`
	ActualStatus   string `json:"actual_status,omitempty"`
	Detail         string `json:"detail,omitempty"`
	DurationMS     int64  `json:"duration_ms"`
}

// RunStatus is the lifecycle of a scenario run.
type RunStatus string

const (
	RunPending RunStatus = "pending"
	RunRunning RunStatus = "running"
	RunPassed  RunStatus = "passed"
	RunFailed  RunStatus = "failed"
)

// Run is a persisted scenario execution report.
type Run struct {
	ID         string       `json:"id"`
	ScenarioID string       `json:"scenario_id"`
	Mode       Mode         `json:"mode"`
	Status     RunStatus    `json:"status"`
	FormID     string       `json:"form_id,omitempty"`
	Steps      []StepResult `json:"steps"`
	Error      string       `json:"error,omitempty"`
	StartedAt  time.Time    `json:"started_at"`
	FinishedAt *time.Time   `json:"finished_at,omitempty"`
	ActorID    string       `json:"actor_id,omitempty"`
}

// RunStore persists scenario runs.
type RunStore interface {
	Save(run *Run) error
	Get(id string) (*Run, bool)
	List(limit int) []*Run
}

// MemoryRunStore is an in-process run history.
type MemoryRunStore struct {
	mu    sync.RWMutex
	order []string
	byID  map[string]*Run
}

// NewMemoryRunStore creates an empty store.
func NewMemoryRunStore() *MemoryRunStore {
	return &MemoryRunStore{byID: make(map[string]*Run)}
}

// Save upserts a run.
func (s *MemoryRunStore) Save(run *Run) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.byID[run.ID]; !ok {
		s.order = append(s.order, run.ID)
	}
	cp := *run
	cp.Steps = append([]StepResult(nil), run.Steps...)
	s.byID[run.ID] = &cp
	return nil
}

// Get returns a run by id.
func (s *MemoryRunStore) Get(id string) (*Run, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	r, ok := s.byID[id]
	if !ok {
		return nil, false
	}
	cp := *r
	cp.Steps = append([]StepResult(nil), r.Steps...)
	return &cp, true
}

// List returns newest-first runs up to limit.
func (s *MemoryRunStore) List(limit int) []*Run {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if limit <= 0 {
		limit = 20
	}
	out := make([]*Run, 0, limit)
	for i := len(s.order) - 1; i >= 0 && len(out) < limit; i-- {
		r := s.byID[s.order[i]]
		cp := *r
		cp.Steps = append([]StepResult(nil), r.Steps...)
		out = append(out, &cp)
	}
	return out
}
