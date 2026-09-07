package service

import (
	"context"
	"testing"
	"time"
)

func TestRecognizeFixture(t *testing.T) {
	t.Parallel()
	goldDir := t.TempDir()
	svc := New(Config{Primary: "fixture", GoldDir: goldDir})
	out, err := svc.Recognize(context.Background(), RecognizeRequest{
		FormPaymentID: "form-1",
		EventID:       "ev-1",
		Payload:       map[string]any{"file_name": "a.txt", "text": "invoice 100 USD"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if out.Status != "recognized" || out.Fields["currency"] != "USD" {
		t.Fatalf("%+v", out)
	}
	if out.Fields["invoice_json"] == nil || out.Fields["invoice_json"] == "" {
		t.Fatal("missing invoice_json")
	}
	deadline := time.Now().Add(2 * time.Second)
	for {
		recs, listErr := svc.GoldStore().List()
		if listErr == nil && len(recs) > 0 {
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("gold append did not finish")
		}
		time.Sleep(20 * time.Millisecond)
	}
}
