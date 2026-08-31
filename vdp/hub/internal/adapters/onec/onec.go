package onec

import (
	"context"
	"log/slog"
	"os"
	"sync"
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
	mu      sync.Mutex
	seen    map[string]map[string]any
}

func New(timeout time.Duration, retries int, log *slog.Logger) *Plugin {
	return &Plugin{
		baseURL: os.Getenv("ONEC_URL"),
		coreURL: os.Getenv("CORE_URL"),
		secret:  os.Getenv("HUB_SHARED_SECRET"),
		timeout: timeout,
		retries: retries,
		log:     log,
		seen:    map[string]map[string]any{},
	}
}

func (p *Plugin) WithBaseURL(url string) *Plugin { p.baseURL = url; return p }
func (p *Plugin) WithCore(coreURL, secret string) *Plugin {
	p.coreURL = coreURL
	p.secret = secret
	return p
}

func (p *Plugin) Name() string      { return "1c" }
func (p *Plugin) Version() string   { return "0.2.0" }
func (p *Plugin) Type() domain.Type { return domain.TypePayment }
func (p *Plugin) Actions() []string { return []string{"cover", "fee"} }

func BuildPaymentPayload(action string, params map[string]any) map[string]any {
	formID := remote.StringParam(params, "form_payment_id")
	eventID := remote.StringParam(params, "event_id")
	payload, _ := params["payload"].(map[string]any)
	externalID := eventID
	if payload != nil {
		if id, ok := payload["external_id"].(string); ok && id != "" {
			externalID = id
		}
		if id, ok := payload["externalId"].(string); ok && id != "" {
			externalID = id
		}
	}
	return map[string]any{
		"event_id":        eventID,
		"external_id":     externalID,
		"form_payment_id": formID,
		"operation":       action,
		"payload":         payload,
	}
}

func (p *Plugin) Execute(ctx context.Context, action string, params map[string]any) (map[string]any, error) {
	ctx, cancel := context.WithTimeout(ctx, p.timeout)
	defer cancel()
	contract := BuildPaymentPayload(action, params)
	idemKey, _ := contract["external_id"].(string)
	if idemKey == "" {
		idemKey, _ = contract["event_id"].(string)
	}
	p.mu.Lock()
	if prev, ok := p.seen[idemKey]; ok {
		p.mu.Unlock()
		out := map[string]any{}
		for k, v := range prev {
			out[k] = v
		}
		out["idempotent"] = true
		return out, nil
	}
	p.mu.Unlock()

	formID, _ := contract["form_payment_id"].(string)
	var result map[string]any
	err := resilience.Do(ctx, p.retries, 20*time.Millisecond, func() error {
		if p.baseURL == "" {
			p.log.Info("1c payment fixture", "action", action, "idempotency_key", idemKey, "form_payment_id", formID)
			cover := "0"
			fee := "0"
			if action == "cover" {
				cover = "1000"
			}
			if action == "fee" {
				fee = "25"
			}
			if payload, ok := contract["payload"].(map[string]any); ok {
				if v, ok := payload["cover"].(string); ok {
					cover = v
				}
				if v, ok := payload["fee"].(string); ok {
					fee = v
				}
			}
			result = map[string]any{
				"status": "accepted", "mode": "fixture", "idempotency_key": idemKey,
				"cover": cover, "fee": fee, "contract": contract,
			}
		} else {
			out, err := remote.PostJSON(ctx, p.baseURL, p.timeout, contract)
			if err != nil {
				return err
			}
			result = out
			if result["status"] == nil {
				result["status"] = "accepted"
			}
			result["mode"] = "http"
			result["idempotency_key"] = idemKey
		}
		cb, err := remote.PostCoreCallback(ctx, p.coreURL, p.secret, p.timeout, map[string]any{
			"form_payment_id": formID,
			"action":          "onec_" + action,
			"event_id":        contract["event_id"],
			"external_id":     idemKey,
			"cover":           result["cover"],
			"fee":             result["fee"],
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
	p.mu.Lock()
	p.seen[idemKey] = result
	p.mu.Unlock()
	return result, nil
}

func (p *Plugin) HealthCheck(context.Context) error { return nil }
