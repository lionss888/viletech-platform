package extraction

import (
	"context"
	"encoding/json"
	"testing"
)

func TestFixtureResultValid(t *testing.T) {
	t.Parallel()
	r := FixtureResult("f1")
	if err := Validate(r); err != nil {
		t.Fatal(err)
	}
	if len(r.LineItems) != 1 {
		t.Fatalf("line_items=%d", len(r.LineItems))
	}
	fields := HubFields(r)
	if fields["currency"] != "USD" {
		t.Fatalf("%v", fields)
	}
	raw := ToInvoiceJSON(r)
	parsed, err := ParseResult([]byte(raw))
	if err != nil {
		t.Fatal(err)
	}
	if parsed.Header.InvoiceAmount != "1000" {
		t.Fatalf("%+v", parsed)
	}
}

func TestParseFromInvoiceJSON(t *testing.T) {
	t.Parallel()
	r := FixtureResult("f2")
	got, ok := ParseFromInvoiceJSON(ToInvoiceJSON(r))
	if !ok || got.Meta.EngineID != "fixture" {
		t.Fatalf("ok=%v got=%+v", ok, got)
	}
	wrap, _ := json.Marshal(map[string]any{"extraction": r})
	got2, ok2 := ParseFromInvoiceJSON(string(wrap))
	if !ok2 || got2.Header.Currency != "USD" {
		t.Fatalf("ok=%v got=%+v", ok2, got2)
	}
}

func TestContentHashStable(t *testing.T) {
	t.Parallel()
	a := FixtureResult("f3")
	b := FixtureResult("f3")
	if ContentHash(a) != ContentHash(b) {
		t.Fatal("hash mismatch")
	}
}

func TestDegradedResultAndIsDegraded(t *testing.T) {
	t.Parallel()
	r := DegradedResult("f4", EngineUnavailable, "ocr_transport_failed")
	if err := Validate(r); err != nil {
		t.Fatal(err)
	}
	if r.Header.InvoiceAmount != "" {
		t.Fatalf("want empty amount, got %q", r.Header.InvoiceAmount)
	}
	if !IsDegraded(r) {
		t.Fatal("expected degraded")
	}
	if !IsDegraded(FixtureResult("f5")) {
		t.Fatal("fixture must be degraded")
	}
	ok := Result{SchemaVersion: SchemaVersion, Meta: Meta{EngineID: "docling"}}
	if IsDegraded(ok) {
		t.Fatal("docling must not be degraded")
	}
	if ClassifyOCRFailEngine(context.DeadlineExceeded) != EngineTimeout {
		t.Fatal("deadline -> timeout")
	}
}
