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

func (p *Plugin) Name() string      { return "telegram" }
func (p *Plugin) Version() string   { return "0.1.0" }
func (p *Plugin) Type() domain.Type { return domain.TypeCommunication }
func (p *Plugin) Actions() []string { return []string{"notify"} }

func (p *Plugin) Execute(ctx context.Context, action string, params map[string]any) (map[string]any, error) {
	ctx, cancel := context.WithTimeout(ctx, p.timeout)
	defer cancel()
	var result map[string]any
	err := resilience.Do(ctx, p.retries, 20*time.Millisecond, func() error {
		if p.baseURL == "" {
			select {
			case <-ctx.Done():
				return ctx.Err()
			default:
				p.Sent = append(p.Sent, params)
				p.log.Info("telegram notify stub", "form_payment_id", params["form_payment_id"], "action", action)
				result = map[string]any{"status": "accepted", "channel": "telegram"}
				return nil
			}
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
