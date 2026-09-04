package domain

type Role string

const (
	RoleViewer               Role = "viewer"
	RoleDeployerAlphaPreview Role = "deployer-alpha-preview"
	RoleDeployerBeta         Role = "deployer-beta"
	RoleDeployerGamma        Role = "deployer-gamma"
	RolePolicyAdmin          Role = "policy-admin"
)

type Environment string

const (
	EnvAlpha   Environment = "alpha"
	EnvBeta    Environment = "beta"
	EnvGamma   Environment = "gamma"
	EnvDemo    Environment = "demo"
	EnvTest    Environment = "test"
	EnvPreview Environment = "preview"
)

type Action string

const (
	ActionListReleases    Action = "listReleases"
	ActionGetEnvironment  Action = "getEnvironment"
	ActionPromote         Action = "promote"
	ActionRollback        Action = "rollback"
	ActionSetSchedule     Action = "setSchedule"
	ActionSetApprovers    Action = "setApprovers"
)

type Identity struct {
	Subject string
	Role    Role
	Issuer  string
}

type Release struct {
	Tag         string
	Title       string
	ImagesRunID string
	Revision    string
	IsProduct   bool
}

type EnvironmentState struct {
	Name        Environment
	DigestTag   string
	Mode        string
	Approvers   []string
	LastRunID   string
	Status      string
	DisableHint string
}

type PromoteCommand struct {
	Environment Environment
	ImagesRunID string
	Tag         string
}

func (e Environment) NamedSlot() bool {
	switch e {
	case EnvAlpha, EnvBeta, EnvGamma, EnvDemo, EnvTest, EnvPreview:
		return true
	default:
		return false
	}
}

func IsProductTag(tag string) bool {
	return len(tag) >= 5 && tag[:5] == "vdp-v"
}
