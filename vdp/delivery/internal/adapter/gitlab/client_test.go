package gitlabforge

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
		if r.URL.Path != "/projects/group/proj/pipeline" {
			t.Fatalf("path %s", r.URL.Path)
		}
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"id":1}`))
	}))
	t.Cleanup(server.Close)
	client := New(server.URL, "tok", "group/proj")
	client.HTTPClient = server.Client()
	if err := client.DispatchDeploy(context.Background(), domain.EnvAlpha, "12"); err != nil {
		t.Fatal(err)
	}
}

func TestDispatchDeployConflict(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusConflict)
	}))
	t.Cleanup(server.Close)
	client := New(server.URL, "tok", "group/proj")
	client.HTTPClient = server.Client()
	if err := client.DispatchDeploy(context.Background(), domain.EnvGamma, "1"); err == nil {
		t.Fatal("expected 409")
	}
}

func TestDispatchDeployTimeout(t *testing.T) {
	t.Parallel()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond)
		w.WriteHeader(http.StatusCreated)
	}))
	t.Cleanup(server.Close)
	client := New(server.URL, "tok", "group/proj")
	client.HTTPClient = server.Client()
	client.HTTPClient.Timeout = 20 * time.Millisecond
	if err := client.DispatchDeploy(context.Background(), domain.EnvAlpha, "1"); err == nil {
		t.Fatal("expected timeout")
	}
}
