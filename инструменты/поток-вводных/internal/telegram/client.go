package telegram

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Client talks to Telegram Bot API.
type Client struct {
	token      string
	httpClient *http.Client
	baseURL    string
}

// New creates a client with timeout.
func New(token string, timeout time.Duration) *Client {
	if timeout <= 0 {
		timeout = 15 * time.Second
	}
	return &Client{
		token:      token,
		httpClient: &http.Client{Timeout: timeout + 35*time.Second},
		baseURL:    "https://api.telegram.org",
	}
}

// SetBaseURL overrides API host (tests).
func (c *Client) SetBaseURL(u string) { c.baseURL = strings.TrimRight(u, "/") }

// Update is a minimal getUpdates item.
type Update struct {
	UpdateID int64    `json:"update_id"`
	Message  *Message `json:"message"`
}

// Message is a Telegram message subset.
type Message struct {
	MessageID int64    `json:"message_id"`
	Date      int64    `json:"date"`
	Text      string   `json:"text"`
	Chat      Chat     `json:"chat"`
	From      *User    `json:"from"`
	Entities  []Entity `json:"entities"`
}

// Chat holds chat id.
type Chat struct {
	ID int64 `json:"id"`
}

// User is the sender.
type User struct {
	ID       int64  `json:"id"`
	Username string `json:"username"`
}

// Entity is a text entity.
type Entity struct {
	Type   string `json:"type"`
	Offset int    `json:"offset"`
	Length int    `json:"length"`
}

// GetUpdates long-polls for updates.
func (c *Client) GetUpdates(ctx context.Context, offset int64, timeoutSec int) ([]Update, error) {
	q := url.Values{}
	if offset > 0 {
		q.Set("offset", strconv.FormatInt(offset, 10))
	}
	if timeoutSec > 0 {
		q.Set("timeout", strconv.Itoa(timeoutSec))
	}
	q.Set("allowed_updates", `["message"]`)
	var wrap struct {
		OK          bool     `json:"ok"`
		Result      []Update `json:"result"`
		Description string   `json:"description"`
	}
	if err := c.get(ctx, "getUpdates", q, &wrap); err != nil {
		return nil, err
	}
	if !wrap.OK {
		return nil, fmt.Errorf("getUpdates: %s", wrap.Description)
	}
	return wrap.Result, nil
}

// SendMessage posts a reply; replyTo may be 0.
func (c *Client) SendMessage(ctx context.Context, chatID, replyTo int64, text string) error {
	form := url.Values{}
	form.Set("chat_id", strconv.FormatInt(chatID, 10))
	form.Set("text", text)
	form.Set("disable_web_page_preview", "true")
	if replyTo > 0 {
		form.Set("reply_to_message_id", strconv.FormatInt(replyTo, 10))
	}
	var wrap struct {
		OK          bool   `json:"ok"`
		Description string `json:"description"`
	}
	if err := c.postForm(ctx, "sendMessage", form, &wrap); err != nil {
		return err
	}
	if !wrap.OK {
		return fmt.Errorf("sendMessage: %s", wrap.Description)
	}
	return nil
}

func (c *Client) get(ctx context.Context, method string, q url.Values, out any) error {
	u := fmt.Sprintf("%s/bot%s/%s", c.baseURL, c.token, method)
	if len(q) > 0 {
		u += "?" + q.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return err
	}
	return c.do(req, out)
}

func (c *Client) postForm(ctx context.Context, method string, form url.Values, out any) error {
	u := fmt.Sprintf("%s/bot%s/%s", c.baseURL, c.token, method)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u, strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	return c.do(req, out)
}

func (c *Client) do(req *http.Request, out any) error {
	var last error
	for attempt := 0; attempt < 4; attempt++ {
		res, err := c.httpClient.Do(req)
		if err != nil {
			last = err
			time.Sleep(time.Duration(1<<attempt) * 200 * time.Millisecond)
			continue
		}
		body, err := io.ReadAll(res.Body)
		res.Body.Close()
		if err != nil {
			return err
		}
		if res.StatusCode == 429 || res.StatusCode >= 500 {
			last = fmt.Errorf("telegram status %d", res.StatusCode)
			time.Sleep(time.Duration(1<<attempt) * 300 * time.Millisecond)
			continue
		}
		if res.StatusCode >= 300 {
			return fmt.Errorf("telegram status %d: %s", res.StatusCode, truncate(string(body), 200))
		}
		if out == nil {
			return nil
		}
		return json.Unmarshal(body, out)
	}
	return last
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
