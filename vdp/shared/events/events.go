package events

const (
	AggregateFormPayment = "form_payment"

	TypeFormPaymentStatusChanged = "form_payment.status_changed"
	TypeTelegramNotify           = "telegram.notify"
	TypeOCRRequested             = "ocr.requested"
	TypeDiadocSignRequested      = "diadoc.sign_requested"
	TypeOneCPaymentRequested     = "onec.payment_requested"
	TypePartnerDispatch          = "partner.dispatch"
	TypeDocsGenerate             = "docs.generate"
	TypeMailNotify               = "mail.notify"
	TypeSocketPush               = "socket.push"
	TypeBankWebhook              = "bank.webhook"
)

// Envelope is the business-level contract between core and hub.
type Envelope struct {
	EventID       string         `json:"event_id"`
	EventType     string         `json:"event_type"`
	AggregateID   string         `json:"aggregate_id"`
	AggregateType string         `json:"aggregate_type"`
	FormPaymentID string         `json:"form_payment_id"`
	Payload       map[string]any `json:"payload"`
}
