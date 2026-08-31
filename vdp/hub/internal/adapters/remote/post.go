package remote

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

// PostJSON POSTs payload as JSON to url using the given timeout.
func PostJSON(ctx context.Context, url string, timeout time.Duration, payload map[string]any) (map[string]any, error) {
	return PostJSONHeaders(ctx, url, timeout, payload, nil)
}

// PostJSONHeaders POSTs JSON with optional extra headers (e.g. X-VDP-S2S).
func PostJSONHeaders(ctx context.Context, url string, timeout time.Duration, payload map[string]any, headers map[string]string) (map[string]any, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal payload: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http post: %w", err)
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("http status %d: %s", resp.StatusCode, string(respBody))
	}
	if len(respBody) == 0 {
		return map[string]any{"status": "accepted"}, nil
	}
	var out map[string]any
	if err := json.Unmarshal(respBody, &out); err != nil {
		return map[string]any{"status": "accepted", "raw": string(respBody)}, nil
	}
	return out, nil
}

// PostCoreCallback notifies core SM via s2s callback. Hub never writes core DB.
func PostCoreCallback(ctx context.Context, coreURL, secret string, timeout time.Duration, payload map[string]any) (map[string]any, error) {
	coreURL = strings.TrimRight(strings.TrimSpace(coreURL), "/")
	if coreURL == "" {
		return map[string]any{"status": "skipped", "reason": "no_core_url"}, nil
	}
	url := coreURL + "/api/v1/internal/hub/callback"
	headers := map[string]string{}
	if secret != "" {
		headers["X-VDP-S2S"] = secret
	}
	return PostJSONHeaders(ctx, url, timeout, payload, headers)
}

// StringParam extracts a string from params or nested payload.
func StringParam(params map[string]any, key string) string {
	if v, ok := params[key].(string); ok && v != "" {
		return v
	}
	if payload, ok := params["payload"].(map[string]any); ok {
		if v, ok := payload[key].(string); ok {
			return v
		}
	}
	return ""
}
