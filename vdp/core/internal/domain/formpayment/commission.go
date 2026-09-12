package formpayment

import (
	"fmt"
	"strconv"
	"strings"
)

// Deal reward modes (§10.5): fixed / percent / percent + fixed.
const (
	RewardModeFixed            = "fixed"
	RewardModePercent          = "percent"
	RewardModePercentPlusFixed = "percent_plus_fixed"
)

// NormalizeAndCompute resolves reward mode (incl. legacy) and computes fee_amount.
// Validation: required fields for an explicit mode must be present (400 via caller).
func (c Commission) NormalizeAndCompute(invoiceAmount string) (Commission, error) {
	out := c
	if out.FeeCurrency == "" {
		out.FeeCurrency = "USD"
	}
	mode := strings.TrimSpace(out.RewardMode)
	if mode == "" {
		mode = inferRewardMode(out)
		out.RewardMode = mode
	}
	switch mode {
	case RewardModeFixed:
		fix := strings.TrimSpace(out.FeeFix)
		if fix == "" {
			fix = strings.TrimSpace(out.FeeAmount)
		}
		if fix == "" {
			return Commission{}, fmt.Errorf("fee_fix required for reward_mode=fixed")
		}
		if _, err := parseMajor(fix); err != nil {
			return Commission{}, fmt.Errorf("fee_fix: %w", err)
		}
		out.FeeFix = fix
		out.FeeAmount = formatMoney(fix)
		out.FeePercent = ""
		out.RewardMode = RewardModeFixed
		return out, nil
	case RewardModePercent:
		pct := strings.TrimSpace(out.FeePercent)
		if pct == "" {
			return Commission{}, fmt.Errorf("fee_percent required for reward_mode=percent")
		}
		inv, err := parseMajor(invoiceAmount)
		if err != nil {
			return Commission{}, fmt.Errorf("invoice_amount: %w", err)
		}
		p, err := parseMajor(pct)
		if err != nil {
			return Commission{}, fmt.Errorf("fee_percent: %w", err)
		}
		out.FeePercent = pct
		out.FeeFix = ""
		out.FeeAmount = formatMoney(strconv.FormatFloat(inv*p/100, 'f', 2, 64))
		out.RewardMode = RewardModePercent
		return out, nil
	case RewardModePercentPlusFixed:
		pct := strings.TrimSpace(out.FeePercent)
		fix := strings.TrimSpace(out.FeeFix)
		if pct == "" {
			return Commission{}, fmt.Errorf("fee_percent required for reward_mode=percent_plus_fixed")
		}
		if fix == "" {
			return Commission{}, fmt.Errorf("fee_fix required for reward_mode=percent_plus_fixed")
		}
		inv, err := parseMajor(invoiceAmount)
		if err != nil {
			return Commission{}, fmt.Errorf("invoice_amount: %w", err)
		}
		p, err := parseMajor(pct)
		if err != nil {
			return Commission{}, fmt.Errorf("fee_percent: %w", err)
		}
		f, err := parseMajor(fix)
		if err != nil {
			return Commission{}, fmt.Errorf("fee_fix: %w", err)
		}
		out.FeePercent = pct
		out.FeeFix = formatMoney(fix)
		out.FeeAmount = formatMoney(strconv.FormatFloat(inv*p/100+f, 'f', 2, 64))
		out.RewardMode = RewardModePercentPlusFixed
		return out, nil
	default:
		return Commission{}, fmt.Errorf("unknown reward_mode %q", mode)
	}
}

func inferRewardMode(c Commission) string {
	hasPct := strings.TrimSpace(c.FeePercent) != "" && strings.TrimSpace(c.FeePercent) != "0"
	hasFix := strings.TrimSpace(c.FeeFix) != ""
	hasAmt := strings.TrimSpace(c.FeeAmount) != "" && strings.TrimSpace(c.FeeAmount) != "0"
	if hasPct && hasFix {
		return RewardModePercentPlusFixed
	}
	if hasPct {
		return RewardModePercent
	}
	if hasFix || hasAmt {
		return RewardModeFixed
	}
	return RewardModePercent
}

func parseMajor(s string) (float64, error) {
	s = strings.TrimSpace(strings.ReplaceAll(s, ",", "."))
	if s == "" {
		return 0, fmt.Errorf("empty")
	}
	return strconv.ParseFloat(s, 64)
}

func formatMoney(s string) string {
	v, err := parseMajor(s)
	if err != nil {
		return strings.TrimSpace(s)
	}
	return strconv.FormatFloat(v, 'f', 2, 64)
}
