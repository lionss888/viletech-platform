package httpapi_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestR2AuthOrgMatrixAllDone(t *testing.T) {
	t.Parallel()
	var done, other int
	for _, row := range nestEndpointParity {
		if row.Module != "auth" && row.Module != "account" && row.Module != "organization" {
			continue
		}
		if row.Status == ParityDone {
			done++
		} else {
			other++
			t.Errorf("%s %s status=%s want done", row.Module, row.NestPath, row.Status)
		}
	}
	if done < 50 {
		t.Fatalf("auth/account/org done=%d want >=50 Nest controller routes", done)
	}
	if other != 0 {
		t.Fatalf("auth/org matrix incomplete: %d not done", other)
	}
}

func TestR2RegisterConfirmLoginNot501(t *testing.T) {
	core, _, _ := newStack(t)
	body := []byte(`{"email":"r2user@vdp.local","password":"secret1","full_name":"R2 User"}`)
	res := httptest.NewRecorder()
	core.ServeHTTP(res, httptest.NewRequest(http.MethodPost, "/api/v1/auth/registration", bytes.NewReader(body)))
	if res.Code == http.StatusNotImplemented {
		t.Fatal("register must not be NotImplemented")
	}
	if res.Code != http.StatusOK {
		t.Fatalf("registration %d %s", res.Code, res.Body.String())
	}
	var reg map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &reg)
	code, _ := reg["code"].(string)
	if code == "" {
		t.Fatal("expected confirmation code in dev response")
	}
	cres := httptest.NewRecorder()
	cbody := []byte(`{"email":"r2user@vdp.local","code":"` + code + `"}`)
	core.ServeHTTP(cres, httptest.NewRequest(http.MethodPost, "/api/v1/auth/registration/confirm", bytes.NewReader(cbody)))
	if cres.Code != http.StatusCreated {
		t.Fatalf("confirm %d %s", cres.Code, cres.Body.String())
	}
	token := login(t, core, "r2user@vdp.local", "secret1")
	if token == "" {
		t.Fatal("login after confirm")
	}
	me := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/account", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	core.ServeHTTP(me, req)
	if me.Code != 200 {
		t.Fatalf("account me %d", me.Code)
	}
}

func TestR2ICOOrgApproveBlockRBAC(t *testing.T) {
	core, _, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")
	ico := login(t, core, "ico@vdp.local", "ico")
	// user forbidden on ICO approve
	res := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/internal-compliance-officer/organization/66666666-6666-6666-6666-666666666666/approve", bytes.NewReader([]byte("{}")))
	req.Header.Set("Authorization", "Bearer "+user)
	core.ServeHTTP(res, req)
	if res.Code != http.StatusForbidden {
		t.Fatalf("user approve want 403 got %d", res.Code)
	}
	mustOK(t, core, ico, http.MethodPut, "/api/v1/admin/internal-compliance-officer/organization/66666666-6666-6666-6666-666666666666/approve", nil)
	got := getJSON(t, core, ico, "/api/v1/organization/66666666-6666-6666-6666-666666666666")
	if got["client_status"] != "активный" {
		t.Fatalf("client_status=%v", got["client_status"])
	}
}
