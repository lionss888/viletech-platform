package managerops

import "fmt"

// WorkChatRef is a thin view of core work-chat catalog for roster sync.
type WorkChatRef struct {
	ID     string `json:"id"`
	Title  string `json:"title"`
	ChatID string `json:"chat_id"`
	Kind   string `json:"kind"`
	Active bool   `json:"active"`
}

// MemberSnapshot is a Telegram membership row without message content.
type MemberSnapshot struct {
	TelegramUserID string `json:"telegram_user_id"`
	Username       string `json:"username,omitempty"`
	DisplayName    string `json:"display_name,omitempty"`
	IsAdmin        bool   `json:"is_admin"`
	AccountID      string `json:"account_id,omitempty"`
}

// SyncRequest asks manager-ops to refresh membership for one work chat.
type SyncRequest struct {
	WorkChatID string `json:"work_chat_id"`
	ChatID     string `json:"chat_id"`
}

// Validate checks sync identity fields.
func (r SyncRequest) Validate() error {
	if r.WorkChatID == "" && r.ChatID == "" {
		return fmt.Errorf("work_chat_id or chat_id required")
	}
	return nil
}

// ConsentState records opt-in for behavioral analytics / motivation.
type ConsentState struct {
	AccountID string `json:"account_id"`
	Enabled   bool   `json:"enabled"`
}
