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

// DocTRPrimary calls the doctr-serve HTTP sidecar and maps text to ExtractionResult.
type DocTRPrimary struct {
	BaseURL string
	HTTP    *http.Client
}

// NewDocTR builds a FALLBACK (or PRIMARY) engine pointed at doctr-serve (e.g. http://doctr:5002).
func NewDocTR(baseURL string) *DocTRPrimary {
	return &DocTRPrimary{
		BaseURL: strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		HTTP:    &http.Client{Timeout: 70 * time.Second},
	}
}

func (d *DocTRPrimary) Name() string { return "doctr" }

func (d *DocTRPrimary) Extract(ctx context.Context, in Input) (extraction.Result, error) {
	text := strings.TrimSpace(in.LayoutText)
	if len(in.Content) > 0 || in.ContentB64 != "" {
		ocr, err := d.ocr(ctx, in)
		if err != nil {
			return extraction.Result{}, err
		}
		if strings.TrimSpace(ocr) != "" {
			text = ocr
		}
	}
	if text == "" {
		return extraction.Result{}, fmt.Errorf("doctr: empty document text")
	}
	return MapInvoiceText(in, text, "doctr"), nil
}

func (d *DocTRPrimary) ocr(ctx context.Context, in Input) (string, error) {
	if d.BaseURL == "" {
		return "", fmt.Errorf("doctr base url empty")
	}
	content := in.Content
	if len(content) == 0 && in.ContentB64 != "" {
		raw, err := base64.StdEncoding.DecodeString(in.ContentB64)
		if err != nil {
			return "", err
		}
		content = raw
	}
	if len(content) == 0 {
		return "", fmt.Errorf("no document content")
	}
	// Plain text payloads skip the sidecar.
	mime := strings.ToLower(in.Mime)
	name := strings.ToLower(in.FileName)
	if strings.HasPrefix(mime, "text/") || strings.HasSuffix(name, ".txt") {
		return string(content), nil
	}
	fileName := in.FileName
	if fileName == "" {
		fileName = "document.bin"
	}
	body := map[string]any{
		"filename":      fileName,
		"mime":          mimeFor(in.Mime, fileName),
		"base64_string": base64.StdEncoding.EncodeToString(content),
	}
	raw, err := d.postJSON(ctx, d.BaseURL+"/v1/ocr", body)
	if err != nil {
		return "", err
	}
	if v, ok := raw["text"].(string); ok {
		return v, nil
	}
	return "", fmt.Errorf("doctr: missing text in response")
}

func (d *DocTRPrimary) postJSON(ctx context.Context, url string, body any) (map[string]any, error) {
	b, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	client := d.HTTP
	if client == nil {
		client = &http.Client{Timeout: 70 * time.Second}
	}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	data, _ := io.ReadAll(res.Body)
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("doctr %s: %s", res.Status, truncate(string(data), 300))
	}
	var out map[string]any
	if err := json.Unmarshal(data, &out); err != nil {
		return nil, err
	}
	return out, nil
}
