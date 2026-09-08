package platformhealth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

// State is a coarse service health state for the Root dashboard.
type State string

const (
	StateUp       State = "up"
	StateDegraded State = "degraded"
	StateDown     State = "down"
)

// Target describes one dependency to probe.
type Target struct {
	ID       string
	Name     string
	URL      string
	Optional bool
}

// ServiceResult is one probe outcome.
type ServiceResult struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	State     State  `json:"state"`
	LatencyMs int64  `json:"latency_ms"`
	Optional  bool   `json:"optional"`
	Detail    string `json:"detail,omitempty"`
}

// Signal is a compact Root ops indicator (not a fake incident).
type Signal struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Value string `json:"value"`
	Tone  string `json:"tone"` // ok | warn | critical | neutral
}

// Snapshot is the admin platform-health payload.
type Snapshot struct {
	CheckedAt          string          `json:"checked_at"`
	Environment        string          `json:"environment"`
	AllowsMutatingRuns bool            `json:"allows_mutating_runs"`
	Summary            Summary         `json:"summary"`
	Services           []ServiceResult `json:"services"`
	Signals            []Signal        `json:"signals"`
}

// Summary aggregates required (+ optional) service counts.
type Summary struct {
	Up           int `json:"up"`
	Degraded     int `json:"degraded"`
	Down         int `json:"down"`
	OptionalDown int `json:"optional_down"`
	Total        int `json:"total"`
}

// ProbeConfig drives Probe.
type ProbeConfig struct {
	Environment        string
	AllowsMutatingRuns bool
	HTTPClient         *http.Client
	Targets            []Target
	// CoreSelf marks local core as up without an extra HTTP hop (request already reached core).
	CoreSelf ServiceResult
}

// Probe runs dependency checks in parallel and builds a snapshot.
func Probe(ctx context.Context, cfg ProbeConfig) Snapshot {
	client := cfg.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 3 * time.Second}
	}
	results := make([]ServiceResult, 0, len(cfg.Targets)+1)
	if cfg.CoreSelf.ID != "" {
		results = append(results, cfg.CoreSelf)
	}
	var mu sync.Mutex
	var wg sync.WaitGroup
	for _, t := range cfg.Targets {
		if strings.TrimSpace(t.URL) == "" {
			continue
		}
		wg.Add(1)
		go func(t Target) {
			defer wg.Done()
			res := probeOne(ctx, client, t)
			mu.Lock()
			results = append(results, res)
			mu.Unlock()
		}(t)
	}
	wg.Wait()

	// Stable order: core first, then configured target order.
	ordered := orderResults(cfg, results)
	sum := summarize(ordered)
	return Snapshot{
		CheckedAt:          time.Now().UTC().Format(time.RFC3339),
		Environment:        cfg.Environment,
		AllowsMutatingRuns: cfg.AllowsMutatingRuns,
		Summary:            sum,
		Services:           ordered,
		Signals:            buildSignals(cfg, sum),
	}
}

func orderResults(cfg ProbeConfig, got []ServiceResult) []ServiceResult {
	byID := make(map[string]ServiceResult, len(got))
	for _, r := range got {
		byID[r.ID] = r
	}
	out := make([]ServiceResult, 0, len(got))
	if cfg.CoreSelf.ID != "" {
		if r, ok := byID[cfg.CoreSelf.ID]; ok {
			out = append(out, r)
			delete(byID, cfg.CoreSelf.ID)
		}
	}
	for _, t := range cfg.Targets {
		if r, ok := byID[t.ID]; ok {
			out = append(out, r)
			delete(byID, t.ID)
		}
	}
	for _, r := range byID {
		out = append(out, r)
	}
	return out
}

func summarize(services []ServiceResult) Summary {
	var s Summary
	s.Total = len(services)
	for _, svc := range services {
		switch svc.State {
		case StateUp:
			s.Up++
		case StateDegraded:
			s.Degraded++
		default:
			if svc.Optional {
				s.OptionalDown++
			} else {
				s.Down++
			}
		}
	}
	return s
}

func buildSignals(cfg ProbeConfig, sum Summary) []Signal {
	env := strings.TrimSpace(cfg.Environment)
	if env == "" {
		env = "unknown"
	}
	mutatingValue := "запрещены"
	mutatingTone := "neutral"
	if cfg.AllowsMutatingRuns {
		mutatingValue = "разрешены"
		mutatingTone = "warn"
	}
	overall := "все обязательные сервисы доступны"
	overallTone := "ok"
	if sum.Down > 0 {
		overall = fmt.Sprintf("недоступны обязательные: %d", sum.Down)
		overallTone = "critical"
	} else if sum.Degraded > 0 {
		overall = fmt.Sprintf("деградация: %d", sum.Degraded)
		overallTone = "warn"
	} else if sum.OptionalDown > 0 {
		overall = fmt.Sprintf("опциональные недоступны: %d", sum.OptionalDown)
		overallTone = "warn"
	}
	return []Signal{
		{ID: "overall", Label: "Сводка сервисов", Value: overall, Tone: overallTone},
		{ID: "environment", Label: "Среда", Value: env, Tone: "neutral"},
		{ID: "mutating_runs", Label: "Мутирующие проверки", Value: mutatingValue, Tone: mutatingTone},
	}
}

func probeOne(ctx context.Context, client *http.Client, t Target) ServiceResult {
	started := time.Now()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, t.URL, nil)
	if err != nil {
		return ServiceResult{ID: t.ID, Name: t.Name, State: StateDown, Optional: t.Optional, Detail: err.Error()}
	}
	res, err := client.Do(req)
	latency := time.Since(started).Milliseconds()
	if err != nil {
		return ServiceResult{
			ID: t.ID, Name: t.Name, State: StateDown, LatencyMs: latency, Optional: t.Optional,
			Detail: err.Error(),
		}
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(res.Body, 4096))
	detail := strings.TrimSpace(string(body))
	if len(detail) > 180 {
		detail = detail[:180] + "…"
	}
	if res.StatusCode >= 500 {
		return ServiceResult{
			ID: t.ID, Name: t.Name, State: StateDown, LatencyMs: latency, Optional: t.Optional,
			Detail: fmt.Sprintf("HTTP %d %s", res.StatusCode, detail),
		}
	}
	if res.StatusCode >= 400 {
		return ServiceResult{
			ID: t.ID, Name: t.Name, State: StateDegraded, LatencyMs: latency, Optional: t.Optional,
			Detail: fmt.Sprintf("HTTP %d %s", res.StatusCode, detail),
		}
	}
	state := StateUp
	if latency >= 1500 {
		state = StateDegraded
	}
	if tip := parseStatusHint(body); tip != "" {
		detail = tip
	}
	return ServiceResult{
		ID: t.ID, Name: t.Name, State: state, LatencyMs: latency, Optional: t.Optional, Detail: detail,
	}
}

func parseStatusHint(body []byte) string {
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return ""
	}
	parts := make([]string, 0, 4)
	if status, ok := payload["status"].(string); ok && status != "" {
		parts = append(parts, status)
	}
	if service, ok := payload["service"].(string); ok && service != "" {
		parts = append(parts, service)
	}
	if plugins, ok := payload["plugins"].([]any); ok && len(plugins) > 0 {
		names := make([]string, 0, len(plugins))
		for _, p := range plugins {
			if s, ok := p.(string); ok {
				names = append(names, s)
			}
		}
		if len(names) > 0 {
			parts = append(parts, "plugins="+strings.Join(names, ","))
		}
	}
	if primary, ok := payload["primary"].(string); ok && primary != "" {
		parts = append(parts, "primary="+primary)
	}
	if provider, ok := payload["provider"].(string); ok && provider != "" {
		parts = append(parts, "provider="+provider)
	}
	return strings.Join(parts, " · ")
}
