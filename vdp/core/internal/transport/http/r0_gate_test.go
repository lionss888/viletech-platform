package httpapi_test

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// gapMustBlockers are gap-analysis IDs marked блокер MVP (Must for product path).
// R0 inventory only — Status reflects vdp progress, not Nest source.
var gapMustBlockers = []struct {
	ID     string
	Title  string
	Status EndpointParityStatus
}{
	{"ROLE-PROV", "Provider GET without client PII DTO", ParityDone},
	{"STAT-AWAIT", "Client awaiting manager / rating queue", ParityDone},
	{"FLOW-MGR-DEADLINE", "executionDeadline for provider + notifications", ParityDone},
	{"FLOW-PROV-VIEW", "Provider view without account PII", ParityDone},
	{"MOD-RATE", "Rate / resolveDealRate for order and report docs", ParityDone},
	{"MOD-COMM", "CommissionCalculation for fee fields on docs", ParityDone},
}

// extensionChecklist9 mirrors вводные/расширение вводных.txt §9 (platform next steps).
var extensionChecklist9 = []struct {
	Item   string
	Status EndpointParityStatus
}{
	{"Contract entity: type, agentId, templateId, status, uploadedBy, accountRef, history", ParityDone},
	{"Contract templates bound to payment agent in admin", ParityDone},
	{"API: manual contract attach + auto-confirm", ParityDone},
	{"Form field: organization on-behalf + visibility by contract type", ParityDone},
	{"Multi-order domain (principal / ADVANCE_*) + active order for provider", ParityDone},
	{"Refund SM + cancel invariant while funds unrefunded", ParityDone},
	{"Bank client type: commission, rate markup flag, create API, status webhooks", ParityDone},
	{"Decision: REPORT_ACCEPTED kept in flat SM (REPORT_* → report_accepted → completed)", ParityDone},
	{"Align PA/rate: board order (assign agent + rate/commission before order signing)", ParityDone},
}

func TestHonestyReadinessRuleFileExists(t *testing.T) {
	t.Parallel()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	repoRoot := filepath.Clean(filepath.Join(filepath.Dir(file), "..", "..", "..", "..", ".."))
	rulePath := filepath.Join(repoRoot, ".cursor", "rules", "честность-готовности.mdc")
	raw, err := os.ReadFile(rulePath)
	if err != nil {
		t.Fatalf("honesty rule missing: %v", err)
	}
	text := string(raw)
	if !strings.Contains(text, "alwaysApply: true") {
		t.Fatal("honesty rule must set alwaysApply: true")
	}
	if !strings.Contains(text, "паритет") && !strings.Contains(text, "100%") {
		t.Fatal("honesty rule must forbid false parity/100% claims")
	}
}

func TestR0GapMustAndExtensionChecklistBaseline(t *testing.T) {
	t.Parallel()
	if len(gapMustBlockers) < 3 {
		t.Fatal("gap Must inventory too small")
	}
	if len(extensionChecklist9) != 9 {
		t.Fatalf("extension §9 checklist want 9 items got %d", len(extensionChecklist9))
	}
	var gapDone, gapStub, gapMissing int
	for _, row := range gapMustBlockers {
		switch row.Status {
		case ParityDone:
			gapDone++
		case ParityStub:
			gapStub++
		case ParityMissing:
			gapMissing++
		default:
			t.Fatalf("bad gap status %q for %s", row.Status, row.ID)
		}
	}
	var extDone, extStub, extMissing int
	for _, row := range extensionChecklist9 {
		switch row.Status {
		case ParityDone:
			extDone++
		case ParityStub:
			extStub++
		case ParityMissing:
			extMissing++
		default:
			t.Fatalf("bad extension status %q for %q", row.Status, row.Item)
		}
	}
	gapTotal := len(gapMustBlockers)
	extTotal := len(extensionChecklist9)
	gapPctDone := 100.0 * float64(gapDone) / float64(gapTotal)
	extPctDone := 100.0 * float64(extDone) / float64(extTotal)
	// R11/R12 close gap Must and extension §9. R0 only inventories; R12 owns the 100% gate.
	t.Logf("R0 baseline gap Must: total=%d done=%d(%.1f%%) stub=%d missing=%d", gapTotal, gapDone, gapPctDone, gapStub, gapMissing)
	t.Logf("R0 baseline extension §9: total=%d done=%d(%.1f%%) stub=%d missing=%d", extTotal, extDone, extPctDone, extStub, extMissing)
}

func TestDefaultStoreDriverIsPostgresNotMemory(t *testing.T) {
	t.Parallel()
	// Compose and config default to postgres; memory is unit-test only.
	composePath := filepath.Clean(filepath.Join("..", "..", "..", "..", "docker-compose.yml"))
	raw, err := os.ReadFile(composePath)
	if err != nil {
		t.Fatalf("read docker-compose: %v", err)
	}
	text := string(raw)
	if !strings.Contains(text, "STORE_DRIVER: postgres") {
		t.Fatal("docker-compose must default STORE_DRIVER=postgres for core/hub")
	}
	if strings.Contains(text, "STORE_DRIVER: memory") {
		t.Fatal("docker-compose must not default to memory")
	}
	if !strings.Contains(text, "001_core.sql") || !strings.Contains(text, "002_extended.sql") {
		t.Fatal("core migrations 001/002 must be mounted")
	}
	if !strings.Contains(text, "003_seed.sql") {
		t.Fatal("core migration 003_seed.sql must be mounted")
	}
	if !strings.Contains(text, "004_auth_org_r2.sql") {
		t.Fatal("core migration 004_auth_org_r2.sql must be mounted")
	}
	if !strings.Contains(text, "007_r3_contracts.sql") {
		t.Fatal("core migration 007_r3_contracts.sql must be mounted")
	}
	if !strings.Contains(text, "008_r4_docs_parity.sql") {
		t.Fatal("core migration 008_r4_docs_parity.sql must be mounted")
	}
	if !strings.Contains(text, "009_r5_multi_order.sql") {
		t.Fatal("core migration 009_r5_multi_order.sql must be mounted")
	}
	if !strings.Contains(text, "010_r9_extended.sql") {
		t.Fatal("core migration 010_r9_extended.sql must be mounted")
	}
	if !strings.Contains(text, "011_r10_bank.sql") {
		t.Fatal("core migration 011_r10_bank.sql must be mounted")
	}
	if !strings.Contains(text, "012_b2_org_signer.sql") {
		t.Fatal("core migration 012_b2_org_signer.sql must be mounted")
	}
}
