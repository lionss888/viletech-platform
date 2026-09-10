package telegram

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/viletech/vdp/shared/managerops"
)

// Bot is a Telegram adapter. Without a token it runs in fixture mode.
type Bot struct {
	token   string
	log     *slog.Logger
	fixture map[string][]managerops.MemberSnapshot
	http    *http.Client
	apiBase string
}

// New creates a bot adapter. Empty token enables fixture members.
func New(token string, log *slog.Logger) *Bot {
	if log == nil {
		log = slog.Default()
	}
	return &Bot{
		token:   token,
		log:     log,
		fixture: map[string][]managerops.MemberSnapshot{},
		http:    &http.Client{Timeout: 15 * time.Second},
		apiBase: "https://api.telegram.org",
	}
}

// SetFixtureMembers seeds members for offline/compose tests.
func (b *Bot) SetFixtureMembers(chatID string, members []managerops.MemberSnapshot) {
	b.fixture[chatID] = members
}

// ListMembers returns fixture members when token is empty; otherwise getChatAdministrators.
func (b *Bot) ListMembers(ctx context.Context, chatID string) ([]managerops.MemberSnapshot, error) {
	if chatID == "" {
		return nil, fmt.Errorf("chat_id required")
	}
	if b.token == "" {
		if m, ok := b.fixture[chatID]; ok {
			return m, nil
		}
		return []managerops.MemberSnapshot{}, nil
	}
	if m, ok := b.fixture[chatID]; ok {
		return m, nil
	}
	endpoint := fmt.Sprintf("%s/bot%s/getChatAdministrators", b.apiBase, b.token)
	form := url.Values{}
	form.Set("chat_id", chatID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	res, err := b.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("telegram getChatAdministrators: %s", truncate(string(raw), 200))
	}
	var parsed struct {
		OK     bool `json:"ok"`
		Result []struct {
			Status string `json:"status"`
			User   struct {
				ID        int64  `json:"id"`
				Username  string `json:"username"`
				FirstName string `json:"first_name"`
				LastName  string `json:"last_name"`
			} `json:"user"`
		} `json:"result"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return nil, err
	}
	if !parsed.OK {
		return nil, fmt.Errorf("telegram api not ok")
	}
	out := make([]managerops.MemberSnapshot, 0, len(parsed.Result))
	for _, row := range parsed.Result {
		display := strings.TrimSpace(row.User.FirstName + " " + row.User.LastName)
		out = append(out, managerops.MemberSnapshot{
			TelegramUserID: strconv.FormatInt(row.User.ID, 10),
			Username:       row.User.Username,
			DisplayName:    display,
			IsAdmin:        row.Status == "administrator" || row.Status == "creator",
		})
	}
	return out, nil
}

// SendNudge logs in fixture mode; live sendMessage when token is set.
func (b *Bot) SendNudge(ctx context.Context, chatID, text string) error {
	if chatID == "" || text == "" {
		return fmt.Errorf("chat_id and text required")
	}
	if b.token == "" {
		b.log.Info("fixture nudge", "chat_id", chatID, "len", len(text))
		return nil
	}
	endpoint := fmt.Sprintf("%s/bot%s/sendMessage", b.apiBase, b.token)
	form := url.Values{}
	form.Set("chat_id", chatID)
	form.Set("text", text)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	res, err := b.http.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		raw, _ := io.ReadAll(res.Body)
		return fmt.Errorf("telegram sendMessage: %s", truncate(string(raw), 200))
	}
	return nil
}

// EventFromUpdate maps a Telegram update to a behavioral event (metadata only, no message text).
func EventFromUpdate(update map[string]any) (managerops.Event, bool) {
	if update == nil {
		return managerops.Event{}, false
	}
	if cb, ok := update["callback_query"].(map[string]any); ok {
		from, _ := cb["from"].(map[string]any)
		msg, _ := cb["message"].(map[string]any)
		chat, _ := msg["chat"].(map[string]any)
		tgID := idString(from["id"])
		chatID := idString(chat["id"])
		cbID, _ := cb["id"].(string)
		if tgID == "" {
			return managerops.Event{}, false
		}
		return managerops.Event{
			IdempotencyKey: "tg:cb:" + cbID,
			TelegramUserID: tgID,
			Source:         managerops.SourceTelegram,
			Kind:           managerops.KindNudgeAck,
			OccurredAt:     time.Now().UTC(),
			Payload:        map[string]any{"chat_id": chatID, "update_type": "callback_query"},
		}, true
	}
	msg, ok := update["message"].(map[string]any)
	if !ok {
		return managerops.Event{}, false
	}
	from, _ := msg["from"].(map[string]any)
	chat, _ := msg["chat"].(map[string]any)
	tgID := idString(from["id"])
	chatID := idString(chat["id"])
	msgID := idString(msg["message_id"])
	if tgID == "" || msgID == "" {
		return managerops.Event{}, false
	}
	kind := managerops.KindChatReply
	if _, hasReply := msg["reply_to_message"].(map[string]any); hasReply {
		kind = managerops.KindNudgeAck
	}
	updateID := idString(update["update_id"])
	return managerops.Event{
		IdempotencyKey: "tg:msg:" + updateID + ":" + msgID,
		TelegramUserID: tgID,
		Source:         managerops.SourceTelegram,
		Kind:           kind,
		OccurredAt:     time.Now().UTC(),
		Payload:        map[string]any{"chat_id": chatID, "message_id": msgID, "update_type": "message"},
	}, true
}

func idString(v any) string {
	if v == nil {
		return ""
	}
	switch t := v.(type) {
	case string:
		return t
	case float64:
		return strconv.FormatInt(int64(t), 10)
	case int64:
		return strconv.FormatInt(t, 10)
	case json.Number:
		return t.String()
	default:
		s := fmt.Sprint(v)
		if s == "<nil>" {
			return ""
		}
		return s
	}
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
