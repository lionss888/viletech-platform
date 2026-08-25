package onec

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
}

func New(timeout time.Duration, retries int, log *slog.Logger) *Plugin {
	return &Plugin{
		baseURL: os.Getenv("ONEC_URL"),
		timeout: timeout,
		retries: retries,
		log:     log,
	}
}

func (p *Plugin) Name() string      { return "1c" }
func (p *Plugin) Version() string   { return "0.1.0" }
func (p *Plugin) Type() domain.Type { return domain.TypePayment }
func (p *Plugin) Actions() []string { return []string{"cover", "fee"} }

func (p *Plugin) Execute(ctx context.Context, action string, params map[string]any) (map[string]any, error) {
	ctx, cancel := context.WithTimeout(ctx, p.timeout)
	defer cancel()
	idempotencyKey, _ := params["event_id"].(string)
	var result map[string]any
	err := resilience.Do(ctx, p.retries, 20*time.Millisecond, func() error {
		if p.baseURL == "" {
			p.log.Info("1c stub", "action", action, "idempotency_key", idempotencyKey, "form_payment_id", params["form_payment_id"])
			result = map[string]any{"status": "accepted", "idempotency_key": idempotencyKey}
			return nil
		}
		out, err := remote.PostJSON(ctx, p.baseURL, p.timeout, params)
		if err != nil {
			return err
		}
		result = out
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (p *Plugin) HealthCheck(context.Context) error { return nil }
