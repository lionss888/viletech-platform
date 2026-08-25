package domain

type OrganizationStatus string

const (
	OrgNotApproved        OrganizationStatus = "not_approved"
	OrgApproved           OrganizationStatus = "approved"
	OrgBlocked            OrganizationStatus = "blocked"
	OrgAwaitingProcessing OrganizationStatus = "awaiting_processing"
)

type ClientRating string

const (
	RatingNone   ClientRating = ""
	RatingRed    ClientRating = "red"
	RatingYellow ClientRating = "yellow"
)

type Organization struct {
	ID        string
	AccountID string
	Status    OrganizationStatus
	IsActive  bool
	Blocked   bool
	Rating    ClientRating
	INN       string
	Name      string
	Country   string
	FieldsFrozen bool
}

func (o Organization) IsClientActive() bool {
	return o.Status == OrgApproved && o.IsActive && !o.Blocked
}
