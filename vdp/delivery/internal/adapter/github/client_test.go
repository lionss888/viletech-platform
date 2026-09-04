package githubforge

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/viletech/vdp/delivery/internal/domain"
)

func TestDispatchDeploySuccess(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/repos/acme/vdp/actions/workflows/vdp-deploy.yml/dispatches" {
			t.Fatalf("path %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer tok" {
			t.Fatal("missing bearer")
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	t.Cleanup(server.Close)
	client := New(server.URL, "tok", "acme/vdp")
	client.HTTPClient = server.Client()
	if err := client.DispatchDeploy(context.Background(), domain.EnvAlpha, "99"); err != nil {
		t.Fatal(err)
	}
}

func TestDispatchDeployConflict(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusConflict)
		_, _ = w.Write([]byte("already running"))
	}))
	t.Cleanup(server.Close)
	client := New(server.URL, "tok", "acme/vdp")
	client.HTTPClient = server.Client()
	err := client.DispatchDeploy(context.Background(), domain.EnvBeta, "1")
	if err == nil {
		t.Fatal("expected 409")
	}
}

func TestDispatchDeployTimeout(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond)
		w.WriteHeader(http.StatusNoContent)
	}))
	t.Cleanup(server.Close)
	client := New(server.URL, "tok", "acme/vdp")
	client.HTTPClient = server.Client()
	client.HTTPClient.Timeout = 20 * time.Millisecond
	err := client.DispatchDeploy(context.Background(), domain.EnvAlpha, "1")
	if err == nil {
		t.Fatal("expected timeout")
	}
}

func TestListReleases(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[{"tag_name":"vdp-v1.0.0","name":"VDP vdp-v1.0.0"}]`))
	}))
	t.Cleanup(server.Close)
	client := New(server.URL, "tok", "acme/vdp")
	client.HTTPClient = server.Client()
	list, err := client.ListReleases(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 || !list[0].IsProduct {
		t.Fatalf("got %+v", list)
	}
}
