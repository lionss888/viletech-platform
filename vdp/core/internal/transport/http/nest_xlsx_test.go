package httpapi_test

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNestFormXLSXIsRealOOXML(t *testing.T) {
	core, _, _ := newStack(t)
	manager := login(t, core, "manager@vdp.local", "manager")
	req := httptest.NewRequest(http.MethodGet, "/api/v1/manager/form-payment/xlsx", nil)
	req.Header.Set("Authorization", "Bearer "+manager)
	res := httptest.NewRecorder()
	core.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", res.Code, res.Body.String())
	}
	body := res.Body.Bytes()
	if !bytes.HasPrefix(body, []byte("PK\x03\x04")) {
		t.Fatalf("want zip OOXML prefix, got %q", body[:min(16, len(body))])
	}
	if bytes.Contains(body, []byte("xlsx-placeholder")) {
		t.Fatal("still returning placeholder bytes")
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
