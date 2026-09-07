package golden_test

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/viletech/vdp/shared/extraction"
)

func TestGoldenSampleParses(t *testing.T) {
	t.Parallel()
	_, file, _, _ := runtime.Caller(0)
	raw, err := os.ReadFile(filepath.Join(filepath.Dir(file), "testdata", "golden", "invoice_sample.json"))
	if err != nil {
		t.Fatal(err)
	}
	r, err := extraction.ParseResult(raw)
	if err != nil {
		t.Fatal(err)
	}
	if len(r.LineItems) != 1 || r.Header.Currency != "USD" {
		t.Fatalf("%+v", r)
	}
}
