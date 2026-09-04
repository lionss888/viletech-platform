package githubforge

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/viletech/vdp/release-gate/internal/domain"
)

type Client struct {
	BaseURL    string
	Token      string
	Repo       string
	HTTPClient *http.Client
	Workflow   string
}

func New(baseURL, token, repo string) *Client {
	if baseURL == "" {
		baseURL = "https://api.github.com"
	}
	return &Client{
		BaseURL:    baseURL,
		Token:      token,
		Repo:       repo,
		HTTPClient: &http.Client{Timeout: 15 * time.Second},
		Workflow:   "vdp-deploy.yml",
	}
}

func (c *Client) Name() string { return "github" }

func (c *Client) ListReleases(ctx context.Context) ([]domain.Release, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.BaseURL+"/repos/"+c.Repo+"/releases?per_page=20", nil)
	if err != nil {
		return nil, err
	}
	var payload []struct {
		TagName string `json:"tag_name"`
		Name    string `json:"name"`
		Body    string `json:"body"`
	}
	if err := c.do(req, &payload); err != nil {
		return nil, err
	}
	out := make([]domain.Release, 0, len(payload))
	for _, item := range payload {
		out = append(out, domain.Release{
			Tag:       item.TagName,
			Title:     item.Name,
			IsProduct: domain.IsProductTag(item.TagName),
		})
	}
	return out, nil
}

func (c *Client) DispatchDeploy(ctx context.Context, env domain.Environment, imagesRunID string) error {
	body, err := json.Marshal(map[string]any{
		"ref": "main",
		"inputs": map[string]string{
			"environment":   string(env),
			"images_run_id": imagesRunID,
		},
	})
	if err != nil {
		return err
	}
	url := fmt.Sprintf("%s/repos/%s/actions/workflows/%s/dispatches", c.BaseURL, c.Repo, c.Workflow)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	return c.do(req, nil)
}

func (c *Client) SetSchedule(ctx context.Context, env domain.Environment, mode, window string) error {
	name := "DEPLOY_MODE_" + string(env)
	return c.patchVariable(ctx, name, mode, window)
}

func (c *Client) SetApprovers(ctx context.Context, env domain.Environment, logins []string) error {
	body, err := json.Marshal(map[string]any{
		"wait_timer":           0,
		"prevent_self_review":  false,
		"reviewers":            logins,
	})
	if err != nil {
		return err
	}
	url := fmt.Sprintf("%s/repos/%s/environments/%s", c.BaseURL, c.Repo, env)
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	return c.do(req, nil)
}

func (c *Client) patchVariable(ctx context.Context, name, mode, window string) error {
	payload := map[string]string{"name": name, "value": mode}
	if window != "" {
		payload["window"] = window
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	url := fmt.Sprintf("%s/repos/%s/actions/variables/%s", c.BaseURL, c.Repo, name)
	req, err := http.NewRequestWithContext(ctx, http.MethodPatch, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	return c.do(req, nil)
}

func (c *Client) do(req *http.Request, dest any) error {
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("Authorization", "Bearer "+c.Token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode == http.StatusConflict {
		return fmt.Errorf("github conflict: %s", bytes.TrimSpace(raw))
	}
	if resp.StatusCode >= 300 {
		return fmt.Errorf("github status %d: %s", resp.StatusCode, bytes.TrimSpace(raw))
	}
	if dest == nil || len(raw) == 0 {
		return nil
	}
	return json.Unmarshal(raw, dest)
}
