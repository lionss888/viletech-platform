// Package rate resolves deal FX rates and commission reward amounts for form-payment.
//
// ResolveDealRate picks override vs settings vs market quote; CalculateCommission
// applies flat / percent / tier reward modes from catalog settings.
// Form-level Commission.NormalizeAndCompute (formpayment package) covers IMP3
// reward modes on the form itself (fixed / percent / percent_plus_fixed).
package rate
