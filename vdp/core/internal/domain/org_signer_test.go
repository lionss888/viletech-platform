package domain

import "testing"

func TestValidateOrgProfilePatch(t *testing.T) {
	t.Parallel()
	if err := ValidateOrgProfilePatch(OrgProfilePatch{BusinessForm: BusinessFormOOO}); err != nil {
		t.Fatalf("valid business form: %v", err)
	}
	if err := ValidateOrgProfilePatch(OrgProfilePatch{BusinessForm: "unknown"}); err == nil {
		t.Fatal("invalid business_form should fail")
	}
	if err := ValidateOrgProfilePatch(OrgProfilePatch{
		SignerPosition: SignerOther,
	}); err == nil {
		t.Fatal("signer other without other_position should fail")
	}
	if err := ValidateOrgProfilePatch(OrgProfilePatch{
		SignerPosition:      SignerOther,
		SignerOtherPosition: "Deputy",
	}); err != nil {
		t.Fatalf("signer other with position: %v", err)
	}
}
