package formpayment_test

import (
	"testing"

	"github.com/viletech/vdp/core/internal/domain/formpayment"
)

func TestScrubDocsJSONForProvider(t *testing.T) {
	t.Parallel()
	raw := formpayment.EncodeDocRefs([]formpayment.DocFileRef{
		{FileID: "inv", Kind: "invoice", Label: "Invoice"},
		{FileID: "ag", Kind: "contract", Label: "Agency"},
		{FileID: "pay", Kind: "payment", Label: "Slip"},
	}, nil)
	scrubbed := formpayment.ScrubDocsJSONForProvider(raw)
	refs := formpayment.ParseDocRefs(scrubbed)
	if len(refs) != 2 {
		t.Fatalf("want 2 deal docs, got %d (%s)", len(refs), scrubbed)
	}
	for _, ref := range refs {
		if formpayment.IsAgencyContractDocKind(ref.Kind, ref.Label) {
			t.Fatalf("agency leaked: %+v", ref)
		}
	}
}

func TestScrubFormForProviderClearsInvoiceJSON(t *testing.T) {
	t.Parallel()
	form := formpayment.Form{InvoiceJSON: `{"passport":"x"}`, DocsJSON: formpayment.EncodeDocRefs([]formpayment.DocFileRef{
		{FileID: "c", Kind: "contract"},
	}, nil)}
	out := formpayment.ScrubFormForProvider(form)
	if out.InvoiceJSON != "" {
		t.Fatal("invoice_json must be cleared")
	}
	if len(formpayment.ParseDocRefs(out.DocsJSON)) != 0 {
		t.Fatal("contract must be scrubbed")
	}
}
