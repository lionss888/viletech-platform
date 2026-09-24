package engine_test

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/viletech/vdp/extraction/internal/engine"
)

func TestDoclingPrimaryConvertsAndMaps(t *testing.T) {
	t.Parallel()
	mux := http.NewServeMux()
	mux.HandleFunc("/v1/convert/source", func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"document": map[string]any{
				"md_content": "Invoice INV-42 dated 2026-01-15. Amount 1500.00 USD. Seller Acme LLC.",
			},
		})
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	d := engine.NewDocling(srv.URL)
	d.HTTP = srv.Client()
	out, err := d.Extract(context.Background(), engine.Input{
		FormPaymentID: "f-doc",
		FileName:      "invoice.txt",
		Content:       []byte("ignored raw"),
	})
	if err != nil {
		t.Fatal(err)
	}
	if out.Meta.EngineID != "docling" {
		t.Fatalf("engine=%s", out.Meta.EngineID)
	}
	if out.Header.InvoiceAmount != "1500.00" || out.Header.Currency != "USD" {
		t.Fatalf("header=%+v", out.Header)
	}
	if out.Header.InvoiceNumber != "INV-42" {
		t.Fatalf("invoice_number=%s", out.Header.InvoiceNumber)
	}
	if out.Header.CompanyName == "" {
		t.Fatal("expected company")
	}
	if out.Confidence < 0.55 {
		t.Fatalf("expected raised confidence when fields found, got %v", out.Confidence)
	}
}

func TestDoclingPrimaryUsesContentBase64(t *testing.T) {
	t.Parallel()
	mux := http.NewServeMux()
	mux.HandleFunc("/v1/convert/source", func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		sources, _ := body["sources"].([]any)
		if len(sources) == 0 {
			t.Errorf("missing sources")
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"document": map[string]any{"text_content": "Total 99.50 EUR"},
		})
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	d := engine.NewDocling(srv.URL)
	d.HTTP = srv.Client()
	out, err := d.Extract(context.Background(), engine.Input{
		FormPaymentID: "f2",
		ContentB64:    base64.StdEncoding.EncodeToString([]byte("pdf-bytes")),
		FileName:      "a.pdf",
	})
	if err != nil {
		t.Fatal(err)
	}
	if out.Header.Currency != "EUR" || out.Header.InvoiceAmount != "99.50" {
		t.Fatalf("%+v", out.Header)
	}
}

func TestMapDoclingTextHeuristics(t *testing.T) {
	t.Parallel()
	r := engine.MapDoclingText(engine.Input{FormPaymentID: "x"}, "Invoice INV-7 Amount 1 200,50 RUB Seller Test Co")
	if r.Header.Currency != "RUB" {
		t.Fatalf("currency=%s", r.Header.Currency)
	}
	if r.Header.InvoiceAmount != "1200.50" {
		t.Fatalf("amount=%s", r.Header.InvoiceAmount)
	}
	if r.Confidence < 0.55 {
		t.Fatalf("confidence=%v", r.Confidence)
	}
	empty := engine.MapDoclingText(engine.Input{FormPaymentID: "y"}, "no commercial fields here")
	if empty.Confidence >= 0.55 {
		t.Fatalf("empty layout should stay low confidence, got %v", empty.Confidence)
	}
}

func TestMapDoclingTextInvoiceHashAndCompany(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name   string
		text   string
		number string
		company string
		wantConf bool
	}{
		{
			name:     "Invoice-dash number",
			text:     "Invoice-25918 dated 2026-03-01. Total 10.00 USD. Seller ACME Trading GmbH",
			number:   "25918",
			company:  "ACME Trading GmbH",
			wantConf: true,
		},
		{
			name:     "Invoice hash label",
			text:     "Invoice# ABC-99 Amount 5.00 EUR Vendor Beta SA",
			number:   "ABC-99",
			company:  "Beta SA",
			wantConf: true,
		},
		{
			name:     "company and currency only",
			text:     "Seller OnlyCorp Ltd. Payment in USD without totals.",
			company:  "OnlyCorp Ltd",
			wantConf: true,
		},
		{
			name:     "bare from ignored",
			text:     "Shipped from warehouse floor. No seller line.",
			wantConf: false,
		},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got := engine.MapDoclingText(engine.Input{FormPaymentID: "t"}, tc.text)
			if tc.number != "" && got.Header.InvoiceNumber != tc.number {
				t.Fatalf("invoice_number=%q want %q", got.Header.InvoiceNumber, tc.number)
			}
			if tc.company != "" && got.Header.CompanyName != tc.company {
				t.Fatalf("company=%q want %q", got.Header.CompanyName, tc.company)
			}
			raised := got.Confidence >= 0.55
			if raised != tc.wantConf {
				t.Fatalf("confidence=%v raised=%v wantConf=%v", got.Confidence, raised, tc.wantConf)
			}
		})
	}
}
