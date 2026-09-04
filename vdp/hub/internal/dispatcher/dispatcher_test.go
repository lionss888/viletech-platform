package dispatcher_test

import (
	"context"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/viletech/vdp/hub/internal/adapters/docs"
	"github.com/viletech/vdp/hub/internal/adapters/mail"
	"github.com/viletech/vdp/hub/internal/adapters/sms"
	"github.com/viletech/vdp/hub/internal/adapters/telegram"
	"github.com/viletech/vdp/hub/internal/dispatcher"
	"github.com/viletech/vdp/hub/internal/inbox"
	"github.com/viletech/vdp/hub/internal/registry"
	"github.com/viletech/vdp/shared/events"
)

func TestInboxIdempotent(t *testing.T) {
	t.Parallel()
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	plugins := registry.New()
	tg := telegram.New(time.Second, 2, log)
	if err := plugins.Register(tg); err != nil {
		t.Fatal(err)
	}
	if err := plugins.Register(tg); err == nil {
		t.Fatal("duplicate register must fail")
	}
	d := dispatcher.New(inbox.NewStore(), plugins, log)
	env := events.Envelope{
		EventID:       "evt-1",
		EventType:     events.TypeTelegramNotify,
		FormPaymentID: "form-1",
		Payload:       map[string]any{"to": "notify"},
	}
	if _, err := d.Handle(context.Background(), env); err != nil {
		t.Fatal(err)
	}
	if _, err := d.Handle(context.Background(), env); err != nil {
		t.Fatal(err)
	}
	if len(tg.Sent) != 1 {
		t.Fatalf("expected 1 notify, got %d", len(tg.Sent))
	}
}

func TestRouteDocsAndMail(t *testing.T) {
	t.Parallel()
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	cases := []struct {
		name      string
		eventType string
		formID    string
		wantKey   string
		wantVal   any
	}{
		{
			name:      "docs",
			eventType: events.TypeDocsGenerate,
			formID:    "form-docs",
			wantKey:   "storage_key",
			wantVal:   "docs/form-docs/stub.pdf",
		},
		{
			name:      "mail",
			eventType: events.TypeMailNotify,
			formID:    "form-mail",
			wantKey:   "channel",
			wantVal:   "mail",
		},
		{
			name:      "sms",
			eventType: events.TypeSMSNotify,
			formID:    "form-sms",
			wantKey:   "channel",
			wantVal:   "sms",
		},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			plugins := registry.New()
			if err := plugins.Register(docs.New(time.Second, 2, log)); err != nil {
				t.Fatal(err)
			}
			if err := plugins.Register(mail.New(time.Second, 2, log)); err != nil {
				t.Fatal(err)
			}
			if err := plugins.Register(telegram.New(time.Second, 2, log)); err != nil {
				t.Fatal(err)
			}
			if err := plugins.Register(sms.New(time.Second, 2, log)); err != nil {
				t.Fatal(err)
			}
			d := dispatcher.New(inbox.NewStore(), plugins, log)
			env := events.Envelope{
				EventID:       "evt-" + tc.name,
				EventType:     tc.eventType,
				FormPaymentID: tc.formID,
			}
			actual, err := d.Handle(context.Background(), env)
			if err != nil {
				t.Fatal(err)
			}
			if actual[tc.wantKey] != tc.wantVal {
				t.Fatalf("expected %s=%v, got %#v", tc.wantKey, tc.wantVal, actual)
			}
		})
	}
}
