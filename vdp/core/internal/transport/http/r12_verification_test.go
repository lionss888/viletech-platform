package httpapi_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/repository/seed"
)

// Modules that remain intentionally out of Nest→vdp in-scope matrix for R12
// (fe/analytics/assistant/logistics). Empty = all matrix rows are in-scope.
var matrixOutOfScopeModules = map[string]bool{}

func TestR12MatrixInScopeComplete(t *testing.T) {
	t.Parallel()
	var missing, stub, done int
	var bad []string
	for _, row := range nestEndpointParity {
		if matrixOutOfScopeModules[row.Module] {
			continue
		}
		switch row.Status {
		case ParityDone:
			done++
		case ParityStub:
			stub++
			bad = append(bad, "stub:"+row.Module+" "+row.NestPath)
		case ParityMissing:
			missing++
			bad = append(bad, "missing:"+row.Module+" "+row.NestPath)
		}
	}
	total := done + stub + missing
	pct := 100.0 * float64(done) / float64(total)
	t.Logf("R12 matrix in-scope: total=%d done=%d(%.1f%%) stub=%d missing=%d", total, done, pct, stub, missing)
	if missing != 0 || stub != 0 {
		t.Fatalf("R12 DoD: in-scope matrix must be 100%% done; leftover: %v", bad)
	}
	if pct < 100 {
		t.Fatalf("R12 DoD: want 100%% done got %.1f", pct)
	}
	// R8 integrations explicitly not stub/missing
	for _, mod := range []string{"telegram", "diadoc", "recognition", "payment", "partner", "mail"} {
		for _, row := range nestEndpointParity {
			if row.Module == mod && row.Status != ParityDone {
				t.Fatalf("R8 integration %s still %s", mod, row.Status)
			}
		}
	}
}

func TestR12ExtensionChecklist9Complete(t *testing.T) {
	t.Parallel()
	if len(extensionChecklist9) != 9 {
		t.Fatalf("§9 items=%d want 9", len(extensionChecklist9))
	}
	for _, row := range extensionChecklist9 {
		if row.Status != ParityDone {
			t.Errorf("§9 not done: %s (%s)", row.Item, row.Status)
		}
	}
	// Decision anchors present in domain
	if formpayment.StatusReportAccepted != "report_accepted" {
		t.Fatal("REPORT_ACCEPTED status missing")
	}
	_ = formpayment.StatusCompleted
}

func TestR12ProjectRulesSmoke(t *testing.T) {
	t.Parallel()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("caller")
	}
	repoRoot := filepath.Clean(filepath.Join(filepath.Dir(file), "..", "..", "..", "..", ".."))
	checks := []struct {
		name string
		path string
		need []string
	}{
		{"honesty", ".cursor/rules/честность-готовности.mdc", []string{"alwaysApply: true", "паритет"}},
		{"roles", ".cursor/rules/безопасность-ролей-и-данных.mdc", []string{"Provider", "ПДн"}},
		{"integration", ".cursor/rules/интеграция-и-события.mdc", []string{"идемпотент"}},
		{"boundaries", ".cursor/rules/границы-и-контексты.mdc", []string{"Не шари БД", "контекст"}},
		{"build", ".cursor/rules/правила-построения.mdc", []string{"тест"}},
	}
	for _, c := range checks {
		raw, err := os.ReadFile(filepath.Join(repoRoot, c.path))
		if err != nil {
			t.Fatalf("%s: %v", c.name, err)
		}
		text := string(raw)
		for _, n := range c.need {
			if !strings.Contains(text, n) {
				t.Errorf("%s missing %q", c.name, n)
			}
		}
	}
	// Behavioral: no REPORTER role; provider view has no PII; separate DBs in compose
	if _, ok := domain.ParseRole("reporter"); ok {
		t.Fatal("REPORTER must not exist")
	}
	view := formpayment.ProjectForProvider(formpayment.Form{ID: "x", Status: formpayment.StatusPaymentSent, Currency: "USD"})
	if formpayment.ContainsPII(view) {
		t.Fatal("provider PII leak")
	}
	compose, err := os.ReadFile(filepath.Join(repoRoot, "vdp", "docker-compose.yml"))
	if err != nil {
		t.Fatal(err)
	}
	ct := string(compose)
	if !strings.Contains(ct, "postgres-core") || !strings.Contains(ct, "postgres-hub") {
		t.Fatal("compose must keep separate core/hub databases")
	}
	if strings.Count(ct, "POSTGRES_DB:") < 2 {
		t.Fatal("expected two Postgres DB definitions")
	}
}

func TestR12UserToProviderE2EPath(t *testing.T) {
	core, secret, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	ico := login(t, core, "ico@vdp.local", "ico")
	eco := login(t, core, "eco@vdp.local", "eco")
	manager := login(t, core, "manager@vdp.local", "manager")
	provider := login(t, core, "provider@vdp.local", "provider")

	body := []byte(`{"currency":"USD","invoice_amount":"500","no_documents":true,"contract_number":"E2E-1","contract_date":"2026-08-01"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/site/form-payment", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+user)
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	core.ServeHTTP(res, req)
	if res.Code >= 300 {
		t.Fatalf("create %d %s", res.Code, res.Body.String())
	}
	var form map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &form)
	id, _ := form["id"].(string)

	mustOK(t, core, user, http.MethodPost, "/api/v1/forms/"+id+"/actions/recognize_complete", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/form/accept", nil)
	mustOK(t, core, ico, http.MethodPut, "/api/v1/admin/internal-compliance-officer/organization/"+seed.OrgID+"/approve", nil)
	mustOK(t, core, ico, http.MethodPut, "/api/v1/ico/form-payment/"+id+"/form/start", nil)
	mustOK(t, core, ico, http.MethodPut, "/api/v1/ico/form-payment/"+id+"/form/accept", nil)
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+id+"/form/start", nil)
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+id+"/form/accept", nil)

	// Board order: agent + rate/commission before signing
	agent := postJSON(t, core, manager, "/api/v1/agents", map[string]string{"name": "E2E Agent", "inn": "1"})
	agentID, _ := agent["id"].(string)
	mustOK(t, core, manager, http.MethodPost, "/api/v1/forms/"+id+"/agent", map[string]string{"agent_id": agentID})
	mustOK(t, core, manager, http.MethodPost, "/api/v1/forms/"+id+"/rate", map[string]string{"value": "90", "currency": "USD", "source": "manual"})
	mustOK(t, core, manager, http.MethodPost, "/api/v1/forms/"+id+"/commission", map[string]string{"fee_percent": "1.5", "fee_currency": "USD"})
	mustOK(t, core, manager, http.MethodPost, "/api/v1/forms/"+id+"/provider", map[string]any{"provider_id": seed.ProviderID, "client_agreed": true})

	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/signing", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id+"/order", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/start", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/order/accept", nil)

	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/payment/received", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/payment/start", nil)
	mustOK(t, core, provider, http.MethodPut, "/api/v1/provider/form-payment/"+id+"/payment/sent", nil)

	provView := getJSON(t, core, provider, "/api/v1/provider/forms/"+id)
	raw, _ := json.Marshal(provView)
	for _, key := range []string{"passport", "phone", "full_name", "email"} {
		if strings.Contains(strings.ToLower(string(raw)), `"`+key+`"`) {
			t.Fatalf("provider view PII %s: %s", key, raw)
		}
	}

	// REPORT_ACCEPTED path: signing → accept (upload/verify optional; Nest allows payment_sent→report_accepted)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/report/signing", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/report/accept", nil)
	got := getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
	if got["status"] != "report_accepted" {
		t.Fatalf("after report accept status=%v", got["status"])
	}
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id+"/completed", nil)
	got = getJSON(t, core, manager, "/api/v1/manager/form-payment/"+id)
	if got["status"] != "completed" {
		t.Fatalf("final status=%v want completed", got["status"])
	}

	// Refund branch smoke on a second form that holds funds
	body2 := []byte(`{"currency":"EUR","invoice_amount":"100","no_documents":true}`)
	req2 := httptest.NewRequest(http.MethodPost, "/api/v1/site/form-payment", bytes.NewReader(body2))
	req2.Header.Set("Authorization", "Bearer "+user)
	req2.Header.Set("Content-Type", "application/json")
	res2 := httptest.NewRecorder()
	core.ServeHTTP(res2, req2)
	var form2 map[string]any
	_ = json.Unmarshal(res2.Body.Bytes(), &form2)
	id2, _ := form2["id"].(string)
	mustOK(t, core, user, http.MethodPost, "/api/v1/forms/"+id2+"/actions/recognize_complete", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id2+"/form/accept", nil)
	// Org already approved on first form → submit lands in form_waiting_verification (ECO).
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+id2+"/form/start", nil)
	mustOK(t, core, eco, http.MethodPut, "/api/v1/eco/form-payment/"+id2+"/form/accept", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id2+"/order/signing", nil)
	mustOK(t, core, user, http.MethodPut, "/api/v1/site/form-payment/"+id2+"/order", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id2+"/order/start", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id2+"/order/accept", nil)
	mustOK(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id2+"/payment/received", nil)
	mustOK(t, core, manager, http.MethodPost, "/api/v1/manager/form-payment/"+id2+"/refund/init", map[string]any{
		"amount": "100", "currency": "EUR", "comment": "e2e refund smoke",
	})
	mustStatus(t, core, manager, http.MethodPut, "/api/v1/manager/form-payment/"+id2+"/cancel", nil, http.StatusConflict)

	flush := httptest.NewRecorder()
	freq := httptest.NewRequest(http.MethodPost, "/api/v1/internal/outbox/flush", nil)
	freq.Header.Set("X-VDP-S2S", secret)
	core.ServeHTTP(flush, freq)
	if flush.Code != 200 {
		t.Fatalf("flush %d", flush.Code)
	}
}
