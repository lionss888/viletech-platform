package behavior

import (
	"context"
	"fmt"
	"time"

	"github.com/viletech/vdp/manager-ops/internal/domain"
	"github.com/viletech/vdp/manager-ops/internal/ports"
	"github.com/viletech/vdp/shared/managerops"
)

// Service owns behavioral ingest, scoring, and motivation nudges (contour B).
// It never mutates form-payment status.
type Service struct {
	store    ports.Store
	telegram ports.TelegramAPI
	clock    ports.Clock
}

// New builds a behavior service.
func New(store ports.Store, telegram ports.TelegramAPI, clock ports.Clock) *Service {
	if clock == nil {
		clock = systemClock{}
	}
	return &Service{store: store, telegram: telegram, clock: clock}
}

type systemClock struct{}

func (systemClock) Now() time.Time { return time.Now().UTC() }

// Ingest validates and stores one event; duplicates are no-ops.
// Consent 2B: telegram requires active work-chat membership and no opt-out.
// Core events are always accepted (cabinet is source of truth).
func (s *Service) Ingest(ctx context.Context, e managerops.Event) (status string, err error) {
	if err := e.Validate(); err != nil {
		return "", err
	}
	if e.Source == managerops.SourceTelegram {
		ok, herr := s.store.HasActiveMembership(ctx, e.TelegramUserID, e.AccountID)
		if herr != nil {
			return "", herr
		}
		if !ok {
			return "skipped_no_membership", nil
		}
		accountID := e.AccountID
		if accountID == "" && e.TelegramUserID != "" {
			if p, found, perr := s.store.PersonByTelegram(ctx, e.TelegramUserID); perr != nil {
				return "", perr
			} else if found {
				accountID = p.AccountID
			}
		}
		if accountID != "" {
			consent, hasConsent, cerr := s.store.Consent(ctx, accountID)
			if cerr != nil {
				return "", cerr
			}
			if hasConsent && !consent.Enabled {
				return "skipped_opt_out", nil
			}
		}
	}
	created, err := s.store.SaveEvent(ctx, e)
	if err != nil {
		return "", err
	}
	if !created {
		return "duplicate", nil
	}
	if e.AccountID != "" {
		if err := s.bumpScore(ctx, e.AccountID); err != nil {
			return "", err
		}
	}
	return "accepted", nil
}

func (s *Service) bumpScore(ctx context.Context, accountID string) error {
	period := s.clock.Now().UTC().Format("2006-01-02")
	cur, _, err := s.store.Score(ctx, accountID, period)
	if err != nil {
		return err
	}
	cur.AccountID = accountID
	cur.Period = period
	cur.Events++
	cur.Score += 1
	cur.UpdatedAt = s.clock.Now()
	return s.store.UpsertScore(ctx, cur)
}

// Score returns the aggregate for account/period.
func (s *Service) Score(ctx context.Context, accountID, period string) (domain.ScoreAggregate, bool, error) {
	if accountID == "" || period == "" {
		return domain.ScoreAggregate{}, false, fmt.Errorf("account_id and period required")
	}
	return s.store.Score(ctx, accountID, period)
}

// Nudge sends a motivation message when membership exists and account has not opted out.
func (s *Service) Nudge(ctx context.Context, accountID, chatID, text string) error {
	if accountID == "" || chatID == "" || text == "" {
		return fmt.Errorf("account_id, chat_id and text required")
	}
	ok, err := s.store.HasActiveMembership(ctx, "", accountID)
	if err != nil {
		return err
	}
	if !ok {
		return fmt.Errorf("active membership required")
	}
	consent, hasConsent, err := s.store.Consent(ctx, accountID)
	if err != nil {
		return err
	}
	if hasConsent && !consent.Enabled {
		return fmt.Errorf("opted out")
	}
	if s.telegram == nil {
		return fmt.Errorf("telegram adapter not configured")
	}
	return s.telegram.SendNudge(ctx, chatID, text)
}
