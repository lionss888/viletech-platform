package analytics

import "testing"

func TestRunBundleTable(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name         string
		raw          string
		wantClass    string
		wantConflict bool
	}{
		{name: "bug tag", raw: "@bot #баг падает кнопка оплаты на экране", wantClass: "bug"},
		{name: "short noise", raw: "@bot план", wantClass: "noise"},
		{name: "tag bug feature text", raw: "@bot #баг нужно добавить новую кнопку экспорта", wantClass: "bug", wantConflict: true},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got := Run(tc.raw, "bot")
			if got.Class != tc.wantClass {
				t.Fatalf("class=%q want %q", got.Class, tc.wantClass)
			}
			if got.Confidence != "low" && got.Confidence != "medium" && got.Confidence != "high" {
				t.Fatalf("confidence=%q", got.Confidence)
			}
			if tc.wantConflict && len(got.Conflicts) == 0 {
				t.Fatal("expected conflicts")
			}
			if got.Estimate.Todos < 1 {
				t.Fatalf("todos=%d", got.Estimate.Todos)
			}
			ar := got.AnalyzeResult()
			if ar.Class != got.Class {
				t.Fatal("AnalyzeResult mismatch")
			}
		})
	}
}
