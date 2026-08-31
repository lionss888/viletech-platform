package rate_test

import (
	"testing"

	"github.com/viletech/vdp/core/internal/domain/rate"
)

func TestResolveDealRateOverrideAndMarkup(t *testing.T) {
	t.Parallel()
	override := 92.34567
	settings := &rate.Settings{MarkupBps: 100, BankReadonly: true} // +1%
	got, err := rate.ResolveDealRate("rub", "usd", &override, settings, nil, 1000)
	if err != nil {
		t.Fatal(err)
	}
	if got.RateSource != rate.SourceManual {
		t.Fatalf("source=%s", got.RateSource)
	}
	if got.BankReadonly != true {
		t.Fatal("bank flag")
	}
	// 92.3457 * 1.01 ≈ 93.2692
	if got.BackendRate < 93.26 || got.BackendRate > 93.28 {
		t.Fatalf("backend=%v", got.BackendRate)
	}
	if got.CoverAmount <= 0 {
		t.Fatal("cover")
	}
}

func TestCalculateCommissionDefaultAndTier(t *testing.T) {
	t.Parallel()
	def := rate.CalculateCommission(1000, "USD", nil)
	if def.FeeAmount != 25 || def.FeePercent != "2.5" {
		t.Fatalf("default=%#v", def)
	}
	settings := &rate.Settings{
		Reward: rate.RewardCfg{
			Mode: rate.RewardByAmount,
			Tiers: []rate.TierBlock{
				{ThresholdMinor: 0, Above: &rate.RewardFlat{FeePercentBps: 200}},
				{ThresholdMinor: 50000, Above: &rate.RewardFlat{FeePercentBps: 150, FeeFixMinor: 100}},
			},
		},
	}
	low := rate.CalculateCommission(100, "USD", settings) // 10000 minor
	if low.FeePercentBps != 200 {
		t.Fatalf("low tier %#v", low)
	}
	high := rate.CalculateCommission(600, "USD", settings) // 60000 minor
	if high.FeePercentBps != 150 || high.FeeFixMinor != 100 {
		t.Fatalf("high tier %#v", high)
	}
	if high.FeeAmount != 10 { // 1.5% of 600 = 9 + 1.00 fix = 10
		t.Fatalf("fee amount=%v", high.FeeAmount)
	}
}

func TestPickSettings(t *testing.T) {
	t.Parallel()
	all := []rate.Settings{
		{CurrencyScope: "all", RateSource: "cbr"},
		{CurrencyScope: "usd", RateSource: "openexchange", MarkupBps: 50},
	}
	got := rate.PickSettings(all, "USD", "RUB")
	if got == nil || got.MarkupBps != 50 {
		t.Fatalf("%#v", got)
	}
}
