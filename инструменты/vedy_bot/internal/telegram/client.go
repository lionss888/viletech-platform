package telegram

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
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
	MessageID int64     `json:"message_id"`
	Date      int64     `json:"date"`
	Text      string    `json:"text"`
	Caption   string    `json:"caption"`
	Chat      Chat      `json:"chat"`
	From      *User     `json:"from"`
	Entities  []Entity  `json:"entities"`
	Photo     []PhotoSize `json:"photo"`
	Document  *Document `json:"document"`
	Video     *Video    `json:"video"`
}

// PhotoSize is one photo variant.
type PhotoSize struct {
	FileID   string `json:"file_id"`
	FileUniqueID string `json:"file_unique_id"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
	FileSize int    `json:"file_size"`
}

// Document is a Telegram document.
type Document struct {
	FileID   string `json:"file_id"`
	FileName string `json:"file_name"`
	MimeType string `json:"mime_type"`
	FileSize int    `json:"file_size"`
}

// Video is a Telegram video.
type Video struct {
	FileID   string `json:"file_id"`
	MimeType string `json:"mime_type"`
	FileSize int    `json:"file_size"`
	FileName string `json:"file_name"`
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

// FileMeta is getFile result.
type FileMeta struct {
	FileID   string `json:"file_id"`
	FilePath string `json:"file_path"`
	FileSize int    `json:"file_size"`
}

// PrimaryText returns text or caption.
func (m *Message) PrimaryText() string {
	if m == nil {
		return ""
	}
	if strings.TrimSpace(m.Text) != "" {
		return m.Text
	}
	return m.Caption
}

// BestPhotoFileID returns largest photo file_id.
func (m *Message) BestPhotoFileID() string {
	if m == nil || len(m.Photo) == 0 {
		return ""
	}
	best := m.Photo[0]
	for _, p := range m.Photo[1:] {
		if p.FileSize > best.FileSize || (p.Width*p.Height) > (best.Width*best.Height) {
			best = p
		}
	}
	return best.FileID
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

// SendMessage posts a reply; replyTo may be 0. Returns Telegram message_id.
func (c *Client) SendMessage(ctx context.Context, chatID, replyTo int64, text string) (int64, error) {
	form := url.Values{}
	form.Set("chat_id", strconv.FormatInt(chatID, 10))
	form.Set("text", text)
	form.Set("disable_web_page_preview", "true")
	if replyTo > 0 {
		form.Set("reply_to_message_id", strconv.FormatInt(replyTo, 10))
	}
	var wrap struct {
		OK          bool `json:"ok"`
		Result      struct {
			MessageID int64 `json:"message_id"`
		} `json:"result"`
		Description string `json:"description"`
	}
	if err := c.postForm(ctx, "sendMessage", form, &wrap); err != nil {
		return 0, err
	}
	if !wrap.OK {
		return 0, fmt.Errorf("sendMessage: %s", wrap.Description)
	}
	return wrap.Result.MessageID, nil
}

// DeleteMessage removes a chat message.
func (c *Client) DeleteMessage(ctx context.Context, chatID, messageID int64) error {
	form := url.Values{}
	form.Set("chat_id", strconv.FormatInt(chatID, 10))
	form.Set("message_id", strconv.FormatInt(messageID, 10))
	var wrap struct {
		OK          bool   `json:"ok"`
		Description string `json:"description"`
	}
	if err := c.postForm(ctx, "deleteMessage", form, &wrap); err != nil {
		return err
	}
	if !wrap.OK {
		return fmt.Errorf("deleteMessage: %s", wrap.Description)
	}
	return nil
}

// GetFile resolves a file_id to download path.
func (c *Client) GetFile(ctx context.Context, fileID string) (FileMeta, error) {
	q := url.Values{}
	q.Set("file_id", fileID)
	var wrap struct {
		OK          bool     `json:"ok"`
		Result      FileMeta `json:"result"`
		Description string   `json:"description"`
	}
	if err := c.get(ctx, "getFile", q, &wrap); err != nil {
		return FileMeta{}, err
	}
	if !wrap.OK {
		return FileMeta{}, fmt.Errorf("getFile: %s", wrap.Description)
	}
	return wrap.Result, nil
}

// DownloadFile downloads bytes for a getFile path.
func (c *Client) DownloadFile(ctx context.Context, filePath string) ([]byte, error) {
	u := fmt.Sprintf("%s/file/bot%s/%s", c.baseURL, c.token, strings.TrimPrefix(filePath, "/"))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	res, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(res.Body, 200))
		return nil, fmt.Errorf("download status %d: %s", res.StatusCode, string(b))
	}
	return io.ReadAll(res.Body)
}

// SendPhoto uploads a photo with optional caption.
func (c *Client) SendPhoto(ctx context.Context, chatID int64, filename string, data []byte, caption string) (int64, error) {
	return c.sendMultipart(ctx, "sendPhoto", chatID, "photo", filename, data, caption)
}

// SendDocument uploads a document with optional caption.
func (c *Client) SendDocument(ctx context.Context, chatID int64, filename string, data []byte, caption string) (int64, error) {
	return c.sendMultipart(ctx, "sendDocument", chatID, "document", filename, data, caption)
}

// SendVideo uploads a video with optional caption.
func (c *Client) SendVideo(ctx context.Context, chatID int64, filename string, data []byte, caption string) (int64, error) {
	return c.sendMultipart(ctx, "sendVideo", chatID, "video", filename, data, caption)
}

func (c *Client) sendMultipart(ctx context.Context, method string, chatID int64, field, filename string, data []byte, caption string) (int64, error) {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	_ = w.WriteField("chat_id", strconv.FormatInt(chatID, 10))
	if caption != "" {
		_ = w.WriteField("caption", caption)
	}
	part, err := w.CreateFormFile(field, filename)
	if err != nil {
		return 0, err
	}
	if _, err := part.Write(data); err != nil {
		return 0, err
	}
	if err := w.Close(); err != nil {
		return 0, err
	}
	u := fmt.Sprintf("%s/bot%s/%s", c.baseURL, c.token, method)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u, &buf)
	if err != nil {
		return 0, err
	}
	req.Header.Set("Content-Type", w.FormDataContentType())
	var wrap struct {
		OK bool `json:"ok"`
		Result struct {
			MessageID int64 `json:"message_id"`
		} `json:"result"`
		Description string `json:"description"`
	}
	if err := c.do(req, &wrap); err != nil {
		return 0, err
	}
	if !wrap.OK {
		return 0, fmt.Errorf("%s: %s", method, wrap.Description)
	}
	return wrap.Result.MessageID, nil
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
