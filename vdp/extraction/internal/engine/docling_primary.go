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

// DoclingPrimary converts documents via docling-serve and maps text to ExtractionResult.
type DoclingPrimary struct {
	BaseURL string
	HTTP    *http.Client
}

// NewDocling builds a PRIMARY engine pointed at docling-serve (e.g. http://docling:5001).
func NewDocling(baseURL string) *DoclingPrimary {
	return &DoclingPrimary{
		BaseURL: strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		// Budget A: leave room for doctr FALLBACK within GATEWAY/OCR 180s.
		HTTP: &http.Client{Timeout: 90 * time.Second},
	}
}

func (d *DoclingPrimary) Name() string { return "docling" }

func (d *DoclingPrimary) Extract(ctx context.Context, in Input) (extraction.Result, error) {
	text := strings.TrimSpace(in.LayoutText)
	if len(in.Content) > 0 || in.ContentB64 != "" {
		md, err := d.convert(ctx, in)
		if err != nil {
			return extraction.Result{}, err
		}
		if strings.TrimSpace(md) != "" {
			text = md
		}
	}
	if text == "" {
		text = "(empty document text)"
	}
	return MapInvoiceText(in, text, "docling"), nil
}

func (d *DoclingPrimary) convert(ctx context.Context, in Input) (string, error) {
	if d.BaseURL == "" {
		return "", fmt.Errorf("docling base url empty")
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
	fileName := in.FileName
	if fileName == "" {
		fileName = "document.bin"
	}
	body := map[string]any{
		"options": map[string]any{
			"to_formats": []string{"md", "text"},
			"do_ocr":     true,
		},
		"sources": []map[string]any{
			{
				"kind":          "file",
				"base64_string": base64.StdEncoding.EncodeToString(content),
				"filename":      fileName,
			},
		},
	}
	raw, err := d.postJSON(ctx, d.BaseURL+"/v1/convert/source", body)
	if err != nil {
		return "", err
	}
	return collectDoclingMarkdown(raw), nil
}

func (d *DoclingPrimary) postJSON(ctx context.Context, url string, body any) (map[string]any, error) {
	b, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	client := d.HTTP
	if client == nil {
		client = &http.Client{Timeout: 90 * time.Second}
	}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	data, _ := io.ReadAll(res.Body)
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("docling %s: %s", res.Status, truncate(string(data), 300))
	}
	var out map[string]any
	if err := json.Unmarshal(data, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func collectDoclingMarkdown(raw map[string]any) string {
	if doc, ok := raw["document"].(map[string]any); ok {
		if v, ok := doc["md_content"].(string); ok && strings.TrimSpace(v) != "" {
			return v
		}
		if v, ok := doc["text_content"].(string); ok && strings.TrimSpace(v) != "" {
			return v
		}
	}
	if v, ok := raw["md_content"].(string); ok {
		return v
	}
	if v, ok := raw["text_content"].(string); ok {
		return v
	}
	return ""
}
