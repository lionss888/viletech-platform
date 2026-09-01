package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNotifyIdempotentAndHealth(t *testing.T) {
	gw := &gateway{provider: localProvider{}, seen: map[string]struct{}{}}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "provider": gw.provider.Name()})
	})
	mux.HandleFunc("POST /notify", gw.handleNotify)

	res := httptest.NewRecorder()
	mux.ServeHTTP(res, httptest.NewRequest(http.MethodGet, "/health", nil))
	if res.Code != http.StatusOK {
		t.Fatalf("health %d", res.Code)
	}

	body, _ := json.Marshal(map[string]any{
		"event_id": "e1", "to": "a@b.c", "template": "form_accepted", "form_payment_id": "f1",
	})
	req := httptest.NewRequest(http.MethodPost, "/notify", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("notify %d %s", rec.Code, rec.Body.String())
	}
	req2 := httptest.NewRequest(http.MethodPost, "/notify", bytes.NewReader(body))
	rec2 := httptest.NewRecorder()
	mux.ServeHTTP(rec2, req2)
	var out map[string]any
	_ = json.Unmarshal(rec2.Body.Bytes(), &out)
	if out["status"] != "duplicate" {
		t.Fatalf("%#v", out)
	}
}

func TestProbe(t *testing.T) {
	gw := &gateway{provider: localProvider{}, seen: map[string]struct{}{}}
	raw, _ := json.Marshal(map[string]any{"probe": true, "to": "x"})
	req := httptest.NewRequest(http.MethodPost, "/notify", bytes.NewReader(raw))
	rec := httptest.NewRecorder()
	gw.handleNotify(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("%d", rec.Code)
	}
}
