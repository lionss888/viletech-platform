package formpayment

import "time"

const (
	PaymentMethodPayFromExport = "PAY_FROM_EXPORT"
	PostpayLegacy              = "LEGACY"
	PostpayFixedRate           = "POSTPAY_FIXED_RATE"
	PostpayRateOnProvider      = "POSTPAY_RATE_ON_PP"
)

type Form struct {
	ID                     string     `json:"id"`
	AccountID              string     `json:"account_id"`
	OrganizationID         string     `json:"organization_id"`
	OnBehalfOrganizationID string     `json:"on_behalf_organization_id,omitempty"`
	ProviderID             string     `json:"provider_id,omitempty"`
	AgentID                string     `json:"agent_id,omitempty"`
	ManagerID              string     `json:"manager_id,omitempty"`
	CounterpartyID         string     `json:"counterparty_id,omitempty"`
	ContractID             string     `json:"contract_id,omitempty"`
	ActiveOrderID          string     `json:"active_order_id,omitempty"`
	Status                 Status     `json:"status"`
	PrevStatus             Status     `json:"prev_status,omitempty"`
	Direction              Direction  `json:"direction"`
	Kind                   Kind       `json:"kind"`
	PaymentMethod          string     `json:"payment_method,omitempty"`
	PlatformPostpayMode    string     `json:"platform_postpay_mode,omitempty"`
	SignMethod             string     `json:"sign_method,omitempty"`
	RateOnProvider         bool       `json:"rate_on_provider"`
	NoDocuments            bool       `json:"no_documents"`
	Important              bool       `json:"important"`
	ClientAgreedProvider   bool       `json:"client_agreed_provider"`
	ExecutionDeadline      *time.Time `json:"execution_deadline,omitempty"`
	ConfirmationHash       string     `json:"confirmation_hash,omitempty"`
	ConfirmationFileID     string     `json:"confirmation_file_id,omitempty"`
	ContractNumber         string     `json:"contract_number,omitempty"`
	ContractDate           string     `json:"contract_date,omitempty"`
	InvoiceJSON            string     `json:"invoice_json,omitempty"`
	DocsJSON               string     `json:"docs_json,omitempty"`
	Rate                   Rate       `json:"rate"`
	Commission             Commission `json:"commission"`
	InvoiceAmount          string     `json:"invoice_amount,omitempty"`
	Currency               string     `json:"currency,omitempty"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
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
	ID            string `json:"id"`
	FormPaymentID string `json:"form_payment_id"`
	Type          string `json:"type"`
	StorageKey    string `json:"storage_key"`
	ContentHash   string `json:"content_hash,omitempty"`
}

type ComplianceHistoryEntry struct {
	ID            string    `json:"id"`
	FormPaymentID string    `json:"form_payment_id"`
	ActorID       string    `json:"actor_id"`
	FromStatus    Status    `json:"from_status"`
	ToStatus      Status    `json:"to_status"`
	Comment       string    `json:"comment,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}
