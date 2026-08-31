package formpayment

import (
	"encoding/json"
	"strings"
)

type ProviderView struct {
	ID                string               `json:"id"`
	Status            Status               `json:"status"`
	Direction         Direction            `json:"direction"`
	Kind              Kind                 `json:"kind"`
	Channel           string               `json:"channel,omitempty"`
	ExecutionDeadline *string              `json:"execution_deadline,omitempty"`
	InvoiceAmount     string               `json:"invoice_amount,omitempty"`
	Currency          string               `json:"currency,omitempty"`
	Rate              Rate                 `json:"rate"`
	Commission        Commission           `json:"commission"`
	ProviderID        string               `json:"provider_id"`
	OrganizationID    string               `json:"organization_id"`
	ActiveOrderID     string               `json:"active_order_id,omitempty"`
	ActiveOrder       *ActiveOrderSnapshot `json:"active_order,omitempty"`
}

func ProjectForProvider(form Form) ProviderView {
	view := ProviderView{
		ID:             form.ID,
		Status:         form.Status,
		Direction:      form.Direction,
		Kind:           form.Kind,
		Channel:        form.Channel,
		InvoiceAmount:  form.InvoiceAmount,
		Currency:       form.Currency,
		Rate:           form.Rate,
		Commission:     form.Commission,
		ProviderID:     form.ProviderID,
		OrganizationID: form.OrganizationID,
		ActiveOrderID:  form.ActiveOrderID,
	}
	if form.ExecutionDeadline != nil {
		formatted := form.ExecutionDeadline.UTC().Format("2006-01-02T15:04:05Z")
		view.ExecutionDeadline = &formatted
	}
	return view
}

func ProjectForProviderWithOrder(form Form, order *Order) ProviderView {
	view := ProjectForProvider(form)
	if order != nil {
		snap := order.Snapshot()
		view.ActiveOrder = &snap
		view.InvoiceAmount = order.InvoiceAmount
		view.Currency = order.Currency
		view.Rate = order.Rate
		view.Commission = order.Commission
	}
	return view
}

// ForbiddenPIIKeys must never appear in provider JSON payloads.
var ForbiddenPIIKeys = []string{
	"passport", "phone", "full_name", "email", "account", "inn", "address", "birth",
}

// ContainsPII reports whether serialized provider view leaks client personal data keys.
func ContainsPII(view ProviderView) bool {
	raw, err := json.Marshal(view)
	if err != nil {
		return true
	}
	lower := strings.ToLower(string(raw))
	for _, key := range ForbiddenPIIKeys {
		// JSON keys appear as "key":
		if strings.Contains(lower, `"`+key+`"`) {
			return true
		}
	}
	return false
}
