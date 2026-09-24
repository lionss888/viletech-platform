package service

import (
	"context"
	"net/http"
	"strings"
	"time"
)

// ProbeDoclingReachable GETs docling /health with a short timeout.
func ProbeDoclingReachable(ctx context.Context, doclingURL string, client *http.Client) bool {
	return ProbeHTTPReachable(ctx, doclingURL, client)
}

// ProbeHTTPReachable GETs {base}/health with a short timeout.
func ProbeHTTPReachable(ctx context.Context, baseURL string, client *http.Client) bool {
	base := strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if base == "" {
		return false
	}
	if client == nil {
		client = &http.Client{Timeout: 2 * time.Second}
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+"/health", nil)
	if err != nil {
		return false
	}
	resp, err := client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode >= 200 && resp.StatusCode < 300
}
