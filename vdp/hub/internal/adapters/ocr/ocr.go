package ocr

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"time"

	"github.com/viletech/vdp/hub/internal/adapters/remote"
	"github.com/viletech/vdp/hub/internal/domain"
	"github.com/viletech/vdp/hub/internal/resilience"
	"github.com/viletech/vdp/shared/extraction"
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
	r := extraction.FixtureResult(formID)
	return extraction.HubFields(r)
}

func degradedFields(formID, engineID, reason string) map[string]any {
	r := extraction.DegradedResult(formID, engineID, reason)
	return extraction.HubFields(r)
}

func callbackBody(formID, eventID string, fieldsMap map[string]any) map[string]any {
	cbBody := map[string]any{
		"form_payment_id": formID,
		"action":          "ocr_recognized",
		"event_id":        eventID,
		"fields":          fieldsMap,
	}
	for k, v := range fieldsMap {
		cbBody[k] = v
	}
	return cbBody
}

func (p *Plugin) postRecognizedCallback(ctx context.Context, formID, eventID string, fieldsMap map[string]any) (map[string]any, error) {
	return remote.PostCoreCallback(ctx, p.coreURL, p.secret, p.timeout, callbackBody(formID, eventID, fieldsMap))
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
			out, postErr := remote.PostJSON(ctx, p.baseURL, p.timeout, contract)
			if postErr != nil {
				return postErr
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
		cb, cbErr := p.postRecognizedCallback(ctx, formID, eventID, fieldsMap)
		if cbErr != nil {
			return cbErr
		}
		result["core_callback"] = cb
		return nil
	})
	if err != nil {
		engineID := extraction.ClassifyOCRFailEngine(err)
		reason := "ocr_transport_failed"
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
			engineID = extraction.EngineTimeout
			reason = "ocr_timeout"
		}
		p.log.Warn("ocr recognize failed, degraded callback", "form_payment_id", formID, "err", err, "engine_id", engineID)
		fieldsMap := degradedFields(formID, engineID, reason)
		cbTimeout := p.timeout
		if cbTimeout <= 0 {
			cbTimeout = 5 * time.Second
		}
		cbCtx, cbCancel := context.WithTimeout(context.Background(), cbTimeout)
		defer cbCancel()
		cb, cbErr := p.postRecognizedCallback(cbCtx, formID, eventID, fieldsMap)
		if cbErr != nil {
			p.log.Error("ocr degraded callback failed", "form_payment_id", formID, "err", cbErr)
			return nil, err
		}
		return map[string]any{
			"status":         "recognized",
			"mode":           "degraded",
			"ml":             false,
			"fields":         fieldsMap,
			"contract":       contract,
			"core_callback":  cb,
			"degraded_error": err.Error(),
		}, nil
	}
	return result, nil
}

func (p *Plugin) HealthCheck(context.Context) error { return nil }
