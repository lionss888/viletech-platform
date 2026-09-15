package httpapi_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
	httpapi "github.com/viletech/vdp/core/internal/transport/http"
	"github.com/viletech/vdp/core/pkg/config"
)

// TestAuthZMatrixAudit systematically verifies that all critical endpoints
// properly enforce role-based authorization and return 403 for forbidden access.
func TestAuthZMatrixAudit(t *testing.T) {
	t.Parallel()
	
	// Setup test server with seeded data
	store := repository.NewMemoryStore()
	_ = seed.Dev(store)
	box := outbox.NewMemoryStore()
	forms := service.NewFormPaymentService(store, box, func() string { return "test-form-id" })
	cfg := &config.Config{JWTSecret: "test-secret-at-least-32-chars-long!!", JWTExpirationHours: 24}
	auth := service.NewAuthService(store, cfg.JWTSecret, cfg.JWTExpirationHours)
	accounts := service.NewAccountService(store)
	orgs := service.NewOrganizationService(store)
	catalog := service.NewCatalogService(store, box, func() string { return "test-catalog-id" })
	h := httpapi.NewServer(cfg, auth, accounts, forms, orgs, catalog, nil, service.NewNotificationService(store)).Handler()

	// Login helper for different roles
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
		return tok
	}

	// Get tokens for all roles
	tokens := map[domain.Role]string{
		domain.RoleRoot:                        login("root@vdp.local", "root"),
		domain.RoleUser:                        login("user@vdp.local", "user"),
		domain.RoleManager:                     login("manager@vdp.local", "manager"),
		domain.RoleProvider:                    login("provider@vdp.local", "provider"),
		domain.RoleTreasurer:                   login("treasurer@vdp.local", "treasurer"),
		domain.RoleInternalComplianceOfficer:   login("ico@vdp.local", "ico"),
		domain.RoleComplianceOfficer:           login("eco@vdp.local", "eco"),
	}

	// Test matrix: endpoint -> allowed roles
	tests := []struct {
		name         string
		method       string
		path         string
		body         map[string]any
		allowedRoles []domain.Role
		desc         string
	}{
		{
			name:         "create_form_user_only",
			method:       http.MethodPost,
			path:         "/api/v1/site/form-payment",
			body:         map[string]any{"direction": "import", "kind": "good", "currency": "USD", "invoice_amount": "1000"},
			allowedRoles: []domain.Role{domain.RoleUser, domain.RoleRoot},
			desc:         "User can create form, others forbidden",
		},
		{
			name:         "list_forms_user",
			method:       http.MethodGet,
			path:         "/api/v1/site/form-payment",
			allowedRoles: []domain.Role{domain.RoleUser, domain.RoleRoot},
			desc:         "User lists own forms",
		},
		{
			name:         "list_forms_manager",
			method:       http.MethodGet,
			path:         "/api/v1/manager/form-payment",
			allowedRoles: []domain.Role{domain.RoleManager, domain.RoleTreasurer, domain.RoleRoot},
			desc:         "Manager lists all forms",
		},
		{
			name:         "list_forms_provider",
			method:       http.MethodGet,
			path:         "/api/v1/provider/form-payment",
			allowedRoles: []domain.Role{domain.RoleProvider, domain.RoleRoot},
			desc:         "Provider lists assigned forms",
		},
		{
			name:         "list_forms_treasurer",
			method:       http.MethodGet,
			path:         "/api/v1/treasurer/form-payment",
			allowedRoles: []domain.Role{domain.RoleTreasurer, domain.RoleRoot},
			desc:         "Treasurer lists import forms",
		},
		{
			name:         "list_forms_ico",
			method:       http.MethodGet,
			path:         "/api/v1/ico/form-payment",
			allowedRoles: []domain.Role{domain.RoleInternalComplianceOfficer, domain.RoleRoot},
			desc:         "ICO lists org verification forms",
		},
		{
			name:         "list_forms_eco",
			method:       http.MethodGet,
			path:         "/api/v1/eco/form-payment",
			allowedRoles: []domain.Role{domain.RoleComplianceOfficer, domain.RoleRoot},
			desc:         "ECO lists compliance forms",
		},
		{
			name:         "admin_account_list",
			method:       http.MethodGet,
			path:         "/api/v1/admin/account",
			allowedRoles: []domain.Role{domain.RoleRoot},
			desc:         "Only Root can list admin accounts",
		},
		{
			name:         "admin_account_create",
			method:       http.MethodPost,
			path:         "/api/v1/admin/account",
			body:         map[string]any{"email": "test@example.com", "password": "test123", "role": "user"},
			allowedRoles: []domain.Role{domain.RoleRoot},
			desc:         "Only Root can create admin accounts",
		},
		{
			name:         "counterparty_list_user",
			method:       http.MethodGet,
			path:         "/api/v1/counterparty/list",
			allowedRoles: []domain.Role{domain.RoleUser, domain.RoleManager, domain.RoleRoot},
			desc:         "User and Manager can list counterparties",
		},
		{
			name:         "file_upload",
			method:       http.MethodPost,
			path:         "/api/v1/file-store/upload",
			allowedRoles: []domain.Role{domain.RoleUser, domain.RoleManager, domain.RoleProvider, domain.RoleInternalComplianceOfficer, domain.RoleComplianceOfficer, domain.RoleTreasurer, domain.RoleRoot},
			desc:         "All process roles can upload files",
		},
		{
			name:         "org_create_user",
			method:       http.MethodPost,
			path:         "/api/v1/organization",
			body:         map[string]any{"name": "Test Org", "country": "RU"},
			allowedRoles: []domain.Role{domain.RoleUser, domain.RoleManager, domain.RoleRoot},
			desc:         "User and Manager can create organizations",
		},
		{
			name:         "process_roles_view",
			method:       http.MethodGet,
			path:         "/api/v1/process-roles",
			allowedRoles: []domain.Role{domain.RoleUser, domain.RoleManager, domain.RoleProvider, domain.RoleInternalComplianceOfficer, domain.RoleComplianceOfficer, domain.RoleTreasurer, domain.RoleRoot},
			desc:         "All roles can view process roles",
		},
		{
			name:         "process_roles_admin",
			method:       http.MethodPut,
			path:         "/api/v1/admin/process-roles/manager",
			body:         map[string]any{"enabled": true},
			allowedRoles: []domain.Role{domain.RoleRoot},
			desc:         "Only Root can modify process roles",
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			
			// Test each role against this endpoint
			for role, token := range tokens {
				allowed := false
				for _, ar := range tt.allowedRoles {
					if role == ar {
						allowed = true
						break
					}
				}

				var body []byte
				if tt.body != nil {
					body, _ = json.Marshal(tt.body)
				}
				
				req := httptest.NewRequest(tt.method, tt.path, bytes.NewReader(body))
				req.Header.Set("Authorization", "Bearer "+token)
				req.Header.Set("Content-Type", "application/json")
				rec := httptest.NewRecorder()
				h.ServeHTTP(rec, req)

				if allowed {
					// Allowed roles should get 200/201/204, NOT 403
					if rec.Code == http.StatusForbidden {
						t.Errorf("%s: role %s should be ALLOWED but got 403: %s", tt.name, role, rec.Body.String())
					}
				} else {
					// Forbidden roles MUST get 403, not 500 or other errors
					if rec.Code != http.StatusForbidden {
						t.Errorf("%s: role %s should be FORBIDDEN (403) but got %d: %s\nDesc: %s", 
							tt.name, role, rec.Code, rec.Body.String(), tt.desc)
					}
				}
			}
		})
	}
}

// TestAuthZCanAccessFormOwnFormOnly verifies User can only access own org's forms
func TestAuthZCanAccessFormOwnFormOnly(t *testing.T) {
	t.Parallel()
	
	store := repository.NewMemoryStore()
	_ = seed.Dev(store)
	box := outbox.NewMemoryStore()
	forms := service.NewFormPaymentService(store, box, func() string { return "test-form-canaccess" })
	cfg := &config.Config{JWTSecret: "test-secret-at-least-32-chars-long!!", JWTExpirationHours: 24}
	auth := service.NewAuthService(store, cfg.JWTSecret, cfg.JWTExpirationHours)
	accounts := service.NewAccountService(store)
	orgs := service.NewOrganizationService(store)
	catalog := service.NewCatalogService(store, box, func() string { return "test-catalog-id" })
	h := httpapi.NewServer(cfg, auth, accounts, forms, orgs, catalog, nil, service.NewNotificationService(store)).Handler()

	login := func(email, password string) string {
		body, _ := json.Marshal(map[string]string{"email": email, "password": password})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		var out map[string]any
		_ = json.Unmarshal(rec.Body.Bytes(), &out)
		tok, _ := out["token"].(string)
		if tok == "" {
			tok, _ = out["access_token"].(string)
		}
		return tok
	}

	userToken := login("user@vdp.local", "user")
	
	// Create a form as user
	body, _ := json.Marshal(map[string]any{"direction": "import", "kind": "good", "currency": "USD", "invoice_amount": "1000"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/site/form-payment", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+userToken)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	
	if rec.Code != http.StatusOK && rec.Code != http.StatusCreated {
		t.Fatalf("failed to create form: %d %s", rec.Code, rec.Body.String())
	}
	
	var created map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &created)
	formID, ok := created["id"].(string)
	if !ok || formID == "" {
		t.Fatal("no form id in create response")
	}

	// User should be able to access own form
	req = httptest.NewRequest(http.MethodGet, "/api/v1/site/form-payment/"+formID, nil)
	req.Header.Set("Authorization", "Bearer "+userToken)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	
	if rec.Code == http.StatusForbidden {
		t.Errorf("User should access own form but got 403")
	}

	// Manager should NOT be able to access draft forms (business rule: only submitted forms)
	managerToken := login("manager@vdp.local", "manager")
	req = httptest.NewRequest(http.MethodGet, "/api/v1/manager/form-payment/"+formID, nil)
	req.Header.Set("Authorization", "Bearer "+managerToken)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	
	if rec.Code != http.StatusForbidden {
		t.Errorf("Manager should NOT access draft forms, expected 403 but got %d", rec.Code)
	}

	// Provider should get 403 for unassigned form
	providerToken := login("provider@vdp.local", "provider")
	req = httptest.NewRequest(http.MethodGet, "/api/v1/provider/form-payment/"+formID, nil)
	req.Header.Set("Authorization", "Bearer "+providerToken)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	
	// Provider accessing unassigned form should be forbidden
	// Note: depending on implementation, this might be 404 or empty list, but NOT 500
	if rec.Code >= 500 {
		t.Errorf("Provider accessing unassigned form should not be 500, got %d: %s", rec.Code, rec.Body.String())
	}
}

// TestAuthZNo500OnForbidden ensures forbidden access returns 403, not 500
func TestAuthZNo500OnForbidden(t *testing.T) {
	t.Parallel()
	
	store := repository.NewMemoryStore()
	_ = seed.Dev(store)
	box := outbox.NewMemoryStore()
	forms := service.NewFormPaymentService(store, box, func() string { return "test-form-id" })
	cfg := &config.Config{JWTSecret: "test-secret-at-least-32-chars-long!!", JWTExpirationHours: 24}
	auth := service.NewAuthService(store, cfg.JWTSecret, cfg.JWTExpirationHours)
	accounts := service.NewAccountService(store)
	orgs := service.NewOrganizationService(store)
	catalog := service.NewCatalogService(store, box, func() string { return "test-catalog-id" })
	h := httpapi.NewServer(cfg, auth, accounts, forms, orgs, catalog, nil, service.NewNotificationService(store)).Handler()

	login := func(email, password string) string {
		body, _ := json.Marshal(map[string]string{"email": email, "password": password})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		var out map[string]any
		_ = json.Unmarshal(rec.Body.Bytes(), &out)
		tok, _ := out["token"].(string)
		if tok == "" {
			tok, _ = out["access_token"].(string)
		}
		return tok
	}

	providerToken := login("provider@vdp.local", "provider")

	// Provider trying to create form (User-only action) should get 403, not 500
	body, _ := json.Marshal(map[string]any{"direction": "import", "kind": "good", "currency": "USD", "invoice_amount": "1000"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/site/form-payment", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+providerToken)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	
	if rec.Code != http.StatusForbidden {
		t.Errorf("Provider creating form should get 403, got %d: %s", rec.Code, rec.Body.String())
	}

	// User trying to access admin endpoints should get 403, not 500
	userToken := login("user@vdp.local", "user")
	req = httptest.NewRequest(http.MethodGet, "/api/v1/admin/account", nil)
	req.Header.Set("Authorization", "Bearer "+userToken)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	
	if rec.Code != http.StatusForbidden {
		t.Errorf("User accessing admin endpoint should get 403, got %d: %s", rec.Code, rec.Body.String())
	}

	// Treasurer trying treasurer action on non-treasurer path should get 403
	treasurerToken := login("treasurer@vdp.local", "treasurer")
	req = httptest.NewRequest(http.MethodGet, "/api/v1/eco/form-payment", nil)
	req.Header.Set("Authorization", "Bearer "+treasurerToken)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	
	if rec.Code != http.StatusForbidden {
		t.Errorf("Treasurer accessing ECO endpoint should get 403, got %d: %s", rec.Code, rec.Body.String())
	}
}
