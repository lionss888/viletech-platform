package httpapi_test

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestR9LiquidityVATreasurerAgentHsRoutes(t *testing.T) {
	core, _, _ := newStack(t)
	manager := login(t, core, "manager@vdp.local", "manager")
	provider := login(t, core, "provider@vdp.local", "provider")
	user := login(t, core, "user@vdp.local", "user")

	offer := postJSON(t, core, provider, "/api/v1/liquidity", map[string]string{
		"direction": "import", "amount": "100", "currency": "USD",
	})
	if offer["status"] != "open" {
		t.Fatalf("offer=%v", offer)
	}
	list := getJSONArray(t, core, manager, "/api/v1/liquidity?direction=import")
	if len(list) == 0 {
		t.Fatal("expected liquidity list")
	}

	va := postJSON(t, core, user, "/api/v1/virtual-account", map[string]string{"currency": "USD", "kind": "fiat"})
	vaID, _ := va["id"].(string)
	adj := postJSON(t, core, manager, "/api/v1/virtual-accounts/"+vaID+"/adjust", map[string]string{"delta": "5"})
	if adj["balance"] != "5.00" {
		t.Fatalf("va=%v", adj)
	}

	form := postJSON(t, core, user, "/api/v1/forms", map[string]string{"currency": "USD", "invoice_amount": "10"})
	formID, _ := form["id"].(string)

	tt := postJSON(t, core, manager, "/api/v1/treasurer-task", map[string]string{
		"form_payment_id": formID, "kind": "confirm",
	})
	ttID, _ := tt["id"].(string)
	patched := patchJSON(t, core, manager, "/api/v1/treasurer-tasks/"+ttID, map[string]string{"status": "in_progress"})
	if patched["status"] != "in_progress" {
		t.Fatalf("tt=%v", patched)
	}

	agent := postJSON(t, core, manager, "/api/v1/agent", map[string]string{"name": "Nest Agent", "inn": "1"})
	agentID, _ := agent["id"].(string)
	gotAgent := getJSON(t, core, manager, "/api/v1/agents/"+agentID)
	if gotAgent["name"] != "Nest Agent" {
		t.Fatalf("agent=%v", gotAgent)
	}

	hs := postJSON(t, core, manager, "/api/v1/hs-code", map[string]string{"code": "1234", "description": "test"})
	if hs["code"] != "1234" {
		t.Fatalf("hs=%v", hs)
	}
	postJSON(t, core, user, "/api/v1/forms/"+formID+"/actions/recognize_complete", nil)
	attach := patchJSON(t, core, user, "/api/v1/forms/"+formID+"/hs-codes", map[string]any{"codes": []string{"1234"}})
	_ = attach
	codes := getJSON(t, core, user, "/api/v1/forms/"+formID+"/hs-codes")
	arr, _ := codes["hs_codes"].([]any)
	if len(arr) != 1 {
		t.Fatalf("codes=%v", codes)
	}
}

func TestR9SSEStatusChanged(t *testing.T) {
	core, _, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	form := postJSON(t, core, user, "/api/v1/forms", map[string]string{"currency": "USD", "invoice_amount": "1"})
	formID, _ := form["id"].(string)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/sse/forms/"+formID, nil)
	req.Header.Set("Authorization", "Bearer "+user)
	ctx, cancel := context.WithCancel(req.Context())
	req = req.WithContext(ctx)
	res := httptest.NewRecorder()
	done := make(chan struct{})
	go func() {
		core.ServeHTTP(res, req)
		close(done)
	}()
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		if strings.Contains(res.Body.String(), "event: connected") {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	if !strings.Contains(res.Body.String(), "event: connected") {
		cancel()
		<-done
		t.Fatalf("missing connected: %s", res.Body.String())
	}
	postJSON(t, core, user, "/api/v1/forms/"+formID+"/actions/recognize_complete", nil)
	deadline = time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		if strings.Contains(res.Body.String(), "status_changed") {
			cancel()
			<-done
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	cancel()
	<-done
	t.Fatalf("missing status_changed: %s", res.Body.String())
}

func getJSONArray(t *testing.T, h http.Handler, token, path string) []any {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("GET %s -> %d %s", path, res.Code, res.Body.String())
	}
	var out []any
	if err := json.Unmarshal(res.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	return out
}

func patchJSON(t *testing.T, h http.Handler, token, path string, body any) map[string]any {
	t.Helper()
	raw, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPatch, path, bytes.NewReader(raw))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)
	if res.Code < 200 || res.Code >= 300 {
		t.Fatalf("PATCH %s -> %d %s", path, res.Code, res.Body.String())
	}
	var out map[string]any
	_ = json.NewDecoder(bufio.NewReader(res.Body)).Decode(&out)
	return out
}
