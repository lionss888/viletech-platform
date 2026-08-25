package ocr

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
		baseURL: os.Getenv("OCR_URL"),
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

func (p *Plugin) Name() string      { return "ocr" }
func (p *Plugin) Version() string   { return "0.2.0" }
func (p *Plugin) Type() domain.Type { return domain.TypeOCR }
func (p *Plugin) Actions() []string { return []string{"recognize"} }

func BuildRecognizePayload(params map[string]any) map[string]any {
	formID := remote.StringParam(params, "form_payment_id")
	eventID := remote.StringParam(params, "event_id")
	payload, _ := params["payload"].(map[string]any)
	return map[string]any{
		"event_id":        eventID,
		"form_payment_id": formID,
		"operation":       "recognize",
		"payload":         payload,
	}
}

func fixtureFields(formID string) map[string]any {
	return map[string]any{
		"contract_number": "OCR-" + formID,
		"contract_date":   "2026-01-15",
		"invoice_amount":  "1000",
		"currency":        "USD",
		"invoice_json":    `{"source":"ocr","form_payment_id":"` + formID + `"}`,
	}
}

func (p *Plugin) Execute(ctx context.Context, action string, params map[string]any) (map[string]any, error) {
	ctx, cancel := context.WithTimeout(ctx, p.timeout)
	defer cancel()
	contract := BuildRecognizePayload(params)
	formID, _ := contract["form_payment_id"].(string)
	eventID, _ := contract["event_id"].(string)
	var result map[string]any
	err := resilience.Do(ctx, p.retries, 20*time.Millisecond, func() error {
		fields := fixtureFields(formID)
		if p.baseURL == "" {
			p.log.Info("ocr recognize fixture", "action", action, "form_payment_id", formID)
			result = map[string]any{
				"status": "recognized", "mode": "fixture", "ml": false,
				"fields": fields, "contract": contract,
			}
		} else {
			out, err := remote.PostJSON(ctx, p.baseURL, p.timeout, contract)
			if err != nil {
				return err
			}
			result = out
			if result["status"] == nil {
				result["status"] = "recognized"
			}
			result["mode"] = "http"
			if result["fields"] == nil {
				result["fields"] = fields
			}
		}
		fieldsMap, _ := result["fields"].(map[string]any)
		cbBody := map[string]any{
			"form_payment_id": formID,
			"action":          "ocr_recognized",
			"event_id":        eventID,
			"fields":          fieldsMap,
		}
		for k, v := range fieldsMap {
			cbBody[k] = v
		}
		cb, err := remote.PostCoreCallback(ctx, p.coreURL, p.secret, p.timeout, cbBody)
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
