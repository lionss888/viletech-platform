package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"os"
	"strings"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/repository"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

// NotificationService owns telegram binding and work-chat membership.
type NotificationService struct {
	store     repository.Store
	newID     func() string
	botName   string
	linkTTL   time.Duration
	now       func() time.Time
}

func NewNotificationService(store repository.Store) *NotificationService {
	bot := strings.TrimSpace(os.Getenv("TELEGRAM_BOT_USERNAME"))
	if bot == "" {
		bot = "vdp_notify_bot"
	}
	return &NotificationService{
		store:   store,
		botName: strings.TrimPrefix(bot, "@"),
		linkTTL: 15 * time.Minute,
		now:     func() time.Time { return time.Now().UTC() },
		newID: func() string {
			buf := make([]byte, 16)
			_, _ = rand.Read(buf)
			return hex.EncodeToString(buf)
		},
	}
}

type TelegramLinkResult struct {
	Code     string `json:"code"`
	DeepLink string `json:"deep_link"`
	Expires  string `json:"expires_at"`
}

func (s *NotificationService) CreateTelegramLink(ctx context.Context, principal authz.Principal) (TelegramLinkResult, error) {
	if principal.AccountID == "" {
		return TelegramLinkResult{}, apperrors.ErrUnauthorized
	}
	code := s.newID()[:8]
	exp := s.now().Add(s.linkTTL)
	if err := s.store.SaveTelegramLink(ctx, domain.TelegramLinkCode{Code: code, AccountID: principal.AccountID, ExpiresAt: exp}); err != nil {
		return TelegramLinkResult{}, err
	}
	return TelegramLinkResult{
		Code:     code,
		DeepLink: "https://t.me/" + s.botName + "?start=" + code,
		Expires:  exp.Format(time.RFC3339),
	}, nil
}

func (s *NotificationService) UnlinkTelegram(ctx context.Context, principal authz.Principal) (domain.Account, error) {
	acc, err := s.store.AccountByID(ctx, principal.AccountID)
	if err != nil {
		return domain.Account{}, err
	}
	acc.TelegramChatID = ""
	return acc, s.store.SaveAccount(ctx, acc)
}

func (s *NotificationService) BindTelegram(ctx context.Context, code, chatID string) (domain.Account, error) {
	code = strings.TrimSpace(code)
	chatID = strings.TrimSpace(chatID)
	if code == "" || chatID == "" {
		return domain.Account{}, apperrors.New(apperrors.ErrCodeValidation, "code and chat_id required")
	}
	link, err := s.store.TelegramLinkByCode(ctx, code)
	if err != nil {
		return domain.Account{}, apperrors.New(apperrors.ErrCodeValidation, "invalid link code")
	}
	if s.now().After(link.ExpiresAt) {
		_ = s.store.DeleteTelegramLink(ctx, code)
		return domain.Account{}, apperrors.New(apperrors.ErrCodeValidation, "link code expired")
	}
	if other, err := s.store.AccountByTelegramChatID(ctx, chatID); err == nil && other.ID != link.AccountID {
		return domain.Account{}, apperrors.ErrForbidden
	}
	acc, err := s.store.AccountByID(ctx, link.AccountID)
	if err != nil {
		return domain.Account{}, err
	}
	acc.TelegramChatID = chatID
	acc.TelegramNotifyEnabled = true
	if err := s.store.SaveAccount(ctx, acc); err != nil {
		return domain.Account{}, err
	}
	_ = s.store.DeleteTelegramLink(ctx, code)
	return acc, nil
}

type NotifyPrefs struct {
	TelegramNotifyEnabled *bool `json:"telegram_notify_enabled"`
	SMSNotifyEnabled      *bool `json:"sms_notify_enabled"`
}

func (s *NotificationService) UpdatePrefs(ctx context.Context, principal authz.Principal, in NotifyPrefs) (domain.Account, error) {
	acc, err := s.store.AccountByID(ctx, principal.AccountID)
	if err != nil {
		return domain.Account{}, err
	}
	if in.TelegramNotifyEnabled != nil {
		acc.TelegramNotifyEnabled = *in.TelegramNotifyEnabled
	}
	if in.SMSNotifyEnabled != nil {
		acc.SMSNotifyEnabled = *in.SMSNotifyEnabled
	}
	return acc, s.store.SaveAccount(ctx, acc)
}

func (s *NotificationService) ListWorkChats(ctx context.Context, principal authz.Principal) ([]domain.WorkChatView, error) {
	chats, err := s.store.ListWorkChats(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]domain.WorkChatView, 0, len(chats))
	for _, c := range chats {
		view := domain.WorkChatView{WorkChat: c, JoinStatus: domain.JoinNone}
		if join, err := s.store.ChatJoinByAccountChat(ctx, principal.AccountID, c.ID); err == nil {
			view.JoinStatus = join.Status
		}
		out = append(out, view)
	}
	return out, nil
}

func (s *NotificationService) RequestJoin(ctx context.Context, principal authz.Principal, chatID string) (domain.ChatJoin, error) {
	chat, err := s.store.WorkChatByID(ctx, chatID)
	if err != nil {
		return domain.ChatJoin{}, err
	}
	if !chat.Active {
		return domain.ChatJoin{}, apperrors.New(apperrors.ErrCodeValidation, "chat inactive")
	}
	if prev, err := s.store.ChatJoinByAccountChat(ctx, principal.AccountID, chat.ID); err == nil {
		return prev, nil
	}
	join := domain.ChatJoin{
		ID:        s.newID(),
		ChatID:    chat.ID,
		AccountID: principal.AccountID,
		Status:    domain.JoinPending,
		CreatedAt: s.now(),
		UpdatedAt: s.now(),
	}
	return join, s.store.SaveChatJoin(ctx, join)
}

func (s *NotificationService) ListPendingJoins(ctx context.Context, principal authz.Principal) ([]domain.ChatJoin, error) {
	if err := authz.RequireRoles(principal, domain.RoleRoot, domain.RoleManager); err != nil {
		return nil, err
	}
	return s.store.ListChatJoins(ctx, domain.JoinPending)
}

func (s *NotificationService) DecideJoin(ctx context.Context, principal authz.Principal, joinID string, approved bool) (domain.ChatJoin, error) {
	if err := authz.RequireRoles(principal, domain.RoleRoot, domain.RoleManager); err != nil {
		return domain.ChatJoin{}, err
	}
	join, err := s.store.ChatJoinByID(ctx, joinID)
	if err != nil {
		return domain.ChatJoin{}, err
	}
	if approved {
		join.Status = domain.JoinApproved
	} else {
		join.Status = domain.JoinRejected
	}
	join.UpdatedAt = s.now()
	return join, s.store.SaveChatJoin(ctx, join)
}
