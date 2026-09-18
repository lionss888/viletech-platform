package pipeline

import (
	"testing"
)

func TestParseAgentMarkers(t *testing.T) {
	t.Parallel()
	raw := "OUTCOME: clarify\nTEXT: Нужна сумма и валюта\nTIMELINE: -\n"
	o, text, tl := ParseAgentMarkers(raw)
	if o != "clarify" || text == "" || tl != "" {
		t.Fatalf("%s %q %q", o, text, tl)
	}
	safe := ManagerSafeFromAgent(o, text, tl)
	if safe == "" {
		t.Fatal("empty safe")
	}
}

func TestEffectiveHITLMode(t *testing.T) {
	t.Parallel()
	p := &Pipeline{HITLMode: "hybrid"}
	if p.EffectiveHITLMode() != "hybrid" {
		t.Fatal(p.EffectiveHITLMode())
	}
	p.HITLMode = ""
	if p.EffectiveHITLMode() != "rules" {
		t.Fatal(p.EffectiveHITLMode())
	}
}

func TestWantCursorIntake(t *testing.T) {
	t.Parallel()
	p := &Pipeline{TGCursor: true, HITLMode: "hybrid", StartAgent: func(string, string, bool) (string, error) {
		return "j1", nil
	}}
	if !p.wantCursorIntake() {
		t.Fatal("expected want")
	}
	p.TGCursor = false
	if p.wantCursorIntake() {
		t.Fatal("expected skip")
	}
}
