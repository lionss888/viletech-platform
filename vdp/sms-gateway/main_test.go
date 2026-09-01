package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestSMSNotifyIdempotent(t *testing.T) {
	gw := &gateway{provider: localSMS{}, seen: map[string]struct{}{}, last: map[string]time.Time{}}
	body, _ := json.Marshal(map[string]any{"event_id": "e1", "to": "+7999", "template": "otp"})
	rec := httptest.NewRecorder()
	gw.handleNotify(rec, httptest.NewRequest(http.MethodPost, "/notify", bytes.NewReader(body)))
	if rec.Code != http.StatusOK {
		t.Fatalf("%d %s", rec.Code, rec.Body.String())
	}
	rec2 := httptest.NewRecorder()
	gw.handleNotify(rec2, httptest.NewRequest(http.MethodPost, "/notify", bytes.NewReader(body)))
	var out map[string]any
	_ = json.Unmarshal(rec2.Body.Bytes(), &out)
	if out["status"] != "duplicate" {
		t.Fatalf("%#v", out)
	}
}

func TestSMSHealth(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
	})
	res := httptest.NewRecorder()
	mux.ServeHTTP(res, httptest.NewRequest(http.MethodGet, "/health", nil))
	if res.Code != http.StatusOK {
		t.Fatalf("%d", res.Code)
	}
}
