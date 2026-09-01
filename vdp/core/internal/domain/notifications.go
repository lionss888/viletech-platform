package domain

import "time"

// JoinStatus is the work-chat membership request state.
type JoinStatus string

const (
	JoinNone     JoinStatus = "none"
	JoinPending  JoinStatus = "pending"
	JoinApproved JoinStatus = "approved"
	JoinRejected JoinStatus = "rejected"
)

// WorkChat is an operational Telegram group users can request to join.
type WorkChat struct {
	ID     string `json:"id"`
	Title  string `json:"title"`
	ChatID string `json:"chat_id"`
	Kind   string `json:"kind"`
	Active bool   `json:"active"`
}

// ChatJoin is a request to be added to a work chat.
type ChatJoin struct {
	ID        string     `json:"id"`
	ChatID    string     `json:"chat_id"`
	AccountID string     `json:"account_id"`
	Status    JoinStatus `json:"status"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

// TelegramLinkCode binds a one-time /start payload to an account.
type TelegramLinkCode struct {
	Code      string
	AccountID string
	ExpiresAt time.Time
}

// WorkChatView is the list item a user sees, including their join state.
type WorkChatView struct {
	WorkChat
	JoinStatus JoinStatus `json:"join_status"`
}
