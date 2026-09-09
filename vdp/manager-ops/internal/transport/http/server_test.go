package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/viletech/vdp/manager-ops/internal/adapters/telegram"
	"github.com/viletech/vdp/manager-ops/internal/behavior"
	"github.com/viletech/vdp/manager-ops/internal/domain"
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

func TestS2SRequiredWhenConfigured(t *testing.T) {
	t.Parallel()
	st := memory.New()
	srv := &Server{
		Roster:          roster.New(st, nil, telegram.New("", nil), nil, nil),
		Behavior:        behavior.New(st, nil, nil),
		HubSharedSecret: "sec",
	}
	body, _ := json.Marshal(managerops.Event{
		IdempotencyKey: "e2", AccountID: "a1", Source: managerops.SourceCore,
		Kind: managerops.KindApprove, OccurredAt: time.Now().UTC(),
	})
	res := httptest.NewRecorder()
	srv.Handler().ServeHTTP(res, httptest.NewRequest(http.MethodPost, "/v1/events", bytes.NewReader(body)))
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("code=%d", res.Code)
	}
	req := httptest.NewRequest(http.MethodPost, "/v1/events", bytes.NewReader(body))
	req.Header.Set("X-VDP-S2S", "sec")
	res = httptest.NewRecorder()
	srv.Handler().ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("code=%d body=%s", res.Code, res.Body.String())
	}
}

func TestTelegramWebhookMetadata(t *testing.T) {
	t.Parallel()
	st := memory.New()
	ctx := context.Background()
	_ = st.UpsertChat(ctx, domain.Chat{ChatID: "-100", Active: true})
	_ = st.UpsertPerson(ctx, domain.Person{TelegramUserID: "7", AccountID: "a1"})
	_ = st.ReplaceMemberships(ctx, "-100", []domain.Membership{{ChatID: "-100", TelegramUserID: "7"}})
	srv := &Server{Behavior: behavior.New(st, nil, nil)}
	update, _ := json.Marshal(map[string]any{
		"update_id": float64(1),
		"message": map[string]any{
			"message_id": float64(9),
			"text":       "should-not-persist",
			"from":       map[string]any{"id": float64(7)},
			"chat":       map[string]any{"id": float64(-100)},
		},
	})
	res := httptest.NewRecorder()
	srv.Handler().ServeHTTP(res, httptest.NewRequest(http.MethodPost, "/v1/telegram/webhook", bytes.NewReader(update)))
	if res.Code != http.StatusOK {
		t.Fatalf("code=%d body=%s", res.Code, res.Body.String())
	}
	ev, err := st.ListAllEvents(ctx, time.Time{})
	if err != nil || len(ev) != 1 {
		t.Fatalf("events=%d err=%v", len(ev), err)
	}
	if _, ok := ev[0].Payload["text"]; ok {
		t.Fatal("text leaked into store")
	}
}
