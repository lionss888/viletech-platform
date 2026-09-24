package engine_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/viletech/vdp/extraction/internal/engine"
)

func TestDocTRExtractMapsText(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/ocr" {
			http.NotFound(w, r)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]string{
			"text": "Invoice INV-9 Amount 99.00 EUR Seller DocTR Co",
		})
	}))
	t.Cleanup(srv.Close)

	d := engine.NewDocTR(srv.URL)
	got, err := d.Extract(context.Background(), engine.Input{
		FormPaymentID: "f1",
		FileName:      "inv.pdf",
		Mime:          "application/pdf",
		Content:       []byte("%PDF-fake"),
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.Meta.EngineID != "doctr" {
		t.Fatalf("engine=%s", got.Meta.EngineID)
	}
	if got.Header.InvoiceNumber != "INV-9" {
		t.Fatalf("invoice=%s", got.Header.InvoiceNumber)
	}
	if got.Header.Currency != "EUR" {
		t.Fatalf("currency=%s", got.Header.Currency)
	}
}

func TestDocTRPlainTextSkipsSidecar(t *testing.T) {
	t.Parallel()
	d := engine.NewDocTR("http://127.0.0.1:1")
	got, err := d.Extract(context.Background(), engine.Input{
		FormPaymentID: "f2",
		FileName:      "a.txt",
		Mime:          "text/plain",
		Content:       []byte("Invoice INV-1 Amount 10.00 USD Seller Plain Co"),
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.Header.InvoiceNumber != "INV-1" {
		t.Fatalf("%+v", got.Header)
	}
}
