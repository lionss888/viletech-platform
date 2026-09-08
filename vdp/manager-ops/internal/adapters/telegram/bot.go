package telegram

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/viletech/vdp/shared/managerops"
)

// Bot is a Telegram adapter. Without a token it runs in fixture mode.
type Bot struct {
	token  string
	log    *slog.Logger
	fixture map[string][]managerops.MemberSnapshot
}

// New creates a bot adapter. Empty token enables fixture members.
func New(token string, log *slog.Logger) *Bot {
	if log == nil {
		log = slog.Default()
	}
	return &Bot{
		token: token,
		log:   log,
		fixture: map[string][]managerops.MemberSnapshot{},
	}
}

// SetFixtureMembers seeds members for offline/compose tests.
func (b *Bot) SetFixtureMembers(chatID string, members []managerops.MemberSnapshot) {
	b.fixture[chatID] = members
}

// ListMembers returns fixture members when token is empty; live Bot API is a later wave.
func (b *Bot) ListMembers(_ context.Context, chatID string) ([]managerops.MemberSnapshot, error) {
	if chatID == "" {
		return nil, fmt.Errorf("chat_id required")
	}
	if b.token == "" {
		if m, ok := b.fixture[chatID]; ok {
			return m, nil
		}
		return []managerops.MemberSnapshot{}, nil
	}
	// Live getChatAdministrators / getChatMemberCount path lands in a follow-up wave.
	b.log.Info("telegram list members deferred to live API wave", "chat_id", chatID)
	if m, ok := b.fixture[chatID]; ok {
		return m, nil
	}
	return nil, fmt.Errorf("live telegram member sync not implemented; use fixture or empty token")
}

// SendNudge logs in fixture mode; live sendMessage is a follow-up wave.
func (b *Bot) SendNudge(_ context.Context, chatID, text string) error {
	if chatID == "" || text == "" {
		return fmt.Errorf("chat_id and text required")
	}
	if b.token == "" {
		b.log.Info("fixture nudge", "chat_id", chatID, "len", len(text))
		return nil
	}
	b.log.Info("telegram nudge deferred to live API wave", "chat_id", chatID)
	return fmt.Errorf("live telegram nudge not implemented")
}
