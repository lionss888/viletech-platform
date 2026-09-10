package service_test

import (
	"context"
	"errors"
	"testing"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

func TestCreateRequiresClientOrganization(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewMemoryStore()
	seed.MustDev(t, store)
	forms := service.NewFormPaymentService(store, outbox.NewMemoryStore(), seqID())

	orphan := authz.Principal{
		AccountID: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
		Role:      domain.RoleUser,
	}
	_, err := forms.Create(ctx, orphan, service.CreateInput{InvoiceAmount: "1", Currency: "USD", NoDocuments: true})
	if err == nil {
		t.Fatal("expected create without org to fail")
	}
	var ae *apperrors.AppError
	if !errors.As(err, &ae) || ae.Code != apperrors.ErrCodeForbidden {
		t.Fatalf("want FORBIDDEN got %v", err)
	}
}

func TestCreateUsesRequestedOrganizationID(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewMemoryStore()
	seed.MustDev(t, store)
	forms := service.NewFormPaymentService(store, outbox.NewMemoryStore(), seqID())
	orgs := service.NewOrganizationService(store)
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}

	extra, err := orgs.Create(ctx, user, "Second Client LLC", "7700999888", "", "ул. Тестовая, 1", domain.OrgTypeClient)
	if err != nil {
		t.Fatal(err)
	}
	form, err := forms.Create(ctx, user, service.CreateInput{
		InvoiceAmount:  "10",
		Currency:       "USD",
		NoDocuments:    true,
		OrganizationID: extra.ID,
	})
	if err != nil {
		t.Fatal(err)
	}
	if form.OrganizationID != extra.ID {
		t.Fatalf("organization_id=%q want %q", form.OrganizationID, extra.ID)
	}
}

func TestOrganizationCreatePersistsLegalAddressWithoutCountry(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewMemoryStore()
	seed.MustDev(t, store)
	orgs := service.NewOrganizationService(store)
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}

	org, err := orgs.Create(ctx, user, "Address Co", "7711223344", "", "г. Москва, Красная пл., 1", domain.OrgTypeClient)
	if err != nil {
		t.Fatal(err)
	}
	if org.LegalAddress != "г. Москва, Красная пл., 1" {
		t.Fatalf("legal_address=%q", org.LegalAddress)
	}
	if org.Country != "" {
		t.Fatalf("country should be empty, got %q", org.Country)
	}
}
