package httpapi_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
	httpapi "github.com/viletech/vdp/core/internal/transport/http"
	"github.com/viletech/vdp/core/pkg/config"
)

func TestProcessRolesHTTP(t *testing.T) {
	store := repository.NewMemoryStore()
	_ = seed.Dev(store)
	box := outbox.NewMemoryStore()
	forms := service.NewFormPaymentService(store, box, func() string { return "f1" })
	cfg := &config.Config{JWTSecret: "test-secret-at-least-32-chars-long!!", JWTExpirationHours: 24}
	auth := service.NewAuthService(store, cfg.JWTSecret, cfg.JWTExpirationHours)
	accounts := service.NewAccountService(store)
	orgs := service.NewOrganizationService(store)
	catalog := service.NewCatalogService(store, box, func() string { return "c1" })
	h := httpapi.NewServer(cfg, auth, accounts, forms, orgs, catalog, nil, service.NewNotificationService(store)).Handler()

	login := func(email, password string) string {
		body, _ := json.Marshal(map[string]string{"email": email, "password": password})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK && rec.Code != http.StatusCreated {
			t.Fatalf("login %s: %d %s", email, rec.Code, rec.Body.String())
		}
		var out map[string]any
		_ = json.Unmarshal(rec.Body.Bytes(), &out)
		tok, _ := out["token"].(string)
		if tok == "" {
			tok, _ = out["access_token"].(string)
		}
		if tok == "" {
			t.Fatalf("no token in login response: %s", rec.Body.String())
		}
		return tok
	}
	rootTok := login("root@vdp.local", "root")
	userTok := login("user@vdp.local", "user")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/process-roles", nil)
	req.Header.Set("Authorization", "Bearer "+userTok)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("GET process-roles: %d %s", rec.Code, rec.Body.String())
	}

	body, _ := json.Marshal(map[string]any{"enabled": false})
	req = httptest.NewRequest(http.MethodPut, "/api/v1/admin/process-roles/internal_compliance_officer", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+rootTok)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code == http.StatusOK {
		t.Fatal("expected reject disable ICO")
	}

	body, _ = json.Marshal(map[string]any{"enabled": true, "influence": "observer", "capabilities": []string{"form.view", "sales.attribution"}})
	req = httptest.NewRequest(http.MethodPut, "/api/v1/admin/process-roles/sales", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+rootTok)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("enable sales: %d %s", rec.Code, rec.Body.String())
	}

	body, _ = json.Marshal(map[string]any{"order": []string{"sales", "manager", "user"}})
	req = httptest.NewRequest(http.MethodPut, "/api/v1/admin/process-roles/priorities", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+rootTok)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("priorities: %d %s", rec.Code, rec.Body.String())
	}
}
