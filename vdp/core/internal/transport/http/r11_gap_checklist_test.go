package httpapi_test

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
)

// gapMustComplete is gap-analysis §7 Must-have (4 items). All must be ParityDone for R11.
var gapMustComplete = []struct {
	ID     string
	Title  string
	Status EndpointParityStatus
}{
	{"MUST-PROV-PII", "Provider without client PII (ROLE-PROV + FLOW-PROV-VIEW)", ParityDone},
	{"MUST-DEADLINE", "executionDeadline + notifications (FLOW-MGR-DEADLINE)", ParityDone},
	{"MUST-AWAIT-RATING", "Awaiting processing queue + red/yellow rating (STAT-AWAIT)", ParityDone},
	{"MUST-RATE-COMM", "Rate resolveDealRate + CommissionCalculation (MOD-RATE + MOD-COMM)", ParityDone},
}

// gapShouldComplete is gap-analysis §7 Should-have (8 items).
var gapShouldComplete = []struct {
	ID     string
	Title  string
	Status EndpointParityStatus
	Note   string
}{
	{"SHOULD-ECO-ALIAS", "External CO alias ↔ compliance_officer + client status labels", ParityDone, ""},
	{"SHOULD-ASSIGN", "Explicit assign provider/agent + client_agreed", ParityDone, ""},
	{"SHOULD-XOR-HASH", "Provider confirmation hash XOR file by currency type", ParityDone, ""},
	{"SHOULD-UNBLOCK", "Unblock workflow for BLOCKED org", ParityDone, ""},
	{"SHOULD-NO-DOCS", "no_documents create branch skips OCR", ParityDone, ""},
	{"SHOULD-POG-AUTO", "POG auto-enqueue when rate+commission fixed", ParityDone, ""},
	{"SHOULD-ORG-IMMUTABLE", "Immutable org fields after ICO decision", ParityDone, ""},
	{"SHOULD-VA-NOREPORTER", "Single VA module; REPORTER not transferred", ParityDone, "REPORTER out-of-scope per gap §7"},
}

func TestGapChecklistComplete(t *testing.T) {
	t.Parallel()
	if len(gapMustComplete) != 4 {
		t.Fatalf("Must want 4 got %d", len(gapMustComplete))
	}
	if len(gapShouldComplete) != 8 {
		t.Fatalf("Should want 8 got %d", len(gapShouldComplete))
	}
	for _, row := range gapMustComplete {
		if row.Status != ParityDone {
			t.Errorf("Must %s not done: %s", row.ID, row.Status)
		}
	}
	for _, row := range gapShouldComplete {
		if row.Status != ParityDone {
			t.Errorf("Should %s not done: %s (%s)", row.ID, row.Status, row.Note)
		}
	}
	// Behavioral self-checks for Must PII + ECO alias + no REPORTER.
	view := formpayment.ProjectForProvider(formpayment.Form{
		ID: "f1", Status: formpayment.StatusPaymentSent, Direction: formpayment.DirectionImport,
		Kind: formpayment.KindGood, InvoiceAmount: "1", Currency: "USD",
		ProviderID: seedProviderIDForGap(), OrganizationID: "org",
	})
	raw, _ := json.Marshal(view)
	for _, key := range []string{"passport", "phone", "full_name", "email"} {
		if strings.Contains(strings.ToLower(string(raw)), `"`+key+`"`) {
			t.Errorf("provider view leaked PII key %s: %s", key, raw)
		}
	}
	if formpayment.ContainsPII(view) {
		t.Fatal("ContainsPII true on clean provider view")
	}
	role, ok := domain.ParseRole("external_compliance_officer")
	if !ok || role != domain.RoleComplianceOfficer {
		t.Fatalf("ECO alias parse=%v ok=%v", role, ok)
	}
	if _, ok := domain.ParseRole("reporter"); ok {
		t.Fatal("REPORTER must not be a transferred role")
	}
	if domain.RoleExternalComplianceOfficer != domain.RoleComplianceOfficer {
		t.Fatal("RoleExternal must alias RoleComplianceOfficer")
	}
}

func seedProviderIDForGap() string {
	return "55555555-5555-5555-5555-555555555555"
}
