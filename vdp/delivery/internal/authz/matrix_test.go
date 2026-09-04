package authz

import (
	"testing"

	"github.com/viletech/vdp/delivery/internal/domain"
)

func TestAllowedMatrix(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name   string
		role   domain.Role
		action domain.Action
		env    domain.Environment
		want   bool
	}{
		{"viewer lists", domain.RoleViewer, domain.ActionListReleases, domain.EnvAlpha, true},
		{"viewer cannot promote alpha", domain.RoleViewer, domain.ActionPromote, domain.EnvAlpha, false},
		{"alpha deployer promotes test", domain.RoleDeployerAlphaPreview, domain.ActionPromote, domain.EnvTest, true},
		{"alpha deployer blocked on beta", domain.RoleDeployerAlphaPreview, domain.ActionPromote, domain.EnvBeta, false},
		{"alpha deployer blocked on gamma", domain.RoleDeployerAlphaPreview, domain.ActionPromote, domain.EnvGamma, false},
		{"beta deployer promotes beta", domain.RoleDeployerBeta, domain.ActionPromote, domain.EnvBeta, true},
		{"beta deployer blocked on gamma", domain.RoleDeployerBeta, domain.ActionPromote, domain.EnvGamma, false},
		{"gamma deployer promotes gamma", domain.RoleDeployerGamma, domain.ActionPromote, domain.EnvGamma, true},
		{"gamma deployer rollback alpha", domain.RoleDeployerGamma, domain.ActionRollback, domain.EnvAlpha, true},
		{"policy sets schedule", domain.RolePolicyAdmin, domain.ActionSetSchedule, domain.EnvBeta, true},
		{"deployer cannot set approvers", domain.RoleDeployerGamma, domain.ActionSetApprovers, domain.EnvGamma, false},
		{"empty role denied", "", domain.ActionGetEnvironment, domain.EnvAlpha, false},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got := Allowed(tc.role, tc.action, tc.env)
			if got != tc.want {
				t.Fatalf("Allowed(%s,%s,%s)=%v want %v", tc.role, tc.action, tc.env, got, tc.want)
			}
		})
	}
}

func TestPromoteBlockedReasonGammaTag(t *testing.T) {
	t.Parallel()
	hint := PromoteBlockedReason(domain.RoleDeployerGamma, domain.EnvGamma, "sha-abc1234")
	if hint == "" {
		t.Fatal("expected gamma untagged promote to be blocked")
	}
	ok := PromoteBlockedReason(domain.RoleDeployerGamma, domain.EnvGamma, "vdp-v1.2.3")
	if ok != "" {
		t.Fatalf("product tag should pass policy, got %q", ok)
	}
}
