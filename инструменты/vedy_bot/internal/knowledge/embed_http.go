package knowledge

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// CloudEmbedder calls an OpenAI-compatible /embeddings endpoint.
type CloudEmbedder struct {
	BaseURL    string
	APIKey     string
	Model      string
	HTTPClient *http.Client
}

type embedRequest struct {
	Model string   `json:"model"`
	Input []string `json:"input"`
}

type embedResponse struct {
	Data []struct {
		Embedding []float32 `json:"embedding"`
		Index     int       `json:"index"`
	} `json:"data"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// Embed posts texts to {base}/embeddings. Empty API key → error. Retries once with backoff (2 tries).
func (e *CloudEmbedder) Embed(ctx context.Context, texts []string) ([][]float32, error) {
	if e == nil {
		return nil, fmt.Errorf("embedder is nil")
	}
	key := strings.TrimSpace(e.APIKey)
	if key == "" {
		return nil, fmt.Errorf("embedding API key required")
	}
	base := strings.TrimRight(strings.TrimSpace(e.BaseURL), "/")
	if base == "" {
		return nil, fmt.Errorf("embedding base URL required")
	}
	model := strings.TrimSpace(e.Model)
	if model == "" {
		model = "text-embedding-3-small"
	}
	client := e.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 30 * time.Second}
	}
	body, err := json.Marshal(embedRequest{Model: model, Input: texts})
	if err != nil {
		return nil, err
	}
	url := base + "/embeddings"
	var lastErr error
	for attempt := 0; attempt < 2; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(200 * time.Millisecond * time.Duration(attempt)):
			}
		}
		vecs, err := e.doEmbed(ctx, client, url, key, body, len(texts))
		if err == nil {
			return vecs, nil
		}
		lastErr = err
	}
	return nil, lastErr
}

func (e *CloudEmbedder) doEmbed(ctx context.Context, client *http.Client, url, key string, body []byte, n int) ([][]float32, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+key)
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(res.Body, 8<<20))
	if err != nil {
		return nil, err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, fmt.Errorf("embeddings HTTP %d: %s", res.StatusCode, truncate(string(raw), 200))
	}
	var parsed embedResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return nil, fmt.Errorf("decode embeddings: %w", err)
	}
	if parsed.Error != nil && parsed.Error.Message != "" {
		return nil, fmt.Errorf("embeddings API: %s", parsed.Error.Message)
	}
	out := make([][]float32, n)
	for _, item := range parsed.Data {
		if item.Index < 0 || item.Index >= n {
			continue
		}
		out[item.Index] = item.Embedding
	}
	for i, v := range out {
		if len(v) == 0 {
			return nil, fmt.Errorf("missing embedding for input %d", i)
		}
	}
	return out, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
