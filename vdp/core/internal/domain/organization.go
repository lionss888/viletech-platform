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

// ВИ client status labels (вводные): новый / активный / заблокированный / ожидающий обработки.
type ClientStatusLabel string

const (
	ClientStatusNew      ClientStatusLabel = "новый"
	ClientStatusActive   ClientStatusLabel = "активный"
	ClientStatusBlocked  ClientStatusLabel = "заблокированный"
	ClientStatusAwaiting ClientStatusLabel = "ожидающий_обработки"
)

type OrganizationType string

const (
	OrgTypeClient   OrganizationType = "client"
	OrgTypeProvider OrganizationType = "provider"
)

// ClientType distinguishes UI vs Bank API channel clients (расширение §5).
type ClientType string

const (
	ClientTypeUI   ClientType = "ui"
	ClientTypeBank ClientType = "bank"
)

type Organization struct {
	ID                     string             `json:"id"`
	AccountID              string             `json:"account_id"`
	Status                 OrganizationStatus `json:"status"`
	IsActive               bool               `json:"is_active"`
	Blocked                bool               `json:"blocked"`
	Rating                 ClientRating       `json:"rating,omitempty"`
	INN                    string             `json:"inn,omitempty"`
	Name                   string             `json:"name,omitempty"`
	Country                string             `json:"country,omitempty"`
	FieldsFrozen           bool               `json:"fields_frozen"`
	Type                   OrganizationType   `json:"type,omitempty"`
	OrganizationCardFileID string             `json:"organization_card_file_id,omitempty"`
	Subaccounts            []string           `json:"subaccounts,omitempty"`
	InvitedIDs             []string           `json:"invited_ids,omitempty"`
	// Bank client admin settings (§5.3)
	ClientType                 ClientType `json:"client_type,omitempty"`
	BankFixedCommissionPercent string     `json:"bank_fixed_commission_percent,omitempty"`
	ApplyPlatformMarkup        bool       `json:"apply_platform_markup,omitempty"`
	DefaultAgentID             string     `json:"default_agent_id,omitempty"`
	BankWebhookURL             string     `json:"bank_webhook_url,omitempty"`
	BankWebhookSecret          string     `json:"bank_webhook_secret,omitempty"`
}

func (o Organization) IsClientActive() bool {
	return o.Status == OrgApproved && o.IsActive && !o.Blocked
}

// ClientStatus maps Nest/vdp org state to ВИ labels.
func (o Organization) ClientStatus() ClientStatusLabel {
	if o.Status == OrgBlocked || o.Blocked {
		return ClientStatusBlocked
	}
	if o.Status == OrgAwaitingProcessing || o.Rating == RatingRed || o.Rating == RatingYellow {
		return ClientStatusAwaiting
	}
	if o.IsClientActive() {
		return ClientStatusActive
	}
	return ClientStatusNew
}
