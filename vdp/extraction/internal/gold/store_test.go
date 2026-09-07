package gold

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/viletech/vdp/shared/extraction"
)

func TestAppendAndUpsertHuman(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	st := NewStore(dir)
	rec := extraction.GoldRecord{
		GoldID:        "g1",
		FormPaymentID: "f1",
		PrimaryOut:    extraction.FixtureResult("f1"),
		ShadowOut:     extraction.FixtureResult("f1"),
		PrimaryEngine: "fixture",
		ShadowEngine:  "stub",
	}
	if err := st.Append(rec); err != nil {
		t.Fatal(err)
	}
	human := extraction.FixtureResult("f1")
	human.Header.InvoiceAmount = "2000"
	if err := st.UpsertHuman("f1", "g1", human); err != nil {
		t.Fatal(err)
	}
	list, err := st.List()
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 || list[0].HumanOut == nil || list[0].HumanOut.Header.InvoiceAmount != "2000" {
		t.Fatalf("%+v", list)
	}
	if _, err := os.Stat(filepath.Join(dir, "gold.jsonl")); err != nil {
		t.Fatal(err)
	}
}
