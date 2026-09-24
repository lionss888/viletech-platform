package analytics

import (
	"encoding/json"
	"testing"
)

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

func TestBundleMappingTable(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name        string
		raw         string
		wantClass   string
		wantLow     bool
		wantConflict bool
	}{
		{name: "clarify short", raw: "@bot ок", wantLow: true},
		{name: "bug with conflict", raw: "@bot #баг нужно добавить новую кнопку экспорта", wantClass: "bug", wantConflict: true},
		{name: "feature change", raw: "@bot #доработка добавить фильтр в список заявок менеджера"},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			b := Run(tc.raw, "bot")
			var asResult Result = b
			if asResult.Class != b.Class {
				t.Fatal("Result alias mismatch")
			}
			inbox := b.ToInbox()
			if inbox.Class != b.Class || inbox.Confidence != b.Confidence || inbox.Chars != b.Chars {
				t.Fatalf("ToInbox mismatch: %+v vs %+v", inbox, b)
			}
			if len(inbox.Tags) != len(b.Tags) {
				t.Fatalf("tags len %d want %d", len(inbox.Tags), len(b.Tags))
			}
			plan := b.ToPlan()
			if plan.Class != b.Class {
				t.Fatalf("ToPlan class=%q", plan.Class)
			}
			if plan.TimelinePhrase != b.Estimate.ManagerPhrase {
				t.Fatalf("timeline=%q", plan.TimelinePhrase)
			}
			if plan.Todos != b.Estimate.Todos || plan.Hours != b.Estimate.Hours {
				t.Fatalf("estimate map todos=%d hours=%v", plan.Todos, plan.Hours)
			}
			if len(plan.Conflicts) != len(b.ConflictPlains()) {
				t.Fatalf("conflicts map %d vs %d", len(plan.Conflicts), len(b.ConflictPlains()))
			}
			if tc.wantClass != "" && b.Class != tc.wantClass {
				t.Fatalf("class=%q want %q", b.Class, tc.wantClass)
			}
			if tc.wantLow && !b.LowConfidence() {
				t.Fatal("want low confidence")
			}
			if tc.wantConflict && len(plan.Conflicts) == 0 {
				t.Fatal("want plan conflicts")
			}
			raw, err := json.Marshal(b)
			if err != nil {
				t.Fatal(err)
			}
			var round Bundle
			if err := json.Unmarshal(raw, &round); err != nil {
				t.Fatal(err)
			}
			if round.Class != b.Class || round.Estimate.Todos != b.Estimate.Todos {
				t.Fatalf("json roundtrip %#v", round)
			}
		})
	}
}
