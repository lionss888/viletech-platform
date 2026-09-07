package engine

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/viletech/vdp/shared/extraction"
)

// Primary extracts ExtractionResult for client prefill.
type Primary interface {
	Name() string
	Extract(ctx context.Context, in Input) (extraction.Result, error)
}

// Shadow extracts for gold only.
type Shadow interface {
	Name() string
	Extract(ctx context.Context, in Input) (extraction.Result, error)
}

// Input is recognition request payload.
type Input struct {
	FormPaymentID  string
	EventID        string
	OrganizationID string
	FileName       string
	Mime           string
	Content        []byte
	ContentB64     string
	LayoutText     string
	Kind           string
}

// FixturePrimary always returns schema v1 fixture.
type FixturePrimary struct{}

func (FixturePrimary) Name() string { return "fixture" }

func (FixturePrimary) Extract(_ context.Context, in Input) (extraction.Result, error) {
	r := extraction.FixtureResult(in.FormPaymentID)
	r.Meta.EventID = in.EventID
	r.Meta.SourceFileID = in.FileName
	return r, nil
}

// StubShadow returns a low-confidence variant for flywheel.
type StubShadow struct{}

func (StubShadow) Name() string { return "stub" }

func (StubShadow) Extract(_ context.Context, in Input) (extraction.Result, error) {
	r := extraction.FixtureResult(in.FormPaymentID)
	r.Meta.EngineID = "stub"
	r.Meta.ModelVersion = "stub-0"
	r.Confidence = 0.2
	r.Warnings = []string{"shadow_stub"}
	r.Meta.EventID = in.EventID
	return r, nil
}

// OwnStub is EXTRACTION_PRIMARY=own before real artifact.
type OwnStub struct{}

func (OwnStub) Name() string { return "own" }

func (OwnStub) Extract(_ context.Context, in Input) (extraction.Result, error) {
	r := extraction.FixtureResult(in.FormPaymentID)
	r.Meta.EngineID = "own"
	r.Meta.ModelVersion = "own-stub-0"
	r.Warnings = append(r.Warnings, "own_stub_until_eval")
	r.Meta.EventID = in.EventID
	return r, nil
}

// YandexPrimary calls Vision OCR (when needed) + Foundation Models completion.
type YandexPrimary struct {
	APIKey    string
	FolderID  string
	ModelURI  string
	HTTP      *http.Client
	OCRBase   string
	LLMBase   string
}

func NewYandex(apiKey, folderID, modelURI string) *YandexPrimary {
	return &YandexPrimary{
		APIKey:   apiKey,
		FolderID: folderID,
		ModelURI: modelURI,
		HTTP:     &http.Client{Timeout: 90 * time.Second},
		OCRBase:  "https://ocr.api.cloud.yandex.net/ocr/v1",
		LLMBase:  "https://llm.api.cloud.yandex.net/foundationModels/v1",
	}
}

func (y *YandexPrimary) Name() string { return "yandex" }

func (y *YandexPrimary) Extract(ctx context.Context, in Input) (extraction.Result, error) {
	text := in.LayoutText
	if len(strings.TrimSpace(text)) < 40 && len(in.Content) > 0 {
		ocrText, err := y.recognizeOCR(ctx, in)
		if err != nil {
			return extraction.Result{}, err
		}
		text = ocrText
	}
	if strings.TrimSpace(text) == "" {
		text = "(empty document text)"
	}
	return y.extractFields(ctx, in, text)
}

func (y *YandexPrimary) recognizeOCR(ctx context.Context, in Input) (string, error) {
	content := in.Content
	if len(content) == 0 && in.ContentB64 != "" {
		raw, err := base64.StdEncoding.DecodeString(in.ContentB64)
		if err != nil {
			return "", err
		}
		content = raw
	}
	body := map[string]any{
		"mimeType": mimeFor(in.Mime, in.FileName),
		"languageCodes": []string{"*"},
		"model": "page",
		"content": base64.StdEncoding.EncodeToString(content),
	}
	raw, err := y.postJSON(ctx, y.OCRBase+"/recognizeText", body)
	if err != nil {
		// try async path marker — return error for caller fallback
		return "", err
	}
	return collectOCRText(raw), nil
}

func (y *YandexPrimary) extractFields(ctx context.Context, in Input, text string) (extraction.Result, error) {
	modelURI := y.ModelURI
	if modelURI == "" {
		modelURI = "gpt://" + y.FolderID + "/yandexgpt-lite"
	}
	prompt := `Extract invoice fields as JSON only matching schema:
{"schema_version":"v1","doc_type":"invoice","language":"","confidence":0.0,"header":{"contract_number":"","contract_date":"","invoice_number":"","invoice_date":"","invoice_amount":"","currency":"","company_name":"","company_address":"","bank_name":"","bank_country":"","bank_address":"","bank_account":"","swift_code":"","hs_codes":[]},"line_items":[{"line_no":1,"description":"","qty":"","unit":"","unit_price":"","line_amount":"","currency":"","hs_code":"","confidence":0.0}],"meta":{"engine_id":"yandex","model_version":"","form_payment_id":""},"warnings":[]}
Use ISO dates when possible. Include all line items. Document text:
` + truncate(text, 12000)
	body := map[string]any{
		"modelUri": modelURI,
		"completionOptions": map[string]any{
			"stream":      false,
			"temperature": 0.1,
			"maxTokens":   "8000",
		},
		"messages": []map[string]string{
			{"role": "user", "text": prompt},
		},
	}
	raw, err := y.postJSON(ctx, y.LLMBase+"/completion", body)
	if err != nil {
		return extraction.Result{}, err
	}
	textOut := collectCompletionText(raw)
	jsonPart := extractJSONObject(textOut)
	r, err := extraction.ParseResult([]byte(jsonPart))
	if err != nil {
		return extraction.Result{}, fmt.Errorf("parse model json: %w", err)
	}
	r.Meta.EngineID = "yandex"
	r.Meta.FormPaymentID = in.FormPaymentID
	r.Meta.EventID = in.EventID
	r.Meta.ModelVersion = modelURI
	r.Meta.ContentHash = extraction.ContentHash(r)
	return r, nil
}

func (y *YandexPrimary) postJSON(ctx context.Context, url string, body any) (map[string]any, error) {
	b, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Api-Key "+y.APIKey)
	if y.FolderID != "" {
		req.Header.Set("x-folder-id", y.FolderID)
	}
	res, err := y.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	data, _ := io.ReadAll(res.Body)
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("yandex %s: %s", res.Status, truncate(string(data), 300))
	}
	var out map[string]any
	if err := json.Unmarshal(data, &out); err != nil {
		return nil, err
	}
	return out, nil
}

// DoclingShadow POSTs file text to EXTRACTION_SHADOW_URL.
type DoclingShadow struct {
	URL  string
	HTTP *http.Client
}

func (d DoclingShadow) Name() string { return "docling" }

func (d DoclingShadow) Extract(ctx context.Context, in Input) (extraction.Result, error) {
	body := map[string]any{
		"form_payment_id": in.FormPaymentID,
		"event_id":        in.EventID,
		"file_name":       in.FileName,
		"text":            in.LayoutText,
	}
	b, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, d.URL, bytes.NewReader(b))
	if err != nil {
		return extraction.Result{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	client := d.HTTP
	if client == nil {
		client = &http.Client{Timeout: 60 * time.Second}
	}
	res, err := client.Do(req)
	if err != nil {
		return extraction.Result{}, err
	}
	defer res.Body.Close()
	data, _ := io.ReadAll(res.Body)
	if res.StatusCode >= 300 {
		return extraction.Result{}, fmt.Errorf("shadow %s", res.Status)
	}
	var wrap struct {
		Result extraction.Result `json:"result"`
	}
	if err := json.Unmarshal(data, &wrap); err == nil && wrap.Result.Meta.EngineID != "" {
		return wrap.Result, nil
	}
	r, err := extraction.ParseResult(data)
	if err != nil {
		return StubShadow{}.Extract(ctx, in)
	}
	return r, nil
}

// OwnFromArtifact loads metrics.json marker and returns fixture-shaped result tagged with version.
// Prefer OllamaPrimary when OLLAMA_BASE_URL is set; this path is offline marker only.
type OwnFromArtifact struct {
	Path string
}

func (o OwnFromArtifact) Name() string { return "own" }

func (o OwnFromArtifact) Extract(_ context.Context, in Input) (extraction.Result, error) {
	r := extraction.FixtureResult(in.FormPaymentID)
	r.Meta.EngineID = "own"
	r.Meta.ModelVersion = "artifact"
	if o.Path != "" {
		raw, err := osReadFile(o.Path + "/metrics.json")
		if err == nil {
			var m map[string]any
			_ = json.Unmarshal(raw, &m)
			if v, ok := m["model_version"].(string); ok && v != "" {
				r.Meta.ModelVersion = v
			}
			if v, ok := m["ollama_model"].(string); ok && v != "" {
				r.Meta.ModelVersion = v
			}
		}
	}
	r.Meta.EventID = in.EventID
	r.Warnings = []string{"own_artifact"}
	return r, nil
}

// OllamaModelFromArtifact reads preferred Ollama tag from metrics.json.
func OllamaModelFromArtifact(path, fallback string) string {
	if path == "" {
		return fallback
	}
	raw, err := osReadFile(path + "/metrics.json")
	if err != nil {
		return fallback
	}
	var m map[string]any
	if json.Unmarshal(raw, &m) != nil {
		return fallback
	}
	if v, ok := m["ollama_model"].(string); ok && v != "" {
		return v
	}
	return fallback
}

func osReadFile(p string) ([]byte, error) { return osRead(p) }
