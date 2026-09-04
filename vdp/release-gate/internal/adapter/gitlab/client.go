package gitlabforge

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/viletech/vdp/release-gate/internal/domain"
)

type Client struct {
	BaseURL    string
	Token      string
	ProjectID  string
	HTTPClient *http.Client
}

func New(baseURL, token, projectID string) *Client {
	if baseURL == "" {
		baseURL = "https://gitlab.com/api/v4"
	}
	return &Client{
		BaseURL:    baseURL,
		Token:      token,
		ProjectID:  url.PathEscape(projectID),
		HTTPClient: &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *Client) Name() string { return "gitlab" }

func (c *Client) ListReleases(ctx context.Context) ([]domain.Release, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.BaseURL+"/projects/"+c.ProjectID+"/releases", nil)
	if err != nil {
		return nil, err
	}
	var payload []struct {
		TagName string `json:"tag_name"`
		Name    string `json:"name"`
	}
	if err := c.do(req, &payload); err != nil {
		return nil, err
	}
	out := make([]domain.Release, 0, len(payload))
	for _, item := range payload {
		out = append(out, domain.Release{Tag: item.TagName, Title: item.Name, IsProduct: domain.IsProductTag(item.TagName)})
	}
	return out, nil
}

func (c *Client) DispatchDeploy(ctx context.Context, env domain.Environment, imagesRunID string) error {
	body, err := json.Marshal(map[string]any{
		"ref": "main",
		"variables": []map[string]string{
			{"key": "DEPLOY_ENVIRONMENT", "value": string(env)},
			{"key": "IMAGES_RUN_ID", "value": imagesRunID},
			{"key": "DEPLOY_ACTION", "value": "promote"},
		},
	})
	if err != nil {
		return err
	}
	url := c.BaseURL + "/projects/" + c.ProjectID + "/pipeline"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	return c.do(req, nil)
}

func (c *Client) SetSchedule(ctx context.Context, env domain.Environment, mode, window string) error {
	body, err := json.Marshal(map[string]string{
		"key":   "DEPLOY_MODE_" + string(env),
		"value": mode + " " + window,
	})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+"/projects/"+c.ProjectID+"/variables", bytes.NewReader(body))
	if err != nil {
		return err
	}
	return c.do(req, nil)
}

func (c *Client) SetApprovers(ctx context.Context, env domain.Environment, logins []string) error {
	body, err := json.Marshal(map[string]any{"approvers": logins, "environment": env})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, c.BaseURL+"/projects/"+c.ProjectID+"/environments/"+string(env), bytes.NewReader(body))
	if err != nil {
		return err
	}
	return c.do(req, nil)
}

func (c *Client) do(req *http.Request, dest any) error {
	req.Header.Set("PRIVATE-TOKEN", c.Token)
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
		return fmt.Errorf("gitlab conflict: %s", bytes.TrimSpace(raw))
	}
	if resp.StatusCode >= 300 {
		return fmt.Errorf("gitlab status %d: %s", resp.StatusCode, bytes.TrimSpace(raw))
	}
	if dest == nil || len(raw) == 0 {
		return nil
	}
	return json.Unmarshal(raw, dest)
}
