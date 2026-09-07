package metrics

import (
	"sync"
	"sync/atomic"
)

// Counters are process-local; scrape via /metrics JSON on the API.
type Counters struct {
	PrimarySuccess   atomic.Int64
	PrimaryFail      atomic.Int64
	ShadowOK         atomic.Int64
	ShadowFail       atomic.Int64
	GoldHumanUpsert  atomic.Int64
	ShadowLatencyMs  atomic.Int64
	PrimaryVsHuman   atomic.Int64
}

// Snapshot is a plain map for HTTP /metrics.
func (c *Counters) Snapshot() map[string]int64 {
	return map[string]int64{
		"primary_success":      c.PrimarySuccess.Load(),
		"primary_fail":         c.PrimaryFail.Load(),
		"shadow_ok":            c.ShadowOK.Load(),
		"shadow_fail":          c.ShadowFail.Load(),
		"gold_human_upsert":    c.GoldHumanUpsert.Load(),
		"shadow_latency_ms":    c.ShadowLatencyMs.Load(),
		"primary_vs_human_diff": c.PrimaryVsHuman.Load(),
	}
}

var (
	defaultMu sync.Mutex
	Default   = &Counters{}
)

// ResetForTest clears default counters (unit tests).
func ResetForTest() {
	defaultMu.Lock()
	defer defaultMu.Unlock()
	Default = &Counters{}
}
