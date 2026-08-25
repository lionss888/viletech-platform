package httpapi_test

import "testing"

// NestEndpointParity documents Nest controller bases mapped to vdp routes.
var nestEndpointParity = []struct {
	NestBase string
	VDPBase  string
	Role     string
}{
	{"form-payment", "/api/v1/site/form-payment", "user"},
	{"admin/manager/form-payment", "/api/v1/manager/form-payment", "manager"},
	{"admin/provider/form-payment", "/api/v1/provider/form-payment", "provider"},
	{"admin/compliance-officer/form-payment", "/api/v1/eco/form-payment", "compliance_officer"},
	{"admin/internal-compliance-officer/form-payment", "/api/v1/ico/form-payment", "internal_compliance_officer"},
	{"admin/treasurer/form-payment", "/api/v1/treasurer/form-payment", "treasurer"},
	{"admin/form-payment", "/api/v1/admin/form-payment", "root"},
	{"1c/form-payment", "/api/v1/1c/form-payment", "one_c"},
	{"organization", "/api/v1/organizations", "user"},
	{"admin/internal-compliance-officer/organization", "/api/v1/admin/internal-compliance-officer/organization", "internal_compliance_officer"},
	{"contract", "/api/v1/contracts", "user"},
	{"counterparty", "/api/v1/counterparties", "any"},
	{"comment", "/api/v1/comments", "user"},
	{"file-store", "/api/v1/file-store", "user"},
	{"liquidity", "/api/v1/liquidity", "manager"},
	{"virtual-account", "/api/v1/virtual-accounts", "user"},
}

func TestNestEndpointParityMatrixNonEmpty(t *testing.T) {
	t.Parallel()
	if len(nestEndpointParity) < 10 {
		t.Fatal("parity matrix too small")
	}
	for _, row := range nestEndpointParity {
		if row.NestBase == "" || row.VDPBase == "" {
			t.Fatalf("%#v", row)
		}
	}
}
