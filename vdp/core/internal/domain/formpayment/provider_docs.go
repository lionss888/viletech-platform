package formpayment

import (
	"strings"

	"github.com/viletech/vdp/core/internal/domain"
)

// IsAgencyContractDocKind reports docs that must not be shown to provider.
func IsAgencyContractDocKind(kind, label string) bool {
	k := strings.ToLower(strings.TrimSpace(kind))
	if k == "contract" || k == "agency" || k == "agency_contract" || k == "subagency" {
		return true
	}
	l := strings.ToLower(strings.TrimSpace(label))
	return strings.Contains(l, "агентск") || strings.Contains(l, "agency")
}

// IsPIIDocKind reports docs containing client PII that must not be shown to provider.
func IsPIIDocKind(kind, label string) bool {
	k := strings.ToLower(strings.TrimSpace(kind))
	// Identity documents: passport, driver license, ID card, etc.
	if k == "identity" || k == "passport" || k == "id" || k == "driver_license" {
		return true
	}
	// Personal documents
	if k == "personal" || k == "private" {
		return true
	}
	l := strings.ToLower(strings.TrimSpace(label))
	// Check label for PII keywords
	piiKeywords := []string{"passport", "паспорт", "identity", "личн", "удостовер"}
	for _, kw := range piiKeywords {
		if strings.Contains(l, kw) {
			return true
		}
	}
	return false
}

// ScrubDocsJSONForProvider drops agency/contract refs and PII docs; keeps deal docs (invoice, order, payment, …).
func ScrubDocsJSONForProvider(raw string) string {
	refs := ParseDocRefs(raw)
	kept := make([]DocFileRef, 0, len(refs))
	for _, ref := range refs {
		// Filter out agency contracts
		if IsAgencyContractDocKind(ref.Kind, ref.Label) {
			continue
		}
		// Filter out PII documents (Phase 2 security hardening)
		if IsPIIDocKind(ref.Kind, ref.Label) {
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
	out.ReturnEpisode = form.ReturnEpisode.VisibleTo(domain.RoleProvider)
	return out
}
