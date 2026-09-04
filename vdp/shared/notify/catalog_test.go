package notify_test

import (
	"testing"

	"github.com/viletech/vdp/shared/notify"
)

func TestCatalogSMSIsNarrow(t *testing.T) {
	t.Parallel()
	sms := notify.SMSEvents()
	if len(sms) == 0 {
		t.Fatal("expected sms events")
	}
	for _, event := range sms {
		switch event {
		case "form_waiting_corrections", "canceled_by_compliance", "organization_blocked", "otp":
		default:
			t.Fatalf("sms must stay critical-only, got %s", event)
		}
	}
	if notify.AllowsChannel("payment_sent", notify.ChannelSMS) {
		t.Fatal("payment_sent must not use SMS")
	}
}

func TestCatalogTelegramOnStatus(t *testing.T) {
	t.Parallel()
	if !notify.AllowsChannel("form_payment.status_changed", notify.ChannelTelegram) {
		t.Fatal("status_changed should allow telegram")
	}
	entry, ok := notify.Lookup("form_accepted")
	if !ok || entry.Template != "form_accepted" {
		t.Fatalf("%#v", entry)
	}
}
