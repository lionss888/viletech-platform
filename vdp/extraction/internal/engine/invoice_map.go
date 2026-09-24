package engine

import (
	"regexp"
	"strings"

	"github.com/viletech/vdp/shared/extraction"
)

var (
	reInvoiceAmount = regexp.MustCompile(`(?i)(?:invoice\s*)?(?:amount|total|sum|итого|сумма)[^\d]{0,24}(\d[\d\s]*[.,]\d{2}|\d[\d\s]{2,})`)
	reCurrency      = regexp.MustCompile(`\b(USD|EUR|GBP|CNY|RUB|CHF|JPY|AED|TRY)\b`)
	reInvoiceNo     = regexp.MustCompile(`(?i)(?:invoice\s*(?:no\.?|number|#)|invoice[- ]|inv\.?\s*#?|сч[её]т(?:-фактура)?\s*№?|№)\s*[:#]?\s*([A-Z0-9][-A-Z0-9/]{2,})`)
	reDateISO       = regexp.MustCompile(`\b(20\d{2}-\d{2}-\d{2})\b`)
	reDateEU        = regexp.MustCompile(`\b(\d{1,2}[./]\d{1,2}[./]20\d{2})\b`)
	reCompany       = regexp.MustCompile(`(?i:seller|vendor|продавец|поставщик|company\s*name)[:\s]+([A-ZА-Я][A-Za-zА-Яа-я0-9][^.\n]{1,60})`)
	reHsCode        = regexp.MustCompile(`(?i)(?:hs\s*code|тн\s*вэд|tn\s*ved|commodity\s*code)[^\d]{0,20}(\d{4,10})`)
)

// MapInvoiceText builds schema v1 from layout/OCR text with light heuristics.
func MapInvoiceText(in Input, text, engineID string) extraction.Result {
	if engineID == "" {
		engineID = "unknown"
	}
	r := extraction.Result{
		SchemaVersion: extraction.SchemaVersion,
		DocType:       "invoice",
		Confidence:    0.35,
		Header:        extraction.Header{},
		LineItems:     []extraction.LineItem{},
		Meta: extraction.Meta{
			EngineID:      engineID,
			ModelVersion:  engineID,
			FormPaymentID: in.FormPaymentID,
			EventID:       in.EventID,
			SourceFileID:  in.FileName,
		},
	}
	if m := reInvoiceAmount.FindStringSubmatch(text); len(m) > 1 {
		r.Header.InvoiceAmount = normalizeAmount(m[1])
	}
	if m := reCurrency.FindStringSubmatch(text); len(m) > 1 {
		r.Header.Currency = strings.ToUpper(m[1])
	}
	if m := reInvoiceNo.FindStringSubmatch(text); len(m) > 1 {
		r.Header.InvoiceNumber = strings.TrimSpace(m[1])
	}
	if m := reDateISO.FindStringSubmatch(text); len(m) > 1 {
		r.Header.InvoiceDate = m[1]
	} else if m := reDateEU.FindStringSubmatch(text); len(m) > 1 {
		r.Header.InvoiceDate = m[1]
	}
	if m := reCompany.FindStringSubmatch(text); len(m) > 1 {
		r.Header.CompanyName = strings.TrimSpace(m[1])
	}
	if m := reHsCode.FindStringSubmatch(text); len(m) > 1 {
		code := strings.TrimSpace(m[1])
		r.Header.HsCodes = []string{code}
	}
	if strings.TrimSpace(r.Header.InvoiceAmount) != "" ||
		strings.TrimSpace(r.Header.InvoiceNumber) != "" ||
		strings.TrimSpace(r.Header.CompanyName) != "" ||
		strings.TrimSpace(r.Header.Currency) != "" {
		r.Confidence = 0.72
	}
	layout := truncate(text, 1800)
	r.Warnings = []string{engineID + "_pilot", "layout:" + layout}
	r.Meta.ContentHash = extraction.ContentHash(r)
	return r
}

// MapDoclingText is MapInvoiceText with engine_id docling (compat).
func MapDoclingText(in Input, text string) extraction.Result {
	return MapInvoiceText(in, text, "docling")
}

func normalizeAmount(raw string) string {
	s := strings.ReplaceAll(raw, " ", "")
	s = strings.ReplaceAll(s, ",", ".")
	return s
}
