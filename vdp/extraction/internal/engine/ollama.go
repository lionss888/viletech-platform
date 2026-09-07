package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/viletech/vdp/shared/extraction"
)

// FewShotSource supplies confirmed gold examples for prompting (no PII dump in logs).
type FewShotSource interface {
	RecentConfirmed(k int) ([]extraction.GoldRecord, error)
}

// OllamaPrimary calls local/host Ollama for schema v1 JSON extraction.
type OllamaPrimary struct {
	BaseURL  string
	Model    string
	FewShotK int
	FewShot  FewShotSource
	HTTP     *http.Client
	Log      *slog.Logger
}

func NewOllama(baseURL, model string, fewShotK int, src FewShotSource) *OllamaPrimary {
	if model == "" {
		model = "qwen2.5:3b"
	}
	if fewShotK < 0 {
		fewShotK = 0
	}
	if fewShotK > 8 {
		fewShotK = 8
	}
	return &OllamaPrimary{
		BaseURL:  strings.TrimRight(baseURL, "/"),
		Model:    model,
		FewShotK: fewShotK,
		FewShot:  src,
		HTTP:     &http.Client{Timeout: 120 * time.Second},
		Log:      slog.Default(),
	}
}

func (o *OllamaPrimary) Name() string { return "own" }

func (o *OllamaPrimary) Extract(ctx context.Context, in Input) (extraction.Result, error) {
	text := strings.TrimSpace(in.LayoutText)
	if text == "" && len(in.Content) > 0 {
		text = string(in.Content)
	}
	if text == "" {
		text = "(empty document text)"
	}
	prompt := o.buildPrompt(text)
	if o.Log != nil {
		o.Log.Info("ollama extract", "model", o.Model, "layout_len", len(text), "few_shot_k", o.FewShotK)
	}
	raw, err := o.chat(ctx, prompt)
	if err != nil {
		return extraction.Result{}, err
	}
	jsonPart := extractJSONObject(raw)
	r, err := extraction.ParseResult([]byte(jsonPart))
	if err != nil {
		return extraction.Result{}, fmt.Errorf("parse ollama json: %w", err)
	}
	r.Meta.EngineID = "own"
	r.Meta.ModelVersion = o.Model
	r.Meta.FormPaymentID = in.FormPaymentID
	r.Meta.EventID = in.EventID
	r.Meta.ContentHash = extraction.ContentHash(r)
	return r, nil
}

func (o *OllamaPrimary) buildPrompt(layout string) string {
	var b strings.Builder
	b.WriteString(`Extract invoice fields as JSON only matching schema:
{"schema_version":"v1","doc_type":"invoice","language":"","confidence":0.0,"header":{"contract_number":"","contract_date":"","invoice_number":"","invoice_date":"","invoice_amount":"","currency":"","company_name":"","company_address":"","bank_name":"","bank_country":"","bank_address":"","bank_account":"","swift_code":"","hs_codes":[]},"line_items":[{"line_no":1,"description":"","qty":"","unit":"","unit_price":"","line_amount":"","currency":"","hs_code":"","confidence":0.0}],"meta":{"engine_id":"own","model_version":"","form_payment_id":""},"warnings":[]}
Use ISO dates when possible. Include all line items.
`)
	if o.FewShot != nil && o.FewShotK > 0 {
		recs, err := o.FewShot.RecentConfirmed(o.FewShotK)
		if err == nil {
			for i, rec := range recs {
				if rec.HumanOut == nil {
					continue
				}
				exLayout := truncate(rec.LayoutText, 1500)
				if exLayout == "" {
					exLayout = "(no layout)"
				}
				hum, _ := json.Marshal(rec.HumanOut)
				fmt.Fprintf(&b, "\nExample %d layout:\n%s\nExample %d JSON:\n%s\n", i+1, exLayout, i+1, truncate(string(hum), 2000))
			}
		}
	}
	b.WriteString("\nDocument text:\n")
	b.WriteString(truncate(layout, 12000))
	return b.String()
}

func (o *OllamaPrimary) chat(ctx context.Context, prompt string) (string, error) {
	body := map[string]any{
		"model":  o.Model,
		"stream": false,
		"format": "json",
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	}
	b, _ := json.Marshal(body)
	url := o.BaseURL + "/api/chat"
	var lastErr error
	for attempt := 0; attempt < 2; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(b))
		if err != nil {
			return "", err
		}
		req.Header.Set("Content-Type", "application/json")
		res, err := o.HTTP.Do(req)
		if err != nil {
			lastErr = err
			continue
		}
		data, _ := io.ReadAll(res.Body)
		_ = res.Body.Close()
		if res.StatusCode >= 300 {
			lastErr = fmt.Errorf("ollama %s: %s", res.Status, truncate(string(data), 300))
			continue
		}
		var out struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
			Response string `json:"response"`
		}
		if err := json.Unmarshal(data, &out); err != nil {
			return "", err
		}
		if out.Message.Content != "" {
			return out.Message.Content, nil
		}
		if out.Response != "" {
			return out.Response, nil
		}
		return string(data), nil
	}
	return "", lastErr
}
