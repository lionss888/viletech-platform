package telegram

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/viletech/vdp/hub/internal/adapters/remote"
)

type tgUpdate struct {
	Message *struct {
		Text string `json:"text"`
		Chat *struct {
			ID int64 `json:"id"`
		} `json:"chat"`
	} `json:"message"`
}

// HandleWebhook binds /start CODE to core via S2S. Does not change form status.
func HandleWebhook(w http.ResponseWriter, r *http.Request, coreURL, secret string, timeout time.Duration) {
	raw, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		http.Error(w, "bad body", http.StatusBadRequest)
		return
	}
	var upd tgUpdate
	if err := json.Unmarshal(raw, &upd); err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}
	if upd.Message == nil || upd.Message.Chat == nil {
		writeOK(w, "ignored")
		return
	}
	code := parseStartCode(upd.Message.Text)
	if code == "" {
		writeOK(w, "ignored")
		return
	}
	chatID := strconv.FormatInt(upd.Message.Chat.ID, 10)
	url := strings.TrimRight(strings.TrimSpace(coreURL), "/") + "/api/v1/internal/telegram/bind"
	headers := map[string]string{}
	if secret != "" {
		headers["X-VDP-S2S"] = secret
	}
	if timeout <= 0 {
		timeout = 3 * time.Second
	}
	if _, err := remote.PostJSONHeaders(r.Context(), url, timeout, map[string]any{"code": code, "chat_id": chatID}, headers); err != nil {
		http.Error(w, "bind failed", http.StatusBadGateway)
		return
	}
	writeOK(w, "linked")
}

func parseStartCode(text string) string {
	text = strings.TrimSpace(text)
	if !strings.HasPrefix(text, "/start") {
		return ""
	}
	parts := strings.Fields(text)
	if len(parts) < 2 {
		return ""
	}
	return parts[1]
}

func writeOK(w http.ResponseWriter, status string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": status})
}
