package formpayment

import "strings"

// IsAgencyContractDocKind reports docs that must not be shown to provider.
func IsAgencyContractDocKind(kind, label string) bool {
	k := strings.ToLower(strings.TrimSpace(kind))
	if k == "contract" || k == "agency" || k == "agency_contract" || k == "subagency" {
		return true
	}
	l := strings.ToLower(strings.TrimSpace(label))
	return strings.Contains(l, "агентск") || strings.Contains(l, "agency")
}

// ScrubDocsJSONForProvider drops agency/contract refs; keeps deal docs (invoice, order, payment, …).
func ScrubDocsJSONForProvider(raw string) string {
	refs := ParseDocRefs(raw)
	kept := make([]DocFileRef, 0, len(refs))
	for _, ref := range refs {
		if IsAgencyContractDocKind(ref.Kind, ref.Label) {
			continue
		}
		kept = append(kept, ref)
	}
	return EncodeDocRefs(kept, nil)
}

// ScrubFormForProvider returns a copy safe for provider list/get (no agency docs, no invoice_json dump).
func ScrubFormForProvider(form Form) Form {
	out := form
	out.DocsJSON = ScrubDocsJSONForProvider(form.DocsJSON)
	out.InvoiceJSON = ""
	return out
}
