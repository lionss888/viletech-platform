package sms

import (
	"context"
	"log/slog"
	"os"
	"time"

	"github.com/viletech/vdp/hub/internal/adapters/remote"
	"github.com/viletech/vdp/hub/internal/domain"
	"github.com/viletech/vdp/hub/internal/resilience"
	"github.com/viletech/vdp/shared/notify"
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
		baseURL: os.Getenv("SMS_URL"),
		timeout: timeout,
		retries: retries,
		log:     log,
	}
}

func (p *Plugin) WithBaseURL(url string) *Plugin {
	p.baseURL = url
	return p
}

func (p *Plugin) Name() string      { return "sms" }
func (p *Plugin) Version() string   { return "0.1.0" }
func (p *Plugin) Type() domain.Type { return domain.TypeSMS }
func (p *Plugin) Actions() []string { return []string{"notify"} }

func (p *Plugin) Execute(ctx context.Context, action string, params map[string]any) (map[string]any, error) {
	ctx, cancel := context.WithTimeout(ctx, p.timeout)
	defer cancel()
	contract := notify.FromHubParams(notify.ChannelSMS, params)
	body := map[string]any{
		"event_id":        contract.EventID,
		"form_payment_id": contract.FormPaymentID,
		"channel":         string(notify.ChannelSMS),
		"to":              contract.To,
		"template":        contract.Template,
		"idempotency_key": contract.Key(),
		"text":            contract.Text,
		"payload":         contract.Payload,
	}
	var result map[string]any
	err := resilience.Do(ctx, p.retries, 20*time.Millisecond, func() error {
		if p.baseURL == "" {
			p.Sent = append(p.Sent, body)
			p.log.Info("sms notify stub", "form_payment_id", contract.FormPaymentID, "to", notify.MaskDestination(contract.To), "action", action)
			result = map[string]any{"status": "accepted", "channel": "sms", "mode": "fixture"}
			return nil
		}
		out, err := remote.PostJSON(ctx, p.baseURL, p.timeout, body)
		if err != nil {
			return err
		}
		result = out
		if result["channel"] == nil {
			result["channel"] = "sms"
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
