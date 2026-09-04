package service_test

import (
	"context"
	"testing"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
	"github.com/viletech/vdp/shared/events"
)

func TestTelegramNotifyGetsChatIDWithoutPII(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.Dev(store)
	acc, _ := store.AccountByID(ctx, seed.UserID)
	acc.TelegramChatID = "42"
	acc.TelegramNotifyEnabled = true
	_ = store.SaveAccount(ctx, acc)
	box := outbox.NewMemoryStore()
	svc := service.NewFormPaymentService(store, box, seqID())
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	form, err := svc.Create(ctx, user, service.CreateInput{InvoiceAmount: "1", Currency: "USD", NoDocuments: true})
	if err != nil {
		t.Fatal(err)
	}
	_, err = svc.Transition(ctx, user, form.ID, formpayment.ActionRecognizeComplete)
	if err != nil {
		t.Fatal(err)
	}
	pending, _ := box.Pending(ctx, 50)
	found := false
	for _, e := range pending {
		if e.EventType != events.TypeTelegramNotify {
			continue
		}
		if e.Payload["chat_id"] == "42" {
			found = true
		}
		if e.Payload["passport"] != nil || e.Payload["full_name"] != nil {
			t.Fatalf("pii in payload %#v", e.Payload)
		}
	}
	if !found {
		t.Fatal("expected personal chat_id on telegram notify")
	}
}
