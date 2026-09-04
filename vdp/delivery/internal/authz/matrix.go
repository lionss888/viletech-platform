package authz

import "github.com/viletech/vdp/delivery/internal/domain"

func environmentsFor(role domain.Role) []domain.Environment {
	alphaPreview := []domain.Environment{domain.EnvAlpha, domain.EnvDemo, domain.EnvTest, domain.EnvPreview}
	switch role {
	case domain.RoleDeployerAlphaPreview:
		return alphaPreview
	case domain.RoleDeployerBeta:
		return append(append([]domain.Environment{}, alphaPreview...), domain.EnvBeta)
	case domain.RoleDeployerGamma, domain.RolePolicyAdmin:
		return append(append([]domain.Environment{}, alphaPreview...), domain.EnvBeta, domain.EnvGamma)
	default:
		return nil
	}
}

func containsEnv(list []domain.Environment, env domain.Environment) bool {
	for _, item := range list {
		if item == env {
			return true
		}
	}
	return false
}

// Allowed is the console AuthZ matrix. UI hiding a button is not sufficient.
func Allowed(role domain.Role, action domain.Action, env domain.Environment) bool {
	if role == "" {
		return false
	}
	switch action {
	case domain.ActionListReleases, domain.ActionGetEnvironment:
		return true
	case domain.ActionPromote, domain.ActionRollback:
		return containsEnv(environmentsFor(role), env)
	case domain.ActionSetSchedule, domain.ActionSetApprovers:
		return role == domain.RolePolicyAdmin
	default:
		return false
	}
}

func PromoteBlockedReason(role domain.Role, env domain.Environment, tag string) string {
	if !Allowed(role, domain.ActionPromote, env) {
		return "роль не может обновлять эту среду"
	}
	if env == domain.EnvGamma && !domain.IsProductTag(tag) {
		return "на gamma только тег vdp-v уже собранного обновления"
	}
	return ""
}
