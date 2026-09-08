package domain

import "time"

// Person is a Telegram identity optionally linked to a VDP manager account.
type Person struct {
	TelegramUserID string
	Username       string
	DisplayName    string
	AccountID      string
	UpdatedAt      time.Time
}

// Chat is a work chat known to manager-ops (mirror of core catalog + local sync meta).
type Chat struct {
	WorkChatID string
	ChatID     string
	Title      string
	Kind       string
	Active     bool
	SyncedAt   time.Time
}

// Membership binds a person to a chat for a time window.
type Membership struct {
	ChatID         string
	TelegramUserID string
	IsAdmin        bool
	JoinedAt       time.Time
	LeftAt         *time.Time
}

// Consent is opt-in for behavioral analytics and motivation nudges.
type Consent struct {
	AccountID string
	Enabled   bool
	UpdatedAt time.Time
}

// ScoreAggregate is a simple period score for motivation (not AuthZ).
type ScoreAggregate struct {
	AccountID string
	Period    string
	Events    int
	Score     int
	UpdatedAt time.Time
}
