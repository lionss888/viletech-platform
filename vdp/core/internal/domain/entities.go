package domain

import "time"

type Contract struct {
	ID             string
	OrganizationID string
	Status         string
	TemplateKey    string
	SignedFileID   string
	CreatedAt      time.Time
}

type Counterparty struct {
	ID      string
	Name    string
	Country string
	INN     string
	Banks   string // JSON blob of bank accounts
}

type Comment struct {
	ID         string
	EntityType string
	EntityID   string
	AuthorID   string
	Body       string
	Read       bool
	CreatedAt  time.Time
}

type FileMeta struct {
	ID          string
	OwnerID     string
	FormID      string
	StorageKey  string
	ContentType string
	ContentHash string
	CreatedAt   time.Time
}

type Agent struct {
	ID   string
	Name string
	INN  string
}

type HsCode struct {
	Code        string
	Description string
}

type Currency struct {
	Code string
	Name string
}

type LiquidityOffer struct {
	ID         string
	Direction  string
	ProviderID string
	Amount     string
	Currency   string
	Status     string
}

type VirtualAccount struct {
	ID        string
	AccountID string
	Kind      string // fiat|crypto
	Balance   string
	Currency  string
}

type TreasurerTask struct {
	ID            string
	FormPaymentID string
	Kind          string // refund|overpay_export|overpay_import
	Status        string
	CreatedAt     time.Time
}

type UnblockRequest struct {
	ID             string
	OrganizationID string
	RequestedBy    string
	Status         string // pending|approved|rejected
	CreatedAt      time.Time
}
