package extraction

import (
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
