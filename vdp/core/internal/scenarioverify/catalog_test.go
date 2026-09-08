package scenarioverify

import (
	"testing"
)

func TestCatalogHasRequiredIDs(t *testing.T) {
	t.Parallel()
	want := []string{
		IDHappyPathToCompleted,
		IDEcoRejectResubmit,
		IDIcoOrgPendingApprove,
		IDManagerPaymentAssignProvider,
		IDProviderPaymentNoPII,
		IDBankChannelBadge,
		IDRootCancel,
		IDRefundSmoke,
		IDManagerHidesDrafts,
		IDDocPreviewVisible,
		IDHealthCore,
		IDContinuityManagerForm,
		IDManagerRejectCorrections,
		IDUserResubmitAfterReject,
		IDProviderReturnToManager,
		IDExtractionConfirmAmount,
		IDRateSetByManager,
	}
	for _, id := range want {
		id := id
		t.Run(id, func(t *testing.T) {
			t.Parallel()
			s, ok := ByID(id)
			if !ok {
				t.Fatalf("missing scenario %s", id)
			}
			if s.Title == "" || len(s.Steps) == 0 {
				t.Fatalf("scenario %s incomplete", id)
			}
		})
	}
}

func TestCatalogUIAndAPITags(t *testing.T) {
	t.Parallel()
	ui := IDsWithTag(TagUI)
	if len(ui) < 5 {
		t.Fatalf("expected several ui-tagged scenarios, got %v", ui)
	}
	api := IDsWithTag(TagAPI)
	if len(api) < 6 {
		t.Fatalf("expected several api-tagged scenarios, got %v", api)
	}
}

func TestAllowsMutatingRuns(t *testing.T) {
	t.Parallel()
	cases := []struct {
		env  string
		want bool
	}{
		{"development", true},
		{"local", true},
		{"alpha", true},
		{"demo", true},
		{"ci", true},
		{"gamma", false},
		{"prod", false},
		{"production", false},
		{"staging", false},
		{"beta", false},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.env, func(t *testing.T) {
			t.Parallel()
			if got := AllowsMutatingRuns(tc.env); got != tc.want {
				t.Fatalf("AllowsMutatingRuns(%q)=%v want %v", tc.env, got, tc.want)
			}
		})
	}
}

func TestResolveModeForcesDryRunOnProd(t *testing.T) {
	t.Parallel()
	if got := ResolveMode(ModeMutating, "prod"); got != ModeDryRun {
		t.Fatalf("got %s", got)
	}
	if got := ResolveMode("", "alpha"); got != ModeMutating {
		t.Fatalf("got %s", got)
	}
	if got := ResolveMode(ModeHealth, "prod"); got != ModeHealth {
		t.Fatalf("got %s", got)
	}
}
