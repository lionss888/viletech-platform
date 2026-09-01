package notify

import (
	"fmt"
	"strings"
)

// Request is the HTTP contract for mail-gateway and sms-gateway POST /notify.
type Request struct {
	EventID       string         `json:"event_id"`
	FormPaymentID string         `json:"form_payment_id,omitempty"`
	Channel       Channel        `json:"channel"`
	To            string         `json:"to"`
	Template      string         `json:"template"`
	IdempotencyKey string        `json:"idempotency_key"`
	Text          string         `json:"text,omitempty"`
	Payload       map[string]any `json:"payload,omitempty"`
}

// Response is returned by gateways.
type Response struct {
	Status  string `json:"status"`
	Channel string `json:"channel"`
	Mode    string `json:"mode,omitempty"`
}

const (
	StatusAccepted  = "accepted"
	StatusDuplicate = "duplicate"
	StatusSkipped   = "skipped"
)

var forbiddenNotifyKeys = []string{"passport", "full_name", "inn", "address", "birth", "email"}

// Validate checks required fields of a notify request.
func (r Request) Validate() error {
	if strings.TrimSpace(r.EventID) == "" && strings.TrimSpace(r.IdempotencyKey) == "" {
		return fmt.Errorf("event_id or idempotency_key required")
	}
	if r.Channel != ChannelMail && r.Channel != ChannelSMS {
		return fmt.Errorf("unsupported channel")
	}
	if strings.TrimSpace(r.To) == "" {
		return fmt.Errorf("to required")
	}
	if strings.TrimSpace(r.Template) == "" {
		return fmt.Errorf("template required")
	}
	return nil
}

// Key returns the idempotency key for a request.
func (r Request) Key() string {
	if k := strings.TrimSpace(r.IdempotencyKey); k != "" {
		return k
	}
	return strings.TrimSpace(r.EventID)
}

// ContainsForbiddenPII reports leaked personal data keys in a payload map.
func ContainsForbiddenPII(payload map[string]any) bool {
	return payloadHasForbidden(payload, 0)
}

func payloadHasForbidden(payload map[string]any, depth int) bool {
	if payload == nil || depth > 4 {
		return false
	}
	for k, v := range payload {
		lower := strings.ToLower(k)
		for _, ban := range forbiddenNotifyKeys {
			if lower == ban {
				return true
			}
		}
		if nested, ok := v.(map[string]any); ok {
			if payloadHasForbidden(nested, depth+1) {
				return true
			}
		}
	}
	return false
}

// MaskDestination hides most of an email or phone for logs.
func MaskDestination(to string) string {
	to = strings.TrimSpace(to)
	if to == "" {
		return ""
	}
	if strings.Contains(to, "@") {
		parts := strings.SplitN(to, "@", 2)
		name := parts[0]
		if len(name) <= 1 {
			return "*@" + parts[1]
		}
		return name[:1] + "***@" + parts[1]
	}
	if len(to) <= 4 {
		return "****"
	}
	return to[:2] + "****" + to[len(to)-2:]
}

// FromHubParams maps hub dispatcher params onto the gateway contract.
func FromHubParams(channel Channel, params map[string]any) Request {
	payload, _ := params["payload"].(map[string]any)
	eventID := stringField(params, "event_id")
	formID := stringField(params, "form_payment_id")
	to := stringField(params, "to")
	template := stringField(params, "template")
	text := stringField(params, "text")
	if payload != nil {
		if to == "" {
			to = stringField(payload, "to")
		}
		if template == "" {
			template = stringField(payload, "template")
		}
		if text == "" {
			text = stringField(payload, "text")
		}
		if eventID == "" {
			eventID = stringField(payload, "event_id")
		}
	}
	key := stringField(params, "idempotency_key")
	if key == "" {
		key = eventID
	}
	return Request{
		EventID:        eventID,
		FormPaymentID:  formID,
		Channel:        channel,
		To:             to,
		Template:       template,
		IdempotencyKey: key,
		Text:           text,
		Payload:        payload,
	}
}

func stringField(m map[string]any, key string) string {
	if m == nil {
		return ""
	}
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}
