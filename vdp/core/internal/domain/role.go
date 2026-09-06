package domain

type Role string

const (
	RoleRoot                      Role = "root"
	RoleUser                      Role = "user"
	RoleManager                   Role = "manager"
	RoleTreasurer                 Role = "treasurer"
	RoleProvider                  Role = "provider"
	RoleSeniorProvider            Role = "senior_provider"
	RoleComplianceOfficer         Role = "compliance_officer"
	RoleOneC                      Role = "one_c"
	RoleInternalComplianceOfficer Role = "internal_compliance_officer"
	RoleBank                      Role = "bank"
	RoleSales                     Role = "sales"
	RoleViewer                    Role = "viewer"
)

const RoleExternalComplianceOfficer = RoleComplianceOfficer

func ParseRole(value string) (Role, bool) {
	role := Role(value)
	switch role {
	case RoleRoot, RoleUser, RoleManager, RoleTreasurer, RoleProvider, RoleSeniorProvider,
		RoleComplianceOfficer, RoleOneC, RoleInternalComplianceOfficer, RoleBank,
		RoleSales, RoleViewer:
		return role, true
	case "external_compliance_officer":
		return RoleComplianceOfficer, true
	default:
		return "", false
	}
}

func (r Role) IsStaff() bool {
	return r == RoleRoot || r == RoleManager || r == RoleTreasurer ||
		r == RoleComplianceOfficer || r == RoleInternalComplianceOfficer
}
