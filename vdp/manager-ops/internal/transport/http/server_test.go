package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/viletech/vdp/manager-ops/internal/adapters/telegram"
	"github.com/viletech/vdp/manager-ops/internal/behavior"
	"github.com/viletech/vdp/manager-ops/internal/roster"
	"github.com/viletech/vdp/manager-ops/internal/store/memory"
	"github.com/viletech/vdp/shared/managerops"
)

func TestHealthAndIngest(t *testing.T) {
	t.Parallel()
	st := memory.New()
	tg := telegram.New("", nil)
	tg.SetFixtureMembers("-100", []managerops.MemberSnapshot{{TelegramUserID: "7"}})
	srv := &Server{
		Roster:   roster.New(st, nil, tg, nil, nil),
		Behavior: behavior.New(st, tg, nil),
	}
	h := srv.Handler()

	res := httptest.NewRecorder()
	h.ServeHTTP(res, httptest.NewRequest(http.MethodGet, "/health", nil))
	if res.Code != http.StatusOK {
		t.Fatalf("health %d", res.Code)
	}

	body, _ := json.Marshal(managerops.Event{
		IdempotencyKey: "e1", AccountID: "a1", Source: managerops.SourceCore,
		Kind: managerops.KindFirstTouch, OccurredAt: time.Now().UTC(),
	})
	res = httptest.NewRecorder()
	h.ServeHTTP(res, httptest.NewRequest(http.MethodPost, "/v1/events", bytes.NewReader(body)))
	if res.Code != http.StatusOK {
		t.Fatalf("ingest %d body=%s", res.Code, res.Body.String())
	}

	res = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/v1/consent/a1", bytes.NewReader([]byte(`{"enabled":true}`)))
	h.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("consent %d", res.Code)
	}

	syncBody, _ := json.Marshal(managerops.SyncRequest{ChatID: "-100"})
	res = httptest.NewRecorder()
	h.ServeHTTP(res, httptest.NewRequest(http.MethodPost, "/v1/roster/sync", bytes.NewReader(syncBody)))
	if res.Code != http.StatusOK {
		t.Fatalf("sync %d body=%s", res.Code, res.Body.String())
	}
}
