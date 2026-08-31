package docs

import (
	"context"
	"fmt"
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
		baseURL: os.Getenv("DOCS_URL"),
		timeout: timeout,
		retries: retries,
		log:     log,
	}
}

func (p *Plugin) Name() string      { return "docs" }
func (p *Plugin) Version() string   { return "0.1.0" }
func (p *Plugin) Type() domain.Type { return domain.TypeDocs }
func (p *Plugin) Actions() []string { return []string{"generate"} }

func (p *Plugin) Execute(ctx context.Context, action string, params map[string]any) (map[string]any, error) {
	ctx, cancel := context.WithTimeout(ctx, p.timeout)
	defer cancel()
	formPaymentID, _ := params["form_payment_id"].(string)
	var result map[string]any
	err := resilience.Do(ctx, p.retries, 20*time.Millisecond, func() error {
		if p.baseURL == "" {
			storageKey := fmt.Sprintf("docs/%s/stub.pdf", formPaymentID)
			p.log.Info("docs generate stub", "action", action, "form_payment_id", formPaymentID, "storage_key", storageKey)
			result = map[string]any{
				"status":      "generated",
				"storage_key": storageKey,
				"mime":        "application/pdf",
			}
			return nil
		}
		body := map[string]any{
			"event_id":        params["event_id"],
			"form_payment_id": formPaymentID,
		}
		if nested, ok := params["payload"].(map[string]any); ok {
			for k, v := range nested {
				body[k] = v
			}
		}
		for k, v := range params {
			if k == "payload" || k == "event_id" || k == "form_payment_id" {
				continue
			}
			body[k] = v
		}
		out, err := remote.PostJSON(ctx, p.baseURL, p.timeout, body)
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
