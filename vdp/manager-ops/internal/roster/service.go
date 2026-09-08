package roster

import (
	"context"
	"fmt"
	"time"

	"github.com/viletech/vdp/manager-ops/internal/domain"
	"github.com/viletech/vdp/manager-ops/internal/ports"
	"github.com/viletech/vdp/shared/managerops"
)

// Service owns manager/chat membership sync (contour A).
type Service struct {
	store    ports.Store
	core     ports.CoreAPI
	telegram ports.TelegramAPI
	clock    ports.Clock
	allowed  map[string]struct{}
}

// New builds a roster service. core/telegram may be nil for offline tests.
func New(store ports.Store, core ports.CoreAPI, telegram ports.TelegramAPI, clock ports.Clock, allowlist []string) *Service {
	allowed := map[string]struct{}{}
	for _, id := range allowlist {
		allowed[id] = struct{}{}
	}
	if clock == nil {
		clock = systemClock{}
	}
	return &Service{store: store, core: core, telegram: telegram, clock: clock, allowed: allowed}
}

type systemClock struct{}

func (systemClock) Now() time.Time { return time.Now().UTC() }

// SyncChat refreshes membership for one Telegram chat id.
func (s *Service) SyncChat(ctx context.Context, req managerops.SyncRequest) (int, error) {
	if err := req.Validate(); err != nil {
		return 0, err
	}
	chatID := req.ChatID
	if chatID == "" && s.core != nil {
		chats, err := s.core.ListWorkChats(ctx)
		if err != nil {
			return 0, err
		}
		for _, c := range chats {
			if c.ID == req.WorkChatID {
				chatID = c.ChatID
				_ = s.store.UpsertChat(ctx, domain.Chat{
					WorkChatID: c.ID, ChatID: c.ChatID, Title: c.Title, Kind: c.Kind, Active: c.Active, SyncedAt: s.clock.Now(),
				})
				break
			}
		}
	}
	if chatID == "" {
		return 0, fmt.Errorf("chat_id unresolved")
	}
	if len(s.allowed) > 0 {
		if _, ok := s.allowed[chatID]; !ok {
			return 0, fmt.Errorf("chat_id not allowlisted")
		}
	}
	if s.telegram == nil {
		return 0, fmt.Errorf("telegram adapter not configured")
	}
	members, err := s.telegram.ListMembers(ctx, chatID)
	if err != nil {
		return 0, err
	}
	rows := make([]domain.Membership, 0, len(members))
	now := s.clock.Now()
	for _, m := range members {
		_ = s.store.UpsertPerson(ctx, domain.Person{
			TelegramUserID: m.TelegramUserID,
			Username:       m.Username,
			DisplayName:    m.DisplayName,
			AccountID:      m.AccountID,
			UpdatedAt:      now,
		})
		rows = append(rows, domain.Membership{
			ChatID: chatID, TelegramUserID: m.TelegramUserID, IsAdmin: m.IsAdmin, JoinedAt: now,
		})
	}
	if err := s.store.ReplaceMemberships(ctx, chatID, rows); err != nil {
		return 0, err
	}
	return len(rows), nil
}

// SetConsent updates behavioral opt-in for an account.
func (s *Service) SetConsent(ctx context.Context, accountID string, enabled bool) error {
	if accountID == "" {
		return fmt.Errorf("account_id required")
	}
	return s.store.SetConsent(ctx, domain.Consent{AccountID: accountID, Enabled: enabled, UpdatedAt: s.clock.Now()})
}
