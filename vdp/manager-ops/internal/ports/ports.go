package ports

import (
	"context"
	"time"

	"github.com/viletech/vdp/manager-ops/internal/domain"
	"github.com/viletech/vdp/shared/managerops"
)

// Store persists roster and behavioral data (no shared DB with core).
type Store interface {
	UpsertPerson(ctx context.Context, p domain.Person) error
	UpsertChat(ctx context.Context, c domain.Chat) error
	ReplaceMemberships(ctx context.Context, chatID string, members []domain.Membership) error
	ListMemberships(ctx context.Context, chatID string) ([]domain.Membership, error)
	PersonByTelegram(ctx context.Context, telegramUserID string) (domain.Person, bool, error)
	HasActiveMembership(ctx context.Context, telegramUserID, accountID string) (bool, error)
	SetConsent(ctx context.Context, c domain.Consent) error
	Consent(ctx context.Context, accountID string) (domain.Consent, bool, error)
	SaveEvent(ctx context.Context, e managerops.Event) (created bool, err error)
	ListEvents(ctx context.Context, accountID string, since time.Time) ([]managerops.Event, error)
	ListAllEvents(ctx context.Context, since time.Time) ([]managerops.Event, error)
	UpsertScore(ctx context.Context, s domain.ScoreAggregate) error
	Score(ctx context.Context, accountID, period string) (domain.ScoreAggregate, bool, error)
}

// CoreAPI reads work-chat catalog and account bindings from VDP core (HTTP).
type CoreAPI interface {
	ListWorkChats(ctx context.Context) ([]managerops.WorkChatRef, error)
}

// TelegramAPI syncs group members and can send motivation nudges.
type TelegramAPI interface {
	ListMembers(ctx context.Context, chatID string) ([]managerops.MemberSnapshot, error)
	SendNudge(ctx context.Context, chatID, text string) error
}

// Clock abstracts time for tests.
type Clock interface {
	Now() time.Time
}
