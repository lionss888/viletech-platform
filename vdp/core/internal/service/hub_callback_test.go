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
)

func TestApplyHubCallbackOCRAndOneCNoAutoPay(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	svc := service.NewFormPaymentService(store, outbox.NewMemoryStore(), seqID())
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	form, err := svc.Create(ctx, user, service.CreateInput{InvoiceAmount: "10", Currency: "USD"})
	if err != nil {
		t.Fatal(err)
	}
	form, err = svc.ApplyHubCallback(ctx, form.ID, "ocr_recognized", map[string]any{
		"fields": map[string]any{"contract_number": "C-OCR", "currency": "GBP"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if form.Status != formpayment.StatusDraft || form.ContractNumber != "C-OCR" {
		t.Fatalf("%#v", form)
	}
	form, err = svc.ApplyHubCallback(ctx, form.ID, "onec_cover", map[string]any{
		"external_id": "ext-1", "cover": "500", "fee": "12",
	})
	if err != nil {
		t.Fatal(err)
	}
	if form.Status != formpayment.StatusDraft {
		t.Fatalf("1c must not change status: %s", form.Status)
	}
	if form.Commission.FeeAmount != "12" {
		t.Fatalf("fee=%s", form.Commission.FeeAmount)
	}
}
