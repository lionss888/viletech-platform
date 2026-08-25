package ocr

import (
	"context"
	"log/slog"
	"time"

	"github.com/viletech/vdp/hub/internal/domain"
	"github.com/viletech/vdp/hub/internal/resilience"
)

type Plugin struct {
	timeout time.Duration
	retries int
	log     *slog.Logger
}

func New(timeout time.Duration, retries int, log *slog.Logger) *Plugin {
	return &Plugin{timeout: timeout, retries: retries, log: log}
}

func (p *Plugin) Name() string      { return "ocr" }
func (p *Plugin) Version() string   { return "0.1.0" }
func (p *Plugin) Type() domain.Type { return domain.TypeOCR }
func (p *Plugin) Actions() []string { return []string{"recognize"} }

func (p *Plugin) Execute(ctx context.Context, action string, params map[string]any) (map[string]any, error) {
	ctx, cancel := context.WithTimeout(ctx, p.timeout)
	defer cancel()
	err := resilience.Do(ctx, p.retries, 20*time.Millisecond, func() error {
		p.log.Info("ocr stub", "action", action, "form_payment_id", params["form_payment_id"])
		return nil
	})
	if err != nil {
		return nil, err
	}
	return map[string]any{"status": "stub", "ml": false}, nil
}

func (p *Plugin) HealthCheck(context.Context) error { return nil }
