package gold_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"testing"

	"github.com/viletech/vdp/extraction/internal/gold"
	"github.com/viletech/vdp/shared/extraction"
)

func TestExportSplitDeterministic(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	st := gold.NewStore(dir)
	for _, id := range []string{"form-b", "form-a", "form-c"} {
		human := extraction.FixtureResult(id)
		rec := extraction.GoldRecord{
			GoldID:        "g-" + id,
			FormPaymentID: id,
			SchemaVersion: extraction.SchemaVersion,
			PrimaryOut:    extraction.FixtureResult(id),
			HumanOut:      &human,
		}
		if err := st.Append(rec); err != nil {
			t.Fatal(err)
		}
	}
	a := splitForms(st, 0.34)
	b := splitForms(st, 0.34)
	if a.trainN != b.trainN || a.testN != b.testN {
		t.Fatalf("non-deterministic counts a=%+v b=%+v", a, b)
	}
	if a.testForms[0] != b.testForms[0] {
		t.Fatalf("test set order drifted %v vs %v", a.testForms, b.testForms)
	}
	raw, _ := json.Marshal(a)
	_ = os.WriteFile(filepath.Join(dir, "split-check.json"), raw, 0o640)
}

type splitStats struct {
	trainN    int
	testN     int
	testForms []string
}

func splitForms(st *gold.Store, testRatio float64) splitStats {
	recs, _ := st.List()
	byForm := map[string][]extraction.GoldRecord{}
	for _, r := range recs {
		if r.HumanOut == nil {
			continue
		}
		byForm[r.FormPaymentID] = append(byForm[r.FormPaymentID], r)
	}
	forms := make([]string, 0, len(byForm))
	for id := range byForm {
		forms = append(forms, id)
	}
	sort.Strings(forms)
	nTest := int(float64(len(forms)) * testRatio)
	if nTest < 1 && len(forms) > 1 {
		nTest = 1
	}
	testSet := map[string]bool{}
	testForms := []string{}
	for i := 0; i < nTest && i < len(forms); i++ {
		testSet[forms[i]] = true
		testForms = append(testForms, forms[i])
	}
	trainN, testN := 0, 0
	for _, id := range forms {
		n := len(byForm[id])
		if testSet[id] {
			testN += n
		} else {
			trainN += n
		}
	}
	return splitStats{trainN: trainN, testN: testN, testForms: testForms}
}
