package formpayment

import "time"

type Form struct {
	ID                string     `json:"id"`
	AccountID         string     `json:"account_id"`
	OrganizationID    string     `json:"organization_id"`
	ProviderID        string     `json:"provider_id,omitempty"`
	AgentID           string     `json:"agent_id,omitempty"`
	ManagerID         string     `json:"manager_id,omitempty"`
	Status            Status     `json:"status"`
	PrevStatus        Status     `json:"prev_status,omitempty"`
	Direction         Direction  `json:"direction"`
	Kind              Kind       `json:"kind"`
	RateOnProvider    bool       `json:"rate_on_provider"`
	ExecutionDeadline *time.Time `json:"execution_deadline,omitempty"`
	Rate              Rate       `json:"rate"`
	Commission        Commission `json:"commission"`
	InvoiceAmount     string     `json:"invoice_amount,omitempty"`
	Currency          string     `json:"currency,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type Rate struct {
	Value    string `json:"value"`
	Currency string `json:"currency"`
	Source   string `json:"source"`
}

type Commission struct {
	FeeAmount   string `json:"fee_amount"`
	FeePercent  string `json:"fee_percent"`
	FeeCurrency string `json:"fee_currency"`
}

type Document struct {
	ID            string
	FormPaymentID string
	Type          string
	StorageKey    string
	ContentHash   string
}

type ComplianceHistoryEntry struct {
	ID            string
	FormPaymentID string
	ActorID       string
	FromStatus    Status
	ToStatus      Status
	Comment       string
	CreatedAt     time.Time
}
