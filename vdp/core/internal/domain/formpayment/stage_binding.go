package formpayment

import "github.com/viletech/vdp/core/internal/domain"

// StageID names a fixed methodology gate (not reorderable via admin).
type StageID string

const (
	StageUserIntake     StageID = "user_intake"
	StageOrgCompliance  StageID = "org_compliance"
	StageFormCompliance StageID = "form_compliance"
	StageManagerOps     StageID = "manager_ops"
	StageProviderPay    StageID = "provider_payment"
	StageTreasurer      StageID = "treasurer"
	StageReport         StageID = "report"
	StageShipment       StageID = "shipment"
	StageComplete       StageID = "complete"
)

// StageBinding ties a fixed process stage to default actor roles (methodology in code).
type StageBinding struct {
	Stage     StageID
	Actors    []domain.Role
	Mandatory bool
}

// StageBindings is the immutable process methodology map.
func StageBindings() []StageBinding {
	return []StageBinding{
		{Stage: StageUserIntake, Actors: []domain.Role{domain.RoleUser}, Mandatory: true},
		{Stage: StageOrgCompliance, Actors: []domain.Role{domain.RoleInternalComplianceOfficer}, Mandatory: true},
		{Stage: StageFormCompliance, Actors: []domain.Role{domain.RoleComplianceOfficer}, Mandatory: true},
		{Stage: StageManagerOps, Actors: []domain.Role{domain.RoleManager}, Mandatory: true},
		{Stage: StageProviderPay, Actors: []domain.Role{domain.RoleProvider, domain.RoleSeniorProvider}, Mandatory: true},
		{Stage: StageTreasurer, Actors: []domain.Role{domain.RoleTreasurer}, Mandatory: false},
		{Stage: StageReport, Actors: []domain.Role{domain.RoleManager, domain.RoleUser}, Mandatory: true},
		{Stage: StageShipment, Actors: []domain.Role{domain.RoleManager, domain.RoleUser}, Mandatory: true},
		{Stage: StageComplete, Actors: []domain.Role{domain.RoleManager}, Mandatory: true},
	}
}

// IsMandatoryProcessRole is true when the role is a required actor on a mandatory stage.
func IsMandatoryProcessRole(role domain.Role) bool {
	if role == domain.RoleRoot {
		return true
	}
	for _, b := range StageBindings() {
		if !b.Mandatory {
			continue
		}
		for _, actor := range b.Actors {
			if actor == role {
				return true
			}
		}
	}
	return false
}
