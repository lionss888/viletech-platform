package export_test

import (
	"bytes"
	"testing"

	"github.com/viletech/vdp/core/internal/export"
)

func TestMinimalXLSXIsZip(t *testing.T) {
	t.Parallel()
	data, err := export.MinimalXLSX("Requests", []string{"id", "status"}, [][]string{{"f1", "draft"}})
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(data, []byte("PK")) {
		t.Fatalf("want zip prefix got %q", data[:min(4, len(data))])
	}
	if len(data) < 100 {
		t.Fatalf("xlsx too small: %d", len(data))
	}
}

func TestParseSheetRowsRoundTrip(t *testing.T) {
	t.Parallel()
	data, err := export.MinimalXLSX("Sheet1", []string{"amount", "currency"}, [][]string{{"100", "USD"}, {"200", "EUR"}})
	if err != nil {
		t.Fatal(err)
	}
	rows, err := export.ParseSheetRows(data)
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 3 || rows[0][0] != "amount" || rows[1][1] != "USD" || rows[2][0] != "200" {
		t.Fatalf("rows=%#v", rows)
	}
}
