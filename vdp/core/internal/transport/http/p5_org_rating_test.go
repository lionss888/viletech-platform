package httpapi_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestOrgListRatingFilterHTTP(t *testing.T) {
	core, _, _ := newStack(t)
	manager := login(t, core, "manager@vdp.local", "manager")
	orgID := "66666666-6666-6666-6666-666666666666"
	req := httptest.NewRequest(http.MethodPost, "/api/v1/organizations/"+orgID+"/rating", bytes.NewReader([]byte(`{"rating":"yellow"}`)))
	req.Header.Set("Authorization", "Bearer "+manager)
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	core.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("set rating status=%d %s", res.Code, res.Body.String())
	}
	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/manager/organization?rating=yellow&awaiting_processing=true", nil)
	listReq.Header.Set("Authorization", "Bearer "+manager)
	listRes := httptest.NewRecorder()
	core.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("list status=%d %s", listRes.Code, listRes.Body.String())
	}
	var items []map[string]any
	if err := json.Unmarshal(listRes.Body.Bytes(), &items); err != nil {
		t.Fatal(err)
	}
	if len(items) == 0 {
		t.Fatal("expected yellow-rated org in filtered list")
	}
}
