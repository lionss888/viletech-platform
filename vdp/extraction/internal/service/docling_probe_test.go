package service

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestProbeDoclingReachable(t *testing.T) {
	t.Parallel()
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/health" {
			t.Fatalf("path=%s", r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	}))
	t.Cleanup(up.Close)
	if !ProbeDoclingReachable(context.Background(), up.URL, up.Client()) {
		t.Fatal("want reachable")
	}
	if ProbeDoclingReachable(context.Background(), "", nil) {
		t.Fatal("empty url")
	}
	down := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	t.Cleanup(down.Close)
	if ProbeDoclingReachable(context.Background(), down.URL, down.Client()) {
		t.Fatal("want unreachable on 503")
	}
}
