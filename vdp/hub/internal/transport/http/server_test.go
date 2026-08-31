package httpapi_test

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/viletech/vdp/hub/internal/adapters/telegram"
	"github.com/viletech/vdp/hub/internal/dispatcher"
	"github.com/viletech/vdp/hub/internal/inbox"
	"github.com/viletech/vdp/hub/internal/registry"
	httpapi "github.com/viletech/vdp/hub/internal/transport/http"
	"github.com/viletech/vdp/hub/pkg/config"
	"github.com/viletech/vdp/shared/events"
)

func TestHealthAndInboxS2S(t *testing.T) {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	plugins := registry.New()
	_ = plugins.Register(telegram.New(time.Second, 1, log))
	cfg := &config.Config{SharedSecret: "s2s"}
	h := httpapi.New(cfg, dispatcher.New(inbox.NewStore(), plugins, log), plugins).Handler()
	res := httptest.NewRecorder()
	h.ServeHTTP(res, httptest.NewRequest(http.MethodGet, "/api/v1/health", nil))
	if res.Code != http.StatusOK {
		t.Fatalf("health=%d", res.Code)
	}
	body, _ := json.Marshal(events.Envelope{EventID: "e1", EventType: events.TypeTelegramNotify, FormPaymentID: "f1"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/inbox", bytes.NewReader(body))
	res = httptest.NewRecorder()
	h.ServeHTTP(res, req)
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("no s2s code=%d", res.Code)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/inbox", bytes.NewReader(body))
	req.Header.Set("X-VDP-S2S", "s2s")
	res = httptest.NewRecorder()
	h.ServeHTTP(res, req)
	if res.Code != http.StatusAccepted {
		t.Fatalf("inbox=%d %s", res.Code, res.Body.String())
	}
}
