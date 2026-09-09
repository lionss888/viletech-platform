package estimate_test

import (
	"strings"
	"testing"

	"github.com/viletech/tools/intake/internal/estimate"
)

func TestFromSignalsPhrase(t *testing.T) {
	t.Parallel()
	r := estimate.FromSignals("bug", 120, 20)
	if r.Todos < 1 || r.Hours <= 0 {
		t.Fatalf("bad estimate %#v", r)
	}
	if strings.TrimSpace(r.ManagerPhrase) == "" {
		t.Fatal("empty phrase")
	}
	if strings.Contains(r.ManagerPhrase, "todo") || strings.Contains(r.ManagerPhrase, "3.8") {
		t.Fatalf("manager phrase leaked formula: %q", r.ManagerPhrase)
	}
}
