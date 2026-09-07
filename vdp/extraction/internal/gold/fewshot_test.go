package gold_test

import (
	"testing"
	"time"

	"github.com/viletech/vdp/extraction/internal/gold"
	"github.com/viletech/vdp/shared/extraction"
)

func TestRecentConfirmedDeterministic(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	st := gold.NewStore(dir)
	now := time.Now().UTC()
	for i, id := range []string{"a", "b", "c"} {
		human := extraction.FixtureResult(id)
		human.LineItems = []extraction.LineItem{{LineNo: 1, Description: "x", LineAmount: "1"}}
		rec := extraction.GoldRecord{
			GoldID:        "g-" + id,
			FormPaymentID: id,
			SchemaVersion: extraction.SchemaVersion,
			CreatedAt:     now.Add(time.Duration(i) * time.Minute),
			UpdatedAt:     now.Add(time.Duration(i) * time.Minute),
			HumanOut:      &human,
			LayoutText:    "layout-" + id,
		}
		if err := st.Append(rec); err != nil {
			t.Fatal(err)
		}
	}
	a, err := st.RecentConfirmed(2)
	if err != nil {
		t.Fatal(err)
	}
	b, err := st.RecentConfirmed(2)
	if err != nil {
		t.Fatal(err)
	}
	if len(a) != 2 || len(b) != 2 {
		t.Fatalf("len a=%d b=%d", len(a), len(b))
	}
	if a[0].GoldID != b[0].GoldID || a[1].GoldID != b[1].GoldID {
		t.Fatalf("non-deterministic %v vs %v", a[0].GoldID, b[0].GoldID)
	}
}
