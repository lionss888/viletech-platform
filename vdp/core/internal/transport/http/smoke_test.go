package httpapi_test

import (
	"bytes"
	"encoding/json"
	"io"
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
)

func TestHealthAndCreateDraftICOSmoke(t *testing.T) {
	core, secret, received := newStack(t)
	res := httptest.NewRecorder()
	core.ServeHTTP(res, httptest.NewRequest(http.MethodGet, "/api/v1/health", nil))
	if res.Code != http.StatusOK {
		t.Fatalf("health=%d", res.Code)
	}
	token := login(t, core, "user@vdp.local", "user")
	icoToken := login(t, core, "ico@vdp.local", "ico")
	created := postJSON(t, core, token, "/api/v1/forms", map[string]string{"currency": "USD", "invoice_amount": "100"})
	id, _ := created["id"].(string)
	if id == "" {
		t.Fatalf("create payload=%v", created)
	}
	form := postJSON(t, core, token, "/api/v1/forms/"+id+"/actions/recognize_complete", nil)
	if form["status"] != "draft" {
		t.Fatalf("status=%v", form["status"])
	}
	form = postJSON(t, core, token, "/api/v1/forms/"+id+"/actions/submit", nil)
	if form["status"] != "organization_waiting_verification" {
		t.Fatalf("status=%v", form["status"])
	}
	form = postJSON(t, core, icoToken, "/api/v1/forms/"+id+"/actions/ico_start", nil)
	if form["status"] != "organization_verification" {
		t.Fatalf("status=%v", form["status"])
	}
	flush := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/internal/outbox/flush", nil)
	req.Header.Set("X-VDP-S2S", secret)
	core.ServeHTTP(flush, req)
	if flush.Code != http.StatusOK {
		t.Fatalf("flush=%d body=%s", flush.Code, flush.Body.String())
	}
	if received.count() == 0 {
		t.Fatal("expected hub inbox events")
	}
}

func TestUnauthorizedWithoutJWT(t *testing.T) {
	core, _, _ := newStack(t)
	res := httptest.NewRecorder()
	core.ServeHTTP(res, httptest.NewRequest(http.MethodGet, "/api/v1/forms", nil))
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("code=%d", res.Code)
	}
}

type inboxProbe struct {
	mu    sync.Mutex
	items [][]byte
}

func (p *inboxProbe) count() int {
	p.mu.Lock()
	defer p.mu.Unlock()
	return len(p.items)
}

func newStack(t *testing.T) (http.Handler, string, *inboxProbe) {
	t.Helper()
	secret := "test-s2s"
	probe := &inboxProbe{}
	hub := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-VDP-S2S") != secret {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		body, _ := io.ReadAll(r.Body)
		probe.mu.Lock()
		probe.items = append(probe.items, body)
		probe.mu.Unlock()
		w.WriteHeader(http.StatusAccepted)
		if bytes.Contains(body, []byte(`"docs.generate"`)) || bytes.Contains(body, []byte(`docs.generate`)) {
			_, _ = w.Write([]byte(`{"status":"success","storage_key":"docs/hub/payment_order.pdf","mime":"application/pdf"}`))
			return
		}
		_, _ = w.Write([]byte(`{"status":"accepted","channel":"telegram"}`))
	}))
	t.Cleanup(hub.Close)
	store := repository.NewStore()
	seed.Dev(store)
	box := outbox.NewMemoryStore()
	n := 0
	forms := service.NewFormPaymentService(store, box, func() string {
		n++
		return "f" + itoa(n)
	})
	orgs := service.NewOrganizationService(store)
	catalog := service.NewCatalogService(store, box, func() string {
		n++
		return "c" + itoa(n)
	})
	cfg := &config.Config{JWTSecret: "test-jwt", JWTExpirationHours: 1, HubSharedSecret: secret, HubURL: hub.URL, RateLimitPerMinute: 1000, GatewayTimeoutSec: 2}
	auth := service.NewAuthService(store, cfg.JWTSecret, cfg.JWTExpirationHours)
	accounts := service.NewAccountService(store)
	notify := service.NewNotificationService(store)
	publisher := service.NewHubPublisher(box, hub.URL, secret, 2*time.Second).
		WithDocsHandler(service.NewDocsAttachAdapter(forms))
	return httpapi.NewServer(cfg, auth, accounts, forms, orgs, catalog, publisher, notify).Handler(), secret, probe
}

func login(t *testing.T, h http.Handler, email, password string) string {
	t.Helper()
	body, _ := json.Marshal(map[string]string{"email": email, "password": password})
	res := httptest.NewRecorder()
	h.ServeHTTP(res, httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body)))
	if res.Code != http.StatusOK && res.Code != http.StatusCreated {
		t.Fatalf("login %s: %d %s", email, res.Code, res.Body.String())
	}
	var payload map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &payload)
	token, _ := payload["token"].(string)
	if token == "" {
		t.Fatal("empty token")
	}
	return token
}

func postJSON(t *testing.T, h http.Handler, token, path string, payload map[string]string) map[string]any {
	t.Helper()
	raw := []byte("{}")
	if payload != nil {
		raw, _ = json.Marshal(payload)
	}
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(raw))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)
	if res.Code >= 300 {
		t.Fatalf("%s -> %d %s", path, res.Code, res.Body.String())
	}
	var out map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &out)
	return out
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var digits []byte
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}
	return string(digits)
}
