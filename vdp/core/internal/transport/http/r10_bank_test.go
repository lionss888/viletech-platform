package httpapi_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
	httpapi "github.com/viletech/vdp/core/internal/transport/http"
	"github.com/viletech/vdp/core/pkg/config"
	"github.com/viletech/vdp/shared/events"
)

func TestR10BankAPIIdempotentCreateWebhookAndRBAC(t *testing.T) {
	var hooks []map[string]any
	var mu sync.Mutex
	wh := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		mu.Lock()
		hooks = append(hooks, body)
		mu.Unlock()
		w.WriteHeader(http.StatusAccepted)
	}))
	t.Cleanup(wh.Close)

	core, secret, box := newBankStack(t, wh.URL)
	manager := login(t, core, "manager@vdp.local", "manager")
	bank := login(t, core, "bank@vdp.local", "bank")
	user := login(t, core, "user@vdp.local", "user")

	settings := putJSON(t, core, manager, "/api/v1/admin/organizations/"+seed.BankOrgID+"/bank-settings", map[string]any{
		"client_type": "bank", "bank_fixed_commission_percent": "1.5",
		"apply_platform_markup": false, "bank_webhook_url": wh.URL, "bank_webhook_secret": "hook-secret",
	})
	if settings["client_type"] != "bank" {
		t.Fatalf("settings=%v", settings)
	}

	raw, _ := json.Marshal(map[string]string{
		"organization_id": seed.BankOrgID, "amount": "200", "currency": "USD",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/bank/forms", bytes.NewReader(raw))
	req.Header.Set("Authorization", "Bearer "+bank)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "http-idem-1")
	res := httptest.NewRecorder()
	core.ServeHTTP(res, req)
	if res.Code != http.StatusCreated {
		t.Fatalf("create %d %s", res.Code, res.Body.String())
	}
	var first map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &first)
	id, _ := first["id"].(string)

	req2 := httptest.NewRequest(http.MethodPost, "/api/v1/bank/forms", bytes.NewReader(raw))
	req2.Header.Set("Authorization", "Bearer "+bank)
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("Idempotency-Key", "http-idem-1")
	res2 := httptest.NewRecorder()
	core.ServeHTTP(res2, req2)
	if res2.Code != http.StatusOK || res2.Header().Get("X-Idempotent-Replayed") != "true" {
		t.Fatalf("replay %d replayed=%s body=%s", res2.Code, res2.Header().Get("X-Idempotent-Replayed"), res2.Body.String())
	}

	got := getJSON(t, core, bank, "/api/v1/bank/forms/"+id)
	if got["channel"] != "bank" || got["correlation_id"] == "" {
		t.Fatalf("get=%v", got)
	}

	// user cannot use bank API
	bad := httptest.NewRecorder()
	breq := httptest.NewRequest(http.MethodGet, "/api/v1/bank/forms", nil)
	breq.Header.Set("Authorization", "Bearer "+user)
	core.ServeHTTP(bad, breq)
	if bad.Code != http.StatusForbidden && bad.Code != http.StatusUnauthorized {
		t.Fatalf("user bank list code=%d", bad.Code)
	}

	flush := httptest.NewRecorder()
	freq := httptest.NewRequest(http.MethodPost, "/api/v1/internal/outbox/flush", nil)
	freq.Header.Set("X-VDP-S2S", secret)
	core.ServeHTTP(flush, freq)
	if flush.Code != http.StatusOK {
		t.Fatalf("flush=%d", flush.Code)
	}
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		mu.Lock()
		n := len(hooks)
		mu.Unlock()
		if n > 0 {
			break
		}
		time.Sleep(20 * time.Millisecond)
		core.ServeHTTP(httptest.NewRecorder(), freq)
	}
	mu.Lock()
	defer mu.Unlock()
	if len(hooks) == 0 {
		pending, _ := box.Pending(t.Context(), 20)
		t.Fatalf("expected webhook, pending=%d", countBankWebhooks(pending))
	}
	if hooks[0]["event"] != "status_changed" {
		t.Fatalf("hook=%v", hooks[0])
	}
}

func newBankStack(t *testing.T, webhookURL string) (http.Handler, string, outbox.Store) {
	t.Helper()
	secret := "test-s2s"
	hub := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusAccepted)
		_, _ = w.Write([]byte(`{"status":"accepted"}`))
	}))
	t.Cleanup(hub.Close)
	store := repository.NewStore()
	seed.Dev(store)
	org, _ := store.OrganizationByID(t.Context(), seed.BankOrgID)
	org.BankWebhookURL = webhookURL
	org.BankWebhookSecret = "hook-secret"
	_ = store.SaveOrganization(t.Context(), org)
	box := outbox.NewMemoryStore()
	n := 0
	forms := service.NewFormPaymentService(store, box, func() string {
		n++
		return "bf" + itoa(n)
	})
	orgs := service.NewOrganizationService(store)
	catalog := service.NewCatalogService(store, box, func() string {
		n++
		return "bc" + itoa(n)
	})
	cfg := &config.Config{JWTSecret: "test-jwt", JWTExpirationHours: 1, HubSharedSecret: secret, HubURL: hub.URL, RateLimitPerMinute: 1000, GatewayTimeoutSec: 2}
	auth := service.NewAuthService(store, cfg.JWTSecret, cfg.JWTExpirationHours)
	accounts := service.NewAccountService(store)
	publisher := service.NewHubPublisher(box, hub.URL, secret, 2*time.Second)
	return httpapi.NewServer(cfg, auth, accounts, forms, orgs, catalog, publisher).Handler(), secret, box
}

func putJSON(t *testing.T, h http.Handler, token, path string, body any) map[string]any {
	t.Helper()
	raw, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPut, path, bytes.NewReader(raw))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)
	if res.Code >= 300 {
		t.Fatalf("PUT %s -> %d %s", path, res.Code, res.Body.String())
	}
	var out map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &out)
	return out
}

func countBankWebhooks(items []outbox.Event) int {
	n := 0
	for _, e := range items {
		if e.EventType == events.TypeBankWebhook {
			n++
		}
	}
	return n
}
