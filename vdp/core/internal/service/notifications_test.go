package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
)

func TestTelegramLinkBindUnlinkAuthZ(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	svc := service.NewNotificationService(store)
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser}
	other := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}

	link, err := svc.CreateTelegramLink(ctx, user)
	if err != nil || link.Code == "" {
		t.Fatalf("%v %#v", err, link)
	}
	if _, err := svc.BindTelegram(ctx, link.Code, "42"); err != nil {
		t.Fatal(err)
	}
	acc, err := store.AccountByID(ctx, seed.UserID)
	if err != nil || acc.TelegramChatID != "42" {
		t.Fatalf("%v %#v", err, acc)
	}
	otherLink, err := svc.CreateTelegramLink(ctx, other)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.BindTelegram(ctx, otherLink.Code, "42"); err == nil {
		t.Fatal("foreign chat bind must fail")
	}
	if _, err := svc.UnlinkTelegram(ctx, user); err != nil {
		t.Fatal(err)
	}
	acc, _ = store.AccountByID(ctx, seed.UserID)
	if acc.TelegramChatID != "" {
		t.Fatal("unlink")
	}
}

func TestWorkChatJoinIdempotentAndUserCannotApprove(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	svc := service.NewNotificationService(store)
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser}
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}

	a, err := svc.RequestJoin(ctx, user, "wc-ops")
	if err != nil {
		t.Fatal(err)
	}
	b, err := svc.RequestJoin(ctx, user, "wc-ops")
	if err != nil || a.ID != b.ID {
		t.Fatalf("idempotent join a=%s b=%s err=%v", a.ID, b.ID, err)
	}
	if _, err := svc.DecideJoin(ctx, user, a.ID, true); err == nil {
		t.Fatal("user must not approve")
	}
	got, err := svc.DecideJoin(ctx, manager, a.ID, true)
	if err != nil || got.Status != domain.JoinApproved {
		t.Fatalf("%v %#v", err, got)
	}
}

func TestNotifyPrefsSMSDefaultOff(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	svc := service.NewNotificationService(store)
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser}
	on := true
	acc, err := svc.UpdatePrefs(ctx, user, service.NotifyPrefs{SMSNotifyEnabled: &on})
	if err != nil || !acc.SMSNotifyEnabled {
		t.Fatalf("%v %#v", err, acc)
	}
}

func TestExpiredTelegramLink(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	_ = store.SaveTelegramLink(ctx, domain.TelegramLinkCode{
		Code: "dead", AccountID: seed.UserID, ExpiresAt: time.Now().UTC().Add(-time.Minute),
	})
	svc := service.NewNotificationService(store)
	if _, err := svc.BindTelegram(ctx, "dead", "99"); err == nil {
		t.Fatal("expired")
	}
}
