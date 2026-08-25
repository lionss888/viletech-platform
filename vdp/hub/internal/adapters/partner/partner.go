package partner

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
		baseURL: os.Getenv("PARTNER_URL"),
		timeout: timeout,
		retries: retries,
		log:     log,
	}
}

func (p *Plugin) WithBaseURL(url string) *Plugin { p.baseURL = url; return p }

func (p *Plugin) Name() string      { return "partner" }
func (p *Plugin) Version() string   { return "0.2.0" }
func (p *Plugin) Type() domain.Type { return domain.TypePartner }
func (p *Plugin) Actions() []string { return []string{"dispatch"} }

func BuildDispatchPayload(params map[string]any) map[string]any {
	return map[string]any{
		"event_id":        remote.StringParam(params, "event_id"),
		"form_payment_id": remote.StringParam(params, "form_payment_id"),
		"operation":       "dispatch",
		"payload":         params["payload"],
	}
}

func (p *Plugin) Execute(ctx context.Context, action string, params map[string]any) (map[string]any, error) {
	ctx, cancel := context.WithTimeout(ctx, p.timeout)
	defer cancel()
	contract := BuildDispatchPayload(params)
	var result map[string]any
	err := resilience.Do(ctx, p.retries, 20*time.Millisecond, func() error {
		if p.baseURL == "" {
			p.Sent = append(p.Sent, contract)
			p.log.Info("partner dispatch fixture", "action", action, "form_payment_id", contract["form_payment_id"])
			result = map[string]any{"status": "accepted", "mode": "fixture", "contract": contract}
			return nil
		}
		out, err := remote.PostJSON(ctx, p.baseURL, p.timeout, contract)
		if err != nil {
			return err
		}
		p.Sent = append(p.Sent, contract)
		result = out
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
