package domain

// AccountKind is the global account type: product participant vs platform administrator.
type AccountKind string

const (
	AccountKindUser  AccountKind = "user"
	AccountKindAdmin AccountKind = "admin"
)

// KindForRole maps a typed role to AccountKind for migration and defaults.
func KindForRole(role Role) AccountKind {
	if role == RoleRoot {
		return AccountKindAdmin
	}
	return AccountKindUser
}

// RoleAllowedForKind reports whether the typed role may be assigned under kind.
func RoleAllowedForKind(kind AccountKind, role Role) bool {
	switch kind {
	case AccountKindAdmin:
		return role == RoleRoot
	case AccountKindUser:
		return role != RoleRoot && role != ""
	default:
		return false
	}
}

func ParseAccountKind(value string) (AccountKind, bool) {
	kind := AccountKind(value)
	switch kind {
	case AccountKindUser, AccountKindAdmin:
		return kind, true
	default:
		return "", false
	}
}
