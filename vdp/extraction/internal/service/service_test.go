package service

import (
	"context"
	"testing"
)

func TestRecognizeFixture(t *testing.T) {
	t.Parallel()
	svc := New(Config{Primary: "fixture", GoldDir: t.TempDir()})
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
}
