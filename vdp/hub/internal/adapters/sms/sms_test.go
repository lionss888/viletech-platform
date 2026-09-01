package sms_test

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/viletech/vdp/hub/internal/adapters/sms"
)

func TestSMSPostsCanonicalContract(t *testing.T) {
	var last string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		last = string(body)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"accepted","channel":"sms"}`))
	}))
	t.Cleanup(srv.Close)
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	plugin := sms.New(time.Second, 1, log).WithBaseURL(srv.URL)
	out, err := plugin.Execute(context.Background(), "notify", map[string]any{
		"event_id": "e-sms", "form_payment_id": "f1",
		"payload": map[string]any{"template": "otp", "to": "+79991234567"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if out["channel"] != "sms" {
		t.Fatalf("%#v", out)
	}
	var parsed map[string]any
	_ = json.Unmarshal([]byte(last), &parsed)
	if parsed["to"] != "+79991234567" || parsed["template"] != "otp" {
		t.Fatalf("%s", last)
	}
	if strings.Contains(strings.ToLower(last), "passport") {
		t.Fatal("pii")
	}
}

func TestSMSFixtureWithoutURL(t *testing.T) {
	t.Setenv("SMS_URL", "")
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	plugin := sms.New(time.Second, 1, log)
	out, err := plugin.Execute(context.Background(), "notify", map[string]any{"event_id": "e1", "payload": map[string]any{"to": "+1", "template": "otp"}})
	if err != nil || out["mode"] != "fixture" {
		t.Fatalf("%v %#v", err, out)
	}
}
