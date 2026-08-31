package diadoc

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
	coreURL string
	secret  string
	timeout time.Duration
	retries int
	log     *slog.Logger
}

func New(timeout time.Duration, retries int, log *slog.Logger) *Plugin {
	return &Plugin{
		baseURL: os.Getenv("DIADOC_URL"),
		coreURL: os.Getenv("CORE_URL"),
		secret:  os.Getenv("HUB_SHARED_SECRET"),
		timeout: timeout,
		retries: retries,
		log:     log,
	}
}

func (p *Plugin) WithBaseURL(url string) *Plugin { p.baseURL = url; return p }
func (p *Plugin) WithCore(coreURL, secret string) *Plugin {
	p.coreURL = coreURL
	p.secret = secret
	return p
}

func (p *Plugin) Name() string      { return "diadoc" }
func (p *Plugin) Version() string   { return "0.2.0" }
func (p *Plugin) Type() domain.Type { return domain.TypeEDO }
func (p *Plugin) Actions() []string { return []string{"sign"} }

func BuildSignPayload(params map[string]any) map[string]any {
	formID := remote.StringParam(params, "form_payment_id")
	eventID := remote.StringParam(params, "event_id")
	payload, _ := params["payload"].(map[string]any)
	kind := "payment_order"
	if payload != nil {
		if k, ok := payload["kind"].(string); ok && k != "" {
			kind = k
		}
	}
	return map[string]any{
		"event_id":        eventID,
		"form_payment_id": formID,
		"kind":            kind,
		"operation":       "sign",
		"payload":         payload,
	}
}

func (p *Plugin) Execute(ctx context.Context, action string, params map[string]any) (map[string]any, error) {
	ctx, cancel := context.WithTimeout(ctx, p.timeout)
	defer cancel()
	contract := BuildSignPayload(params)
	formID, _ := contract["form_payment_id"].(string)
	eventID, _ := contract["event_id"].(string)
	var result map[string]any
	err := resilience.Do(ctx, p.retries, 20*time.Millisecond, func() error {
		if p.baseURL == "" {
			p.log.Info("diadoc sign fixture", "action", action, "form_payment_id", formID)
			result = map[string]any{"status": "queued", "mode": "fixture", "provider": "diadoc", "contract": contract}
		} else {
			out, err := remote.PostJSON(ctx, p.baseURL, p.timeout, contract)
			if err != nil {
				return err
			}
			result = out
			if result["status"] == nil {
				result["status"] = "queued"
			}
			result["mode"] = "http"
		}
		// Callback → core Transition only (hub does not write core status).
		cb, err := remote.PostCoreCallback(ctx, p.coreURL, p.secret, p.timeout, map[string]any{
			"form_payment_id": formID,
			"action":          "diadoc_signed",
			"event_id":        eventID,
			"kind":            contract["kind"],
		})
		if err != nil {
			return err
		}
		result["core_callback"] = cb
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (p *Plugin) HealthCheck(context.Context) error { return nil }
