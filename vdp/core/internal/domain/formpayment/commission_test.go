package formpayment_test

import (
	"testing"

	"github.com/viletech/vdp/core/internal/domain/formpayment"
)

func TestNormalizeAndComputeRewardModes(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name    string
		invoice string
		in      formpayment.Commission
		wantAmt string
		wantMode string
		wantFix string
		wantPct string
		wantErr bool
	}{
		{
			name: "fixed_explicit",
			invoice: "1000",
			in: formpayment.Commission{RewardMode: formpayment.RewardModeFixed, FeeFix: "50", FeeCurrency: "USD"},
			wantAmt: "50.00", wantMode: formpayment.RewardModeFixed, wantFix: "50",
		},
		{
			name: "fixed_legacy_fee_amount",
			invoice: "1000",
			in: formpayment.Commission{FeeAmount: "75.5", FeeCurrency: "USD"},
			wantAmt: "75.50", wantMode: formpayment.RewardModeFixed, wantFix: "75.5",
		},
		{
			name: "percent_explicit",
			invoice: "1000",
			in: formpayment.Commission{RewardMode: formpayment.RewardModePercent, FeePercent: "1.5", FeeCurrency: "USD"},
			wantAmt: "15.00", wantMode: formpayment.RewardModePercent, wantPct: "1.5",
		},
		{
			name: "percent_legacy_only_percent",
			invoice: "2000",
			in: formpayment.Commission{FeePercent: "2", FeeCurrency: "USD"},
			wantAmt: "40.00", wantMode: formpayment.RewardModePercent, wantPct: "2",
		},
		{
			name: "percent_plus_fixed",
			invoice: "1000",
			in: formpayment.Commission{
				RewardMode: formpayment.RewardModePercentPlusFixed,
				FeePercent: "1.5", FeeFix: "10", FeeCurrency: "USD",
			},
			wantAmt: "25.00", wantMode: formpayment.RewardModePercentPlusFixed, wantFix: "10.00", wantPct: "1.5",
		},
		{
			name: "percent_plus_fixed_inferred",
			invoice: "1000",
			in: formpayment.Commission{FeePercent: "1", FeeFix: "5", FeeCurrency: "USD"},
			wantAmt: "15.00", wantMode: formpayment.RewardModePercentPlusFixed, wantFix: "5.00", wantPct: "1",
		},
		{
			name: "fixed_missing_fields",
			invoice: "1000",
			in: formpayment.Commission{RewardMode: formpayment.RewardModeFixed, FeeCurrency: "USD"},
			wantErr: true,
		},
		{
			name: "percent_missing_fields",
			invoice: "1000",
			in: formpayment.Commission{RewardMode: formpayment.RewardModePercent, FeeCurrency: "USD"},
			wantErr: true,
		},
		{
			name: "percent_plus_fixed_missing_fix",
			invoice: "1000",
			in: formpayment.Commission{RewardMode: formpayment.RewardModePercentPlusFixed, FeePercent: "1", FeeCurrency: "USD"},
			wantErr: true,
		},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got, err := tc.in.NormalizeAndCompute(tc.invoice)
			if tc.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if got.FeeAmount != tc.wantAmt {
				t.Fatalf("fee_amount=%q want %q", got.FeeAmount, tc.wantAmt)
			}
			if got.RewardMode != tc.wantMode {
				t.Fatalf("reward_mode=%q want %q", got.RewardMode, tc.wantMode)
			}
			if tc.wantFix != "" && got.FeeFix != tc.wantFix {
				t.Fatalf("fee_fix=%q want %q", got.FeeFix, tc.wantFix)
			}
			if tc.wantPct != "" && got.FeePercent != tc.wantPct {
				t.Fatalf("fee_percent=%q want %q", got.FeePercent, tc.wantPct)
			}
		})
	}
}
