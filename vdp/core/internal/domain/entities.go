package domain

import "time"

// ContractType matches расширение вводных §1.2.
type ContractType string

const (
	ContractTypeAgency    ContractType = "agency"
	ContractTypeSubagency ContractType = "subagency"
	ContractTypeServices  ContractType = "services"
)

// ContractEntityStatus is status of the contract document (not form CONTRACT_*).
type ContractEntityStatus string

const (
	ContractStatusCreated     ContractEntityStatus = "created"
	ContractStatusPending     ContractEntityStatus = "pending"
	ContractStatusAccepted    ContractEntityStatus = "accepted"
	ContractStatusRejected    ContractEntityStatus = "rejected"
	ContractStatusDeactivated ContractEntityStatus = "deactivated"
)

// Contract is agency/subagency/services agreement with audit history.
type Contract struct {
	ID             string               `json:"id"`
	Type           ContractType         `json:"type"`
	OrganizationID string               `json:"organization_id,omitempty"`
	AccountRef     string               `json:"account_ref,omitempty"` // services: account not org
	AgentID        string               `json:"agent_id,omitempty"`
	TemplateID     string               `json:"template_id,omitempty"`
	IsTemplate     bool                 `json:"is_template"`
	Status         ContractEntityStatus `json:"status"`
	UploadedBy     string               `json:"uploaded_by,omitempty"`
	FileID         string               `json:"file_id,omitempty"`
	Number         string               `json:"number,omitempty"`
	Date           string               `json:"date,omitempty"`
	RejectText     string               `json:"reject_text,omitempty"`
	HistoryJSON    string               `json:"history_json,omitempty"`
	CreatedAt      time.Time            `json:"created_at"`
	UpdatedAt      time.Time            `json:"updated_at"`
}

type ContractHistoryEntry struct {
	At       time.Time `json:"at"`
	ActorID  string    `json:"actor_id"`
	Action   string    `json:"action"`
	From     string    `json:"from,omitempty"`
	To       string    `json:"to,omitempty"`
	Comment  string    `json:"comment,omitempty"`
}

type CounterpartyApprovalStatus string

const (
	CounterpartyApprovalPending  CounterpartyApprovalStatus = "pending"
	CounterpartyApprovalApproved CounterpartyApprovalStatus = "approved"
	CounterpartyApprovalRejected CounterpartyApprovalStatus = "rejected"
)

type Counterparty struct {
	ID                   string                     `json:"id"`
	CreatedBy            string                     `json:"created_by"`
	Name                 string                     `json:"name"`
	Country              string                     `json:"country,omitempty"`
	INN                  string                     `json:"inn,omitempty"`
	Banks                string                     `json:"banks,omitempty"`
	FormPaymentIDs       []string                   `json:"form_payment_ids,omitempty"`
	LastApprovalStatus   CounterpartyApprovalStatus `json:"last_approval_status,omitempty"`
	LastApprovalDate     *time.Time                 `json:"last_approval_date,omitempty"`
	LastApprovalComment  string                     `json:"last_approval_comment,omitempty"`
	CreatedAt            time.Time                  `json:"created_at"`
}

type CommentKind string

const (
	CommentKindExternal CommentKind = "external"
	CommentKindInternal CommentKind = "internal"
)

type Comment struct {
	ID         string      `json:"id"`
	EntityType string      `json:"entity_type"`
	EntityID   string      `json:"entity_id"`
	AuthorID   string      `json:"author_id"`
	Body       string      `json:"body"`
	Kind       CommentKind `json:"kind"`
	Read       bool        `json:"read"`
	FileIDs    []string    `json:"file_ids,omitempty"`
	CreatedAt  time.Time   `json:"created_at"`
}

type FileMeta struct {
	ID          string    `json:"id"`
	OwnerID     string    `json:"owner_id"`
	FormID      string    `json:"form_id,omitempty"`
	StorageKey  string    `json:"storage_key"`
	ContentType string    `json:"content_type,omitempty"`
	ContentHash string    `json:"content_hash,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

// Template is Excel import mapping (Nest template / R6).
type Template struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Direction   string    `json:"direction"`
	MappingJSON string    `json:"mapping_json"`
	FileID      string    `json:"file_id,omitempty"`
	Active      bool      `json:"active"`
	CreatedAt   time.Time `json:"created_at"`
}

type Agent struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	INN     string `json:"inn,omitempty"`
	Active  bool   `json:"active"`
	StampID string `json:"stamp_file_id,omitempty"`
	SignID  string `json:"signature_file_id,omitempty"`
}

type HsCode struct {
	Code        string `json:"code"`
	Description string `json:"description,omitempty"`
}

type Currency struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

type LiquidityOffer struct {
	ID         string `json:"id"`
	Direction  string `json:"direction"` // import|export
	ProviderID string `json:"provider_id,omitempty"`
	FormID     string `json:"form_payment_id,omitempty"`
	Amount     string `json:"amount"`
	Currency   string `json:"currency"`
	Status     string `json:"status"` // open|matched|closed
}

type VirtualAccount struct {
	ID        string `json:"id"`
	AccountID string `json:"account_id"`
	Kind      string `json:"kind"` // fiat|crypto
	Balance   string `json:"balance"`
	Currency  string `json:"currency"`
}

type TreasurerTask struct {
	ID            string    `json:"id"`
	FormPaymentID string    `json:"form_payment_id"`
	Kind          string    `json:"kind"` // refund|export_overpay|confirm
	Status        string    `json:"status"` // open|in_progress|done|canceled
	Amount        string    `json:"amount,omitempty"`
	Currency      string    `json:"currency,omitempty"`
	AssigneeID    string    `json:"assignee_id,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at,omitempty"`
}

type UnblockRequest struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organization_id"`
	RequestedBy    string    `json:"requested_by"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"created_at"`
}
