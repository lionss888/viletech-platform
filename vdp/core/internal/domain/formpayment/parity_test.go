package formpayment

import "testing"

func TestAllImportTransitionKeysHaveTargets(t *testing.T) {
	t.Parallel()
	for from, targets := range transitionsImportForm {
		if len(targets) == 0 {
			t.Fatalf("empty targets for %s", from)
		}
		for _, to := range targets {
			if !IsAllowedTransition(from, to, DirectionImport, false) {
				t.Fatalf("%s -> %s", from, to)
			}
		}
	}
}

func TestNestPathActionMap(t *testing.T) {
	t.Parallel()
	cases := []struct {
		role, path string
		want       Action
	}{
		{"manager", "order/accept", ActionOrderAccept},
		{"provider", "payment/sent", ActionProviderSent},
		{"eco", "form/accept", ActionECOAccept},
		{"ico", "form/start", ActionICOStart},
		{"site", "cancel", ActionCancel},
	}
	for _, tc := range cases {
		got, ok := NestPathAction(tc.role, tc.path)
		if !ok || got != tc.want {
			t.Fatalf("%s|%s => %s ok=%v", tc.role, tc.path, got, ok)
		}
	}
}
