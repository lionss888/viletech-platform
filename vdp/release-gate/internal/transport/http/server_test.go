package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/viletech/vdp/release-gate/internal/authn"
	"github.com/viletech/vdp/release-gate/internal/domain"
	"github.com/viletech/vdp/release-gate/internal/port"
	"github.com/viletech/vdp/release-gate/internal/usecase"
)

type recordingForge struct {
	n int
}

func (recordingForge) Name() string { return "github" }

func (r *recordingForge) ListReleases(context.Context) ([]domain.Release, error) {
	return nil, nil
}

func (r *recordingForge) DispatchDeploy(context.Context, domain.Environment, string) error {
	r.n++
	return nil
}

func (r *recordingForge) SetSchedule(context.Context, domain.Environment, string, string) error {
	return nil
}

func (r *recordingForge) SetApprovers(context.Context, domain.Environment, []string) error {
	return nil
}

var _ port.Forge = (*recordingForge)(nil)

func TestGammaForbiddenHTTP(t *testing.T) {
	t.Parallel()
	auth := authn.New("test-secret")
	forge := &recordingForge{}
	svc := usecase.New(forge, nil)
	srv := New(svc, auth)
	token, _, err := auth.LoginLocal("alpha@vdp.local", "alpha")
	if err != nil {
		t.Fatal(err)
	}
	body, _ := json.Marshal(map[string]string{"images_run_id": "1", "tag": "vdp-v1.0.0"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/environments/gamma/promote", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	if forge.n != 0 {
		t.Fatal("must not dispatch for forbidden role")
	}
}

func TestAlphaPromoteAccepted(t *testing.T) {
	t.Parallel()
	auth := authn.New("test-secret")
	forge := &recordingForge{}
	svc := usecase.New(forge, nil)
	srv := New(svc, auth)
	token, _, err := auth.LoginLocal("alpha@vdp.local", "alpha")
	if err != nil {
		t.Fatal(err)
	}
	body, _ := json.Marshal(map[string]string{"images_run_id": "42", "tag": "sha-abcdef"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/environments/alpha/promote", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	if forge.n != 1 {
		t.Fatalf("dispatches=%d", forge.n)
	}
}
