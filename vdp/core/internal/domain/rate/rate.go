package rate

import (
	"math"
	"strconv"
	"strings"
)

const RatePrecision = 10000.0

// ValueSource mirrors Nest RateValueSource.
type ValueSource string

const (
	SourceManual       ValueSource = "manual"
	SourceOpenExchange ValueSource = "openexchange"
	SourceCBR          ValueSource = "cbr"
	SourceCalculated   ValueSource = "calculated"
)

// RewardMode is Nest same_for_all | by_amount.
type RewardMode string

const (
	RewardSameForAll RewardMode = "same_for_all"
	RewardByAmount   RewardMode = "by_amount"
)

// Settings is account rate/commission config (bank markup hook for R10).
type Settings struct {
	CurrencyScope string    `json:"currency_scope"` // "all" or currency code
	RateSource    string    `json:"rate_source"`    // openexchange|cbr
	MarkupBps     int       `json:"markup_bps"`     // optional deal markup
	BankReadonly  bool      `json:"bank_readonly"`  // R10 bank client flag hook
	Reward        RewardCfg `json:"reward"`
}

type RewardCfg struct {
	Mode       RewardMode  `json:"mode"`
	SameForAll *RewardFlat `json:"same_for_all,omitempty"`
	Tiers      []TierBlock `json:"tiers,omitempty"`
}

type RewardFlat struct {
	FeePercentBps int `json:"fee_percent_bps"`
	FeeFixMinor   int `json:"fee_fix_minor"`
}

type TierBlock struct {
	ThresholdMinor int         `json:"threshold_minor"`
	Above          *RewardFlat `json:"above,omitempty"`
}

// MarketQuote is a stub FX quote (real providers in R10/hub).
type MarketQuote struct {
	From   string
	To     string
	Value  float64
	Source ValueSource
}

// ResolvedDealRate is Nest IResolvedDealRate.
type ResolvedDealRate struct {
	BackendRate  float64     `json:"backend_rate"`
	FrontendRate float64     `json:"frontend_rate"`
	RateSource   ValueSource `json:"rate_source"`
	CoverAmount  float64     `json:"cover_amount,omitempty"`
	MarkupBps    int         `json:"markup_bps,omitempty"`
	BankReadonly bool        `json:"bank_readonly,omitempty"`
}

// CommissionResult is Nest ICommissionResult (major units for form storage).
type CommissionResult struct {
	FeePercentBps int     `json:"fee_percent_bps"`
	FeeFixMinor   int     `json:"fee_fix_minor"`
	FeeAmount     float64 `json:"fee_amount"`
	FeePercent    string  `json:"fee_percent"`
	FeeCurrency   string  `json:"fee_currency"`
	TierThreshold int     `json:"tier_threshold_minor,omitempty"`
}

// ResolveDealRate applies Nest semantics: override → market → same/cross + markup + bank flag.
func ResolveDealRate(clientCurrency, counterpartyCurrency string, override *float64, settings *Settings, quote *MarketQuote, amountMajor float64) (ResolvedDealRate, error) {
	clientCurrency = strings.ToLower(strings.TrimSpace(clientCurrency))
	counterpartyCurrency = strings.ToLower(strings.TrimSpace(counterpartyCurrency))
	isCross := clientCurrency != "" && counterpartyCurrency != "" && clientCurrency != counterpartyCurrency
	bankRO := settings != nil && settings.BankReadonly
	markup := 0
	if settings != nil {
		markup = settings.MarkupBps
	}

	if override != nil {
		backend := RoundRate(*override)
		frontend := 1.0
		if isCross {
			frontend = backend
		}
		backend = applyMarkup(backend, markup)
		out := ResolvedDealRate{
			BackendRate: backend, FrontendRate: RoundRate(frontend), RateSource: SourceManual,
			MarkupBps: markup, BankReadonly: bankRO,
		}
		out.CoverAmount = CalcCoverAmount(amountMajor, out.FrontendRate)
		return out, nil
	}

	backend := 1.0
	source := SourceCalculated
	if quote != nil && quote.Value > 0 {
		backend = RoundRate(quote.Value)
		if quote.Source != "" {
			source = quote.Source
		}
	} else if settings != nil && strings.EqualFold(settings.RateSource, "cbr") {
		source = SourceCBR
	} else {
		source = SourceOpenExchange
	}
	frontend := 1.0
	if isCross {
		frontend = backend
	}
	backend = applyMarkup(backend, markup)
	out := ResolvedDealRate{
		BackendRate: backend, FrontendRate: RoundRate(frontend), RateSource: source,
		MarkupBps: markup, BankReadonly: bankRO,
	}
	out.CoverAmount = CalcCoverAmount(amountMajor, out.FrontendRate)
	return out, nil
}

// CalculateCommission applies Nest flat/tier/bps with default 2.5%.
func CalculateCommission(amountMajor float64, currency string, settings *Settings) CommissionResult {
	currency = strings.ToUpper(strings.TrimSpace(currency))
	amountMinor := int(math.Round(amountMajor * 100))
	if settings == nil || settings.Reward.Mode == "" {
		return defaultCommission(amountMinor, currency)
	}
	reward := settings.Reward.SameForAll
	tierThreshold := 0
	if settings.Reward.Mode == RewardByAmount {
		tiers := normalizeTiers(settings.Reward.Tiers)
		if len(tiers) == 0 {
			return defaultCommission(amountMinor, currency)
		}
		selected := tiers[0]
		for _, t := range tiers {
			if amountMinor >= t.ThresholdMinor {
				selected = t
			} else {
				break
			}
		}
		tierThreshold = selected.ThresholdMinor
		reward = selected.Above
	}
	if reward == nil {
		return defaultCommission(amountMinor, currency)
	}
	percentFee := int(math.Round(float64(amountMinor*reward.FeePercentBps) / 10000.0))
	total := percentFee + reward.FeeFixMinor
	pct := float64(reward.FeePercentBps) / 100.0
	return CommissionResult{
		FeePercentBps: reward.FeePercentBps,
		FeeFixMinor:   reward.FeeFixMinor,
		FeeAmount:     float64(total) / 100.0,
		FeePercent:    formatFloat(pct),
		FeeCurrency:   currency,
		TierThreshold: tierThreshold,
	}
}

func defaultCommission(amountMinor int, currency string) CommissionResult {
	const bps = 250
	fee := int(math.Round(float64(amountMinor*bps) / 10000.0))
	return CommissionResult{
		FeePercentBps: bps,
		FeeAmount:     float64(fee) / 100.0,
		FeePercent:    "2.5",
		FeeCurrency:   currency,
	}
}

func CalcCoverAmount(amountMajor, frontendRate float64) float64 {
	if frontendRate <= 0 {
		return 0
	}
	return math.Round(amountMajor*frontendRate*100) / 100
}

func RoundRate(v float64) float64 {
	return math.Round(v*RatePrecision) / RatePrecision
}

func applyMarkup(rate float64, markupBps int) float64 {
	if markupBps == 0 {
		return rate
	}
	return RoundRate(rate * (1 + float64(markupBps)/10000.0))
}

func normalizeTiers(tiers []TierBlock) []TierBlock {
	if len(tiers) == 0 {
		return nil
	}
	out := make([]TierBlock, len(tiers))
	copy(out, tiers)
	for i := 0; i < len(out); i++ {
		for j := i + 1; j < len(out); j++ {
			if out[j].ThresholdMinor < out[i].ThresholdMinor {
				out[i], out[j] = out[j], out[i]
			}
		}
	}
	if out[0].ThresholdMinor > 0 {
		out = append([]TierBlock{{ThresholdMinor: 0, Above: out[0].Above}}, out...)
	}
	return out
}

func formatFloat(v float64) string {
	return strconv.FormatFloat(v, 'f', -1, 64)
}

// ParseMajor parses money string to major units.
func ParseMajor(s string) (float64, error) {
	s = strings.TrimSpace(strings.ReplaceAll(s, ",", "."))
	if s == "" {
		return 0, nil
	}
	return strconv.ParseFloat(s, 64)
}

// PickSettings selects Nest currency-scoped settings.
func PickSettings(all []Settings, counterpartyCurrency, clientCurrency string) *Settings {
	if len(all) == 0 {
		return nil
	}
	cp := strings.ToLower(counterpartyCurrency)
	cl := strings.ToLower(clientCurrency)
	var allScope *Settings
	for i := range all {
		scope := strings.ToLower(all[i].CurrencyScope)
		if scope == "all" {
			allScope = &all[i]
			continue
		}
		if scope == cp || scope == cl {
			return &all[i]
		}
	}
	return allScope
}
