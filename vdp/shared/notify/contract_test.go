package notify_test

import (
	"testing"

	"github.com/viletech/vdp/shared/notify"
)

func TestRequestValidateTable(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name    string
		in      notify.Request
		wantErr bool
	}{
		{name: "ok mail", in: notify.Request{EventID: "e1", Channel: notify.ChannelMail, To: "a@b.c", Template: "form_accepted"}},
		{name: "ok sms", in: notify.Request{IdempotencyKey: "k1", Channel: notify.ChannelSMS, To: "+7999", Template: "otp"}},
		{name: "missing key", in: notify.Request{Channel: notify.ChannelMail, To: "a@b.c", Template: "x"}, wantErr: true},
		{name: "missing to", in: notify.Request{EventID: "e1", Channel: notify.ChannelMail, Template: "x"}, wantErr: true},
		{name: "bad channel", in: notify.Request{EventID: "e1", Channel: notify.ChannelTelegram, To: "1", Template: "x"}, wantErr: true},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			err := tc.in.Validate()
			if tc.wantErr && err == nil {
				t.Fatal("expected error")
			}
			if !tc.wantErr && err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestContainsForbiddenPII(t *testing.T) {
	t.Parallel()
	if notify.ContainsForbiddenPII(map[string]any{"action": "submit", "to": "draft"}) {
		t.Fatal("status payload must be clean")
	}
	if !notify.ContainsForbiddenPII(map[string]any{"passport": "4510"}) {
		t.Fatal("passport must be flagged")
	}
}

func TestMaskDestination(t *testing.T) {
	t.Parallel()
	if got := notify.MaskDestination("user@vdp.local"); got == "user@vdp.local" {
		t.Fatalf("unmasked %s", got)
	}
	if got := notify.MaskDestination("+79991234567"); got == "+79991234567" {
		t.Fatalf("unmasked phone %s", got)
	}
}

func TestFromHubParams(t *testing.T) {
	t.Parallel()
	got := notify.FromHubParams(notify.ChannelMail, map[string]any{
		"event_id":        "e1",
		"form_payment_id": "f1",
		"payload":         map[string]any{"template": "form_accepted", "to": "a@b.c"},
	})
	if got.To != "a@b.c" || got.Template != "form_accepted" || got.Key() != "e1" {
		t.Fatalf("%#v", got)
	}
}
