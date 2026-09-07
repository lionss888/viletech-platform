package formpayment_test

import (
	"testing"

	"github.com/viletech/vdp/core/internal/domain/formpayment"
)

func TestCapabilitiesCatalogCoversAll(t *testing.T) {
	t.Parallel()
	catalog := formpayment.CapabilitiesCatalog()
	if len(catalog) != len(formpayment.AllCapabilities()) {
		t.Fatalf("catalog=%d all=%d", len(catalog), len(formpayment.AllCapabilities()))
	}
	for _, cap := range formpayment.AllCapabilities() {
		found := false
		for _, entry := range catalog {
			if entry.ID == cap && entry.Title != "" && entry.Description != "" {
				found = true
				break
			}
		}
		if !found {
			t.Fatalf("missing human label for %s", cap)
		}
	}
}
