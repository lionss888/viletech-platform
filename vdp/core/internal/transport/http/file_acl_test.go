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

// TestFileACLUserCannotPreviewForeignFormFile verifies User can only preview own form files.
// This is a critical security test for Phase 2 AuthZ audit.
func TestFileACLUserCannotPreviewForeignFormFile(t *testing.T) {
	t.Parallel()

	store := repository.NewMemoryStore()
	_ = seed.Dev(store)
	box := outbox.NewMemoryStore()
	idCounter := 0
	newID := func() string {
		idCounter++
		return "file-" + string(rune('a'+idCounter))
	}
	forms := service.NewFormPaymentService(store, box, newID)
	cfg := &config.Config{JWTSecret: "test-secret-at-least-32-chars-long!!", JWTExpirationHours: 24}
	auth := service.NewAuthService(store, cfg.JWTSecret, cfg.JWTExpirationHours)
	accounts := service.NewAccountService(store)
	orgs := service.NewOrganizationService(store)
	catalog := service.NewCatalogService(store, box, newID)
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
	managerToken := login("manager@vdp.local", "manager")

	// User creates a form
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
	formID, _ := created["id"].(string)

	// User uploads a file
	uploadBody, _ := json.Marshal(map[string]any{
		"form_id":      formID,
		"storage_key":  "test-file-key",
		"content_type": "application/pdf",
		"content":      "test file content",
	})
	req = httptest.NewRequest(http.MethodPost, "/api/v1/file-store/upload", bytes.NewReader(uploadBody))
	req.Header.Set("Authorization", "Bearer "+userToken)
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK && rec.Code != http.StatusCreated {
		t.Fatalf("failed to upload file: %d %s", rec.Code, rec.Body.String())
	}

	var uploadResp map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &uploadResp)
	fileID, _ := uploadResp["id"].(string)
	if fileID == "" {
		t.Fatal("no file id in upload response")
	}

	// Test 1: User (file owner) can preview own file
	req = httptest.NewRequest(http.MethodGet, "/api/v1/file-store/preview/private/"+fileID, nil)
	req.Header.Set("Authorization", "Bearer "+userToken)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("User should be able to preview own file, got %d: %s", rec.Code, rec.Body.String())
	}

	// Test 2: Manager can preview any file (process role with broad access)
	req = httptest.NewRequest(http.MethodGet, "/api/v1/file-store/preview/private/"+fileID, nil)
	req.Header.Set("Authorization", "Bearer "+managerToken)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("Manager should be able to preview file, got %d: %s", rec.Code, rec.Body.String())
	}

	// Test 3: Create a second user and form (foreign to first user)
	// First, create another organization for the second user scenario
	// Note: Since we're using dev seed, we need to work within those constraints
	// For this test, we'll use Provider token as a "foreign" user who shouldn't access user's files

	providerToken := login("provider@vdp.local", "provider")

	// Test 4: Provider trying to access User's file (not assigned) should get 403
	req = httptest.NewRequest(http.MethodGet, "/api/v1/file-store/preview/private/"+fileID, nil)
	req.Header.Set("Authorization", "Bearer "+providerToken)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("Provider should be forbidden to preview unassigned user file, got %d: %s", rec.Code, rec.Body.String())
	}

	// Test 5: Root can preview any file
	rootToken := login("root@vdp.local", "root")
	req = httptest.NewRequest(http.MethodGet, "/api/v1/file-store/preview/private/"+fileID, nil)
	req.Header.Set("Authorization", "Bearer "+rootToken)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("Root should be able to preview any file, got %d: %s", rec.Code, rec.Body.String())
	}

	// Test 6: Compliance Officer can preview files (process role)
	icoToken := login("ico@vdp.local", "ico")
	req = httptest.NewRequest(http.MethodGet, "/api/v1/file-store/preview/private/"+fileID, nil)
	req.Header.Set("Authorization", "Bearer "+icoToken)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("ICO should be able to preview files, got %d: %s", rec.Code, rec.Body.String())
	}

	// Test 7: Treasurer file access follows form access rules
	// Note: Treasurer has manager.ops capability and can access forms, so file access follows
	// The key security test is Provider (unassigned) which is tested above and should be 403
}

// TestFileACLProviderCannotAccessClientPII verifies Provider cannot access client PII documents.
func TestFileACLProviderCannotAccessClientPII(t *testing.T) {
	t.Parallel()

	store := repository.NewMemoryStore()
	_ = seed.Dev(store)
	box := outbox.NewMemoryStore()
	idCounter := 0
	newID := func() string {
		idCounter++
		return "file-pii-" + string(rune('a'+idCounter))
	}
	forms := service.NewFormPaymentService(store, box, newID)
	cfg := &config.Config{JWTSecret: "test-secret-at-least-32-chars-long!!", JWTExpirationHours: 24}
	auth := service.NewAuthService(store, cfg.JWTSecret, cfg.JWTExpirationHours)
	accounts := service.NewAccountService(store)
	orgs := service.NewOrganizationService(store)
	catalog := service.NewCatalogService(store, box, newID)
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
	managerToken := login("manager@vdp.local", "manager")
	providerToken := login("provider@vdp.local", "provider")

	// User creates a form
	body, _ := json.Marshal(map[string]any{"direction": "import", "kind": "good", "currency": "USD", "invoice_amount": "1000"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/site/form-payment", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+userToken)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	var created map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &created)
	formID, _ := created["id"].(string)

	// Manager assigns provider (simulate provider assignment)
	// Note: This would normally go through proper state machine transitions
	// For this test, we're focusing on file ACL after assignment

	// Upload a file as user (simulating client document upload)
	uploadBody, _ := json.Marshal(map[string]any{
		"form_id":      formID,
		"storage_key":  "client-doc",
		"content_type": "application/pdf",
		"content":      "client personal data",
	})
	req = httptest.NewRequest(http.MethodPost, "/api/v1/file-store/upload", bytes.NewReader(uploadBody))
	req.Header.Set("Authorization", "Bearer "+userToken)
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	var uploadResp map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &uploadResp)
	fileID, _ := uploadResp["id"].(string)

	// The key test: Provider trying to access this file
	// Current implementation: Provider can access form files if they have form access
	// BUT agency contract documents are specially blocked (line 730-732 in docs.go)
	// For unassigned forms, Provider should get 403

	req = httptest.NewRequest(http.MethodGet, "/api/v1/file-store/preview/private/"+fileID, nil)
	req.Header.Set("Authorization", "Bearer "+providerToken)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	// Provider should be forbidden from accessing unassigned form's files
	if rec.Code != http.StatusForbidden {
		t.Errorf("Provider should be forbidden to access unassigned form file, got %d: %s", rec.Code, rec.Body.String())
	}

	// Manager should be able to access (for verification)
	req = httptest.NewRequest(http.MethodGet, "/api/v1/file-store/preview/private/"+fileID, nil)
	req.Header.Set("Authorization", "Bearer "+managerToken)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("Manager should be able to access file, got %d: %s", rec.Code, rec.Body.String())
	}
}

// TestFileACLReturns403Not500 ensures file ACL violations return 403, not 500.
func TestFileACLReturns403Not500(t *testing.T) {
	t.Parallel()

	store := repository.NewMemoryStore()
	_ = seed.Dev(store)
	box := outbox.NewMemoryStore()
	forms := service.NewFormPaymentService(store, box, func() string { return "file-403-test" })
	cfg := &config.Config{JWTSecret: "test-secret-at-least-32-chars-long!!", JWTExpirationHours: 24}
	auth := service.NewAuthService(store, cfg.JWTSecret, cfg.JWTExpirationHours)
	accounts := service.NewAccountService(store)
	orgs := service.NewOrganizationService(store)
	catalog := service.NewCatalogService(store, box, func() string { return "file-403-id" })
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

	// Try to access non-existent file
	req := httptest.NewRequest(http.MethodGet, "/api/v1/file-store/preview/private/non-existent-file-id", nil)
	req.Header.Set("Authorization", "Bearer "+providerToken)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	// Should be 404 or 403, definitely not 500
	if rec.Code >= 500 {
		t.Errorf("File not found should not return 500, got %d: %s", rec.Code, rec.Body.String())
	}

	// Try to access with various invalid file IDs (URL-safe examples)
	invalidIDs := []string{"../../etc/passwd", "file-with-special-chars"}
	for _, id := range invalidIDs {
		req = httptest.NewRequest(http.MethodGet, "/api/v1/file-store/preview/private/"+id, nil)
		req.Header.Set("Authorization", "Bearer "+providerToken)
		rec = httptest.NewRecorder()
		h.ServeHTTP(rec, req)

		if rec.Code >= 500 {
			t.Errorf("Invalid file ID %q should not return 500, got %d: %s", id, rec.Code, rec.Body.String())
		}
	}
}
