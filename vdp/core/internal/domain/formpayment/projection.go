package formpayment

type ProviderView struct {
	ID                string  `json:"id"`
	Status            Status  `json:"status"`
	Direction         Direction `json:"direction"`
	Kind              Kind    `json:"kind"`
	ExecutionDeadline *string `json:"execution_deadline,omitempty"`
	InvoiceAmount     string  `json:"invoice_amount,omitempty"`
	Currency          string  `json:"currency,omitempty"`
	Rate              Rate    `json:"rate"`
	Commission        Commission `json:"commission"`
	ProviderID        string  `json:"provider_id"`
	OrganizationID    string  `json:"organization_id"`
}

func ProjectForProvider(form Form) ProviderView {
	view := ProviderView{
		ID:             form.ID,
		Status:         form.Status,
		Direction:      form.Direction,
		Kind:           form.Kind,
		InvoiceAmount:  form.InvoiceAmount,
		Currency:       form.Currency,
		Rate:           form.Rate,
		Commission:     form.Commission,
		ProviderID:     form.ProviderID,
		OrganizationID: form.OrganizationID,
	}
	if form.ExecutionDeadline != nil {
		formatted := form.ExecutionDeadline.UTC().Format("2006-01-02T15:04:05Z")
		view.ExecutionDeadline = &formatted
	}
	return view
}

func ContainsPII(view ProviderView) bool {
	return false
}
