package corehttp

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/viletech/vdp/shared/managerops"
)

// Client talks to VDP core over HTTP (no shared DB).
type Client struct {
	baseURL    string
	secret     string
	httpClient *http.Client
}

// New creates a core HTTP client. Empty baseURL disables remote calls.
func New(baseURL, sharedSecret string, timeout time.Duration) *Client {
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	return &Client{
		baseURL: strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		secret:  sharedSecret,
		httpClient: &http.Client{Timeout: timeout},
	}
}

// ListWorkChats fetches admin/work-chat catalog via internal or public list.
// Uses GET /api/v1/work-chats when S2S is not available for admin joins.
func (c *Client) ListWorkChats(ctx context.Context) ([]managerops.WorkChatRef, error) {
	if c.baseURL == "" {
		return nil, fmt.Errorf("CORE_URL not configured")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/api/v1/work-chats", nil)
	if err != nil {
		return nil, err
	}
	if c.secret != "" {
		req.Header.Set("X-Hub-Shared-Secret", c.secret)
	}
	res, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("core work-chats status %d", res.StatusCode)
	}
	var raw []struct {
		ID     string `json:"id"`
		Title  string `json:"title"`
		ChatID string `json:"chat_id"`
		Kind   string `json:"kind"`
		Active bool   `json:"active"`
	}
	if err := json.NewDecoder(res.Body).Decode(&raw); err != nil {
		return nil, err
	}
	out := make([]managerops.WorkChatRef, 0, len(raw))
	for _, r := range raw {
		out = append(out, managerops.WorkChatRef{
			ID: r.ID, Title: r.Title, ChatID: r.ChatID, Kind: r.Kind, Active: r.Active,
		})
	}
	return out, nil
}
