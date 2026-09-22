package service

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/viletech/vdp/extraction/internal/engine"
	"github.com/viletech/vdp/shared/extraction"
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
	inv, _ := out.Fields["invoice_json"].(string)
	if !strings.Contains(inv, "fixture") || !strings.Contains(inv, "degraded") {
		t.Fatalf("fixture mode should be marked degraded: %s", inv)
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

type failPrimary struct{}

func (failPrimary) Name() string { return "broken" }
func (failPrimary) Extract(context.Context, engine.Input) (extraction.Result, error) {
	return extraction.Result{}, errors.New("boom")
}

func TestRecognizePrimaryFailUsesDegradedNotFakeMoney(t *testing.T) {
	t.Parallel()
	svc := New(Config{Primary: "fixture", GoldDir: t.TempDir()})
	svc.primary = failPrimary{}
	svc.fallback = nil
	out, err := svc.Recognize(context.Background(), RecognizeRequest{
		FormPaymentID: "form-fail",
		EventID:       "ev-fail",
		Payload:       map[string]any{"file_name": "a.txt", "text": "x"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if out.Mode != "fixture_error" {
		t.Fatalf("mode=%s", out.Mode)
	}
	inv, _ := out.Fields["invoice_json"].(string)
	if strings.Contains(inv, `"invoice_amount":"1000"`) {
		t.Fatalf("must not use fixture money: %s", inv)
	}
	if !strings.Contains(inv, "fixture_error") {
		t.Fatalf("want fixture_error engine: %s", inv)
	}
}
