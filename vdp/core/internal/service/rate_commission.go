package service

import (
	"context"
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/domain/rate"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

// ResolveAndSetRate applies Nest rate semantics and persists form.Rate.
func (s *FormPaymentService) ResolveAndSetRate(ctx context.Context, principal authz.Principal, formID string, override *float64, clientCurrency, counterpartyCurrency string, market *rate.MarketQuote) (formpayment.Form, rate.ResolvedDealRate, error) {
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, rate.ResolvedDealRate{}, err
	}
	if err := authz.RequireRoles(principal, domain.RoleUser, domain.RoleManager, domain.RoleTreasurer, domain.RoleRoot); err != nil {
		return formpayment.Form{}, rate.ResolvedDealRate{}, err
	}
	if clientCurrency == "" {
		clientCurrency = "rub"
	}
	if counterpartyCurrency == "" {
		counterpartyCurrency = form.Currency
	}
	settings := s.accountRateSettings(ctx, form.AccountID, counterpartyCurrency, clientCurrency)
	if form.Channel == formpayment.ChannelBank {
		if org, err := s.store.OrganizationByID(ctx, form.OrganizationID); err == nil && !org.ApplyPlatformMarkup {
			if settings == nil {
				settings = &rate.Settings{BankReadonly: true, CurrencyScope: "all"}
			} else {
				settings.BankReadonly = true
			}
		}
	}
	amount, _ := rate.ParseMajor(form.InvoiceAmount)
	resolved, err := rate.ResolveDealRate(clientCurrency, counterpartyCurrency, override, settings, market, amount)
	if err != nil {
		return formpayment.Form{}, rate.ResolvedDealRate{}, err
	}
	if settings != nil && settings.BankReadonly && override != nil && principal.Role == domain.RoleUser {
		return formpayment.Form{}, rate.ResolvedDealRate{}, apperrors.New(apperrors.ErrCodeForbidden, "bank rate is readonly")
	}
	form.Rate = formpayment.Rate{
		Value:    strconv.FormatFloat(resolved.BackendRate, 'f', -1, 64),
		Currency: strings.ToUpper(counterpartyCurrency),
		Source:   string(resolved.RateSource),
	}
	form.UpdatedAt = time.Now().UTC()
	if err := s.store.SaveForm(ctx, form); err != nil {
		return formpayment.Form{}, rate.ResolvedDealRate{}, err
	}
	s.maybeAutoEnqueuePOG(ctx, principal, form)
	return form, resolved, nil
}

// CalculateAndApplyCommission uses Nest commission settings (tiers/bps) or percent override.
func (s *FormPaymentService) CalculateAndApplyCommission(ctx context.Context, principal authz.Principal, formID, percentOverride string) (formpayment.Form, rate.CommissionResult, error) {
	form, err := s.Get(ctx, principal, formID)
	if err != nil {
		return formpayment.Form{}, rate.CommissionResult{}, err
	}
	amount, err := rate.ParseMajor(form.InvoiceAmount)
	if err != nil {
		return formpayment.Form{}, rate.CommissionResult{}, apperrors.New(apperrors.ErrCodeValidation, "invalid invoice amount")
	}
	var result rate.CommissionResult
	if percentOverride != "" {
		legacy, err := CalculateCommission(form.InvoiceAmount, percentOverride, form.Currency)
		if err != nil {
			return formpayment.Form{}, rate.CommissionResult{}, apperrors.New(apperrors.ErrCodeValidation, err.Error())
		}
		bps := 0
		if p, perr := strconv.ParseFloat(strings.ReplaceAll(percentOverride, ",", "."), 64); perr == nil {
			bps = int(p * 100)
		}
		feeAmt, _ := strconv.ParseFloat(legacy.FeeAmount, 64)
		result = rate.CommissionResult{
			FeePercentBps: bps, FeeAmount: feeAmt, FeePercent: percentOverride, FeeCurrency: form.Currency,
		}
		form, err = s.SetCommission(ctx, principal, formID, legacy)
		return form, result, err
	}
	settings := s.accountRateSettings(ctx, form.AccountID, form.Currency, "rub")
	result = rate.CalculateCommission(amount, form.Currency, settings)
	commission := formpayment.Commission{
		FeeAmount:   strconv.FormatFloat(result.FeeAmount, 'f', 2, 64),
		FeePercent:  result.FeePercent,
		FeeCurrency: result.FeeCurrency,
	}
	form, err = s.SetCommission(ctx, principal, formID, commission)
	return form, result, err
}

func (s *FormPaymentService) accountRateSettings(ctx context.Context, accountID, counterpartyCurrency, clientCurrency string) *rate.Settings {
	account, err := s.store.AccountByID(ctx, accountID)
	if err != nil {
		return nil
	}
	var all []rate.Settings
	if account.RateSettingsJSON != "" {
		_ = json.Unmarshal([]byte(account.RateSettingsJSON), &all)
	}
	picked := rate.PickSettings(all, counterpartyCurrency, clientCurrency)
	if picked == nil && account.BankRateReadonly {
		picked = &rate.Settings{BankReadonly: true, CurrencyScope: "all"}
	} else if picked != nil {
		picked.BankReadonly = picked.BankReadonly || account.BankRateReadonly
	}
	return picked
}
