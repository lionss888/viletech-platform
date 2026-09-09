package managerops

import (
	"fmt"
	"strings"
	"time"
)

// Source identifies who produced a behavioral signal.
type Source string

const (
	SourceCore     Source = "core"
	SourceTelegram Source = "telegram"
)

// Kind is a behavioral event type. Product actions are primary; Telegram is secondary.
type Kind string

const (
	KindFirstTouch Kind = "first_touch"
	KindApprove    Kind = "approve"
	KindReject     Kind = "reject"
	KindAssign     Kind = "assign"
	KindNudgeAck   Kind = "nudge_ack"
	KindChatReply  Kind = "chat_reply"
)

// Event is the cross-service contract for manager behavioral signals.
// No client PII; form_payment_id is an opaque reference.
type Event struct {
	ID            string         `json:"id"`
	IdempotencyKey string        `json:"idempotency_key"`
	AccountID     string         `json:"account_id,omitempty"`
	TelegramUserID string        `json:"telegram_user_id,omitempty"`
	Source        Source         `json:"source"`
	Kind          Kind           `json:"kind"`
	FormPaymentID string         `json:"form_payment_id,omitempty"`
	LatencyMS     *int64         `json:"latency_ms,omitempty"`
	OccurredAt    time.Time      `json:"occurred_at"`
	Payload       map[string]any `json:"payload,omitempty"`
}

var allowedKinds = map[Kind]struct{}{
	KindFirstTouch: {},
	KindApprove:    {},
	KindReject:     {},
	KindAssign:     {},
	KindNudgeAck:   {},
	KindChatReply:  {},
}

var forbiddenPayloadKeys = []string{"passport", "full_name", "inn", "address", "birth", "email", "phone"}

// Validate checks required fields and rejects obvious PII payload keys.
func (e Event) Validate() error {
	if strings.TrimSpace(e.IdempotencyKey) == "" && strings.TrimSpace(e.ID) == "" {
		return fmt.Errorf("id or idempotency_key required")
	}
	if e.Source != SourceCore && e.Source != SourceTelegram {
		return fmt.Errorf("unsupported source")
	}
	if _, ok := allowedKinds[e.Kind]; !ok {
		return fmt.Errorf("unsupported kind")
	}
	if strings.TrimSpace(e.AccountID) == "" && strings.TrimSpace(e.TelegramUserID) == "" {
		return fmt.Errorf("account_id or telegram_user_id required")
	}
	if e.OccurredAt.IsZero() {
		return fmt.Errorf("occurred_at required")
	}
	if containsForbidden(e.Payload, 0) {
		return fmt.Errorf("payload contains forbidden PII keys")
	}
	return nil
}

// ValidateExport re-checks PII bans for dataset export.
func ValidateExport(e Event) error {
	return e.Validate()
}

// Key returns the idempotency key for ingest.
func (e Event) Key() string {
	if k := strings.TrimSpace(e.IdempotencyKey); k != "" {
		return k
	}
	return strings.TrimSpace(e.ID)
}

func containsForbidden(payload map[string]any, depth int) bool {
	if payload == nil || depth > 4 {
		return false
	}
	for k, v := range payload {
		lower := strings.ToLower(k)
		for _, ban := range forbiddenPayloadKeys {
			if lower == ban {
				return true
			}
		}
		if nested, ok := v.(map[string]any); ok {
			if containsForbidden(nested, depth+1) {
				return true
			}
		}
	}
	return false
}
