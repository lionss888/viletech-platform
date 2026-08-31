package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestGenerateReturnsStorageKey(t *testing.T) {
	body := map[string]any{
		"form_payment_id": "f1",
		"kind":            "import_order",
		"organization_name": "Client LLC",
	}
	raw, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/generate", bytes.NewReader(raw))
	rec := httptest.NewRecorder()
	handleGenerate(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	var out map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out["storage_key"] != "docs/f1/import_order.pdf" {
		t.Fatalf("storage_key=%v", out["storage_key"])
	}
}

func TestProbeEndpoint(t *testing.T) {
	raw, _ := json.Marshal(map[string]any{"form_payment_id": "x", "probe": true})
	req := httptest.NewRequest(http.MethodPost, "/generate", bytes.NewReader(raw))
	rec := httptest.NewRecorder()
	handleGenerate(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d", rec.Code)
	}
}
