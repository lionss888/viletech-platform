package httpapi

import (
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
)

func parseDir(value string) formpayment.Direction {
	if value == string(formpayment.DirectionExport) {
		return formpayment.DirectionExport
	}
	return formpayment.DirectionImport
}

func parseKind(value string) formpayment.Kind {
	if value == string(formpayment.KindService) {
		return formpayment.KindService
	}
	return formpayment.KindGood
}

func parseAction(value string) formpayment.Action {
	return formpayment.Action(value)
}

func parseRate(value, currency, source string) formpayment.Rate {
	return formpayment.Rate{Value: value, Currency: currency, Source: source}
}

func parseCommission(amount, percent, currency string) formpayment.Commission {
	return formpayment.Commission{FeeAmount: amount, FeePercent: percent, FeeCurrency: currency}
}

func parseRating(value string) domain.ClientRating {
	switch domain.ClientRating(value) {
	case domain.RatingRed, domain.RatingYellow:
		return domain.ClientRating(value)
	default:
		return domain.RatingNone
	}
}
