package formpayment

import "time"

// OrderKind distinguishes principal instruction types (§3).
type OrderKind string

const (
	OrderKindMain    OrderKind = "main"
	OrderKindAdvance OrderKind = "advance"
)

// Order is a principal payment instruction bound to a form-payment.
// One form may have many orders; Form.ActiveOrderID points at the one for provider execution.
type Order struct {
	ID             string     `json:"id"`
	FormPaymentID  string     `json:"form_payment_id"`
	Kind           OrderKind  `json:"kind"`
	Status         Status     `json:"status"`
	FileIDs        []string   `json:"file_ids,omitempty"`
	Rate           Rate       `json:"rate"`
	Commission     Commission `json:"commission"`
	InvoiceAmount  string     `json:"invoice_amount,omitempty"`
	Currency       string     `json:"currency,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// ActiveOrderSnapshot is the provider-safe projection of the active instruction (no client PII).
type ActiveOrderSnapshot struct {
	ID            string     `json:"id"`
	Kind          OrderKind  `json:"kind"`
	Status        Status     `json:"status"`
	InvoiceAmount string     `json:"invoice_amount,omitempty"`
	Currency      string     `json:"currency,omitempty"`
	Rate          Rate       `json:"rate"`
	Commission    Commission `json:"commission"`
	FileIDs       []string   `json:"file_ids,omitempty"`
}

func (o Order) Snapshot() ActiveOrderSnapshot {
	return ActiveOrderSnapshot{
		ID: o.ID, Kind: o.Kind, Status: o.Status,
		InvoiceAmount: o.InvoiceAmount, Currency: o.Currency,
		Rate: o.Rate, Commission: o.Commission, FileIDs: append([]string{}, o.FileIDs...),
	}
}
