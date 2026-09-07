package systemcap

// Capability is a platform/system right (not form-process business capability).
type Capability string

const (
	CapAccountsManage     Capability = "accounts.manage"
	CapDirectoriesManage  Capability = "directories.manage"
	CapFormsAdmin         Capability = "forms.admin"
	CapProcessRolesManage Capability = "process_roles.manage"
	CapSystemAdmin        Capability = "system.admin"
)

// All returns the fixed system capability catalog.
func All() []Capability {
	return []Capability{
		CapAccountsManage,
		CapDirectoriesManage,
		CapFormsAdmin,
		CapProcessRolesManage,
		CapSystemAdmin,
	}
}

// LockedForRoot cannot be removed from root/admin templates or overrides.
func LockedForRoot() []Capability {
	return []Capability{CapAccountsManage, CapProcessRolesManage, CapSystemAdmin}
}

func IsKnown(c Capability) bool {
	for _, known := range All() {
		if known == c {
			return true
		}
	}
	return false
}

func Contains(list []Capability, want Capability) bool {
	for _, c := range list {
		if c == want {
			return true
		}
	}
	return false
}

// EnsureLockedRoot merges locked root system caps into the list.
func EnsureLockedRoot(caps []Capability) []Capability {
	out := append([]Capability(nil), caps...)
	for _, locked := range LockedForRoot() {
		if !Contains(out, locked) {
			out = append(out, locked)
		}
	}
	return out
}
