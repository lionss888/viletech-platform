//go:build integration

package postgres_test

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository/postgres"
	"github.com/viletech/vdp/core/internal/repository/seed"
)

func TestPostgresStoreAndOutbox(t *testing.T) {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		url = "postgres://vdp_core:vdp_core@localhost:5432/vdp_core?sslmode=disable"
	}
	t.Setenv("STORE_DRIVER", "postgres")
	ctx := context.Background()
	db, err := postgres.OpenDB(ctx, url)
	if err != nil {
		t.Skip("postgres unavailable:", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	store := postgres.NewStore(db)
	box := outbox.NewPostgresStore(db)
	seed.MustDev(t, store)
	formID := fmt.Sprintf("%032x", time.Now().UnixNano())
	formID = formID[len(formID)-32:]
	form := formpayment.Form{
		ID:             formID,
		AccountID:      seed.UserID,
		OrganizationID: seed.OrgID,
		Status:         formpayment.StatusCreating,
		Direction:      formpayment.DirectionImport,
		Kind:           formpayment.KindGood,
		Currency:       "USD",
		InvoiceAmount:  "42",
		CreatedAt:      time.Now().UTC(),
		UpdatedAt:      time.Now().UTC(),
	}
	if err := store.SaveForm(ctx, form); err != nil {
		t.Fatal("SaveForm:", err)
	}
	got, err := store.FormByID(ctx, formID)
	if err != nil {
		t.Fatal("FormByID:", err)
	}
	if got.Currency != "USD" || got.InvoiceAmount != "42" {
		t.Fatalf("%#v", got)
	}
	eventID := fmt.Sprintf("%032x", time.Now().UnixNano()+1)
	eventID = eventID[len(eventID)-32:]
	if err := box.Enqueue(ctx, outbox.Event{
		ID: eventID, AggregateID: formID, AggregateType: "form_payment",
		EventType: "telegram.notify", FormPaymentID: formID, Payload: map[string]any{"ok": true},
	}); err != nil {
		t.Fatal("Enqueue:", err)
	}
	pending, err := box.Pending(ctx, 10)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, e := range pending {
		if e.FormPaymentID == formID && e.EventType == "telegram.notify" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("pending missing event: %#v", pending)
	}
	if err := box.MarkPublished(ctx, eventID); err != nil {
		t.Fatal(err)
	}
}

func TestPostgresFormStatusTransition(t *testing.T) {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		url = "postgres://vdp_core:vdp_core@localhost:5432/vdp_core?sslmode=disable"
	}
	t.Setenv("STORE_DRIVER", "postgres")
	ctx := context.Background()
	db, err := postgres.OpenDB(ctx, url)
	if err != nil {
		t.Skip("postgres unavailable:", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	store := postgres.NewStore(db)
	seed.MustDev(t, store)
	formID := fmt.Sprintf("%032x", time.Now().UnixNano())
	formID = formID[len(formID)-32:]
	form := formpayment.Form{
		ID:             formID,
		AccountID:      seed.UserID,
		OrganizationID: seed.OrgID,
		Status:         formpayment.StatusDraft,
		Direction:      formpayment.DirectionImport,
		Kind:           formpayment.KindGood,
		Currency:       "EUR",
		InvoiceAmount:  "100",
		CreatedAt:      time.Now().UTC(),
		UpdatedAt:      time.Now().UTC(),
	}
	if err := store.SaveForm(ctx, form); err != nil {
		t.Fatal("SaveForm:", err)
	}
	form.Status = formpayment.StatusFormWaitingVerification
	form.UpdatedAt = time.Now().UTC()
	if err := store.SaveForm(ctx, form); err != nil {
		t.Fatal("SaveForm transition:", err)
	}
	got, err := store.FormByID(ctx, formID)
	if err != nil {
		t.Fatal("FormByID:", err)
	}
	if got.Status != formpayment.StatusFormWaitingVerification {
		t.Fatalf("status=%s want form_waiting_verification", got.Status)
	}
}
