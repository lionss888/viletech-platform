package telegram

import (
	"context"
	"log/slog"
	"os"
	"time"

	"github.com/viletech/vdp/hub/internal/adapters/remote"
	"github.com/viletech/vdp/hub/internal/domain"
	"github.com/viletech/vdp/hub/internal/resilience"
)

type Plugin struct {
	baseURL string
	timeout time.Duration
	retries int
	log     *slog.Logger
	Sent    []map[string]any
}

func New(timeout time.Duration, retries int, log *slog.Logger) *Plugin {
	return &Plugin{
		baseURL: os.Getenv("TELEGRAM_URL"),
		timeout: timeout,
		retries: retries,
		log:     log,
	}
}

func (p *Plugin) WithBaseURL(url string) *Plugin {
	p.baseURL = url
	return p
}

func (p *Plugin) Name() string      { return "telegram" }
func (p *Plugin) Version() string   { return "0.2.0" }
func (p *Plugin) Type() domain.Type { return domain.TypeCommunication }
func (p *Plugin) Actions() []string { return []string{"notify"} }

// BuildNotifyPayload is the Telegram contract (Nest-aligned).
func BuildNotifyPayload(params map[string]any) map[string]any {
	formID := remote.StringParam(params, "form_payment_id")
	eventID := remote.StringParam(params, "event_id")
	payload, _ := params["payload"].(map[string]any)
	text := ""
	if payload != nil {
		if t, ok := payload["text"].(string); ok {
			text = t
		} else if t, ok := payload["message"].(string); ok {
			text = t
		} else if t, ok := payload["to"].(string); ok {
			text = "notify:" + t
		} else if action, ok := payload["action"].(string); ok {
			text = "form " + formID + " action=" + action
		}
	}
	if text == "" {
		text = "form_payment status update: " + formID
	}
	chatID := ""
	if payload != nil {
		chatID, _ = payload["chat_id"].(string)
	}
	return map[string]any{
		"channel":         "telegram",
		"event_id":        eventID,
		"form_payment_id": formID,
		"chat_id":         chatID,
		"text":            text,
		"payload":         payload,
	}
}

func (p *Plugin) Execute(ctx context.Context, action string, params map[string]any) (map[string]any, error) {
	ctx, cancel := context.WithTimeout(ctx, p.timeout)
	defer cancel()
	contract := BuildNotifyPayload(params)
	var result map[string]any
	err := resilience.Do(ctx, p.retries, 20*time.Millisecond, func() error {
		if p.baseURL == "" {
			p.Sent = append(p.Sent, contract)
			p.log.Info("telegram notify fixture", "form_payment_id", contract["form_payment_id"], "action", action)
			result = map[string]any{"status": "accepted", "channel": "telegram", "mode": "fixture", "contract": contract}
			return nil
		}
		out, err := remote.PostJSON(ctx, p.baseURL, p.timeout, contract)
		if err != nil {
			return err
		}
		p.Sent = append(p.Sent, contract)
		result = out
		if result["channel"] == nil {
			result["channel"] = "telegram"
		}
		if result["status"] == nil {
			result["status"] = "accepted"
		}
		result["mode"] = "http"
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (p *Plugin) HealthCheck(context.Context) error { return nil }
