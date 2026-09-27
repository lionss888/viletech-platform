package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
)

func TestAssignDeadlineAndProvider(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	svc := service.NewFormPaymentService(store, outbox.NewMemoryStore(), seqID())
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	form, err := svc.Create(ctx, user, service.CreateInput{InvoiceAmount: "10", Currency: "USD"})
	if err != nil {
		t.Fatal(err)
	}
	deadline := time.Date(2026, 9, 1, 12, 0, 0, 0, time.UTC)
	form, err = svc.AssignDeadline(ctx, manager, form.ID, deadline)
	if err != nil {
		t.Fatal(err)
	}
	if form.ExecutionDeadline == nil || !form.ExecutionDeadline.Equal(deadline) {
		t.Fatalf("deadline not set: %#v", form.ExecutionDeadline)
	}
	form, err = svc.AssignProvider(ctx, manager, form.ID, seed.ProviderID, true)
	if err != nil {
		t.Fatal(err)
	}
	if form.ProviderID != seed.ProviderID {
		t.Fatalf("provider=%s", form.ProviderID)
	}
	provider := authz.Principal{AccountID: seed.ProviderID, Role: domain.RoleProvider}
	view, err := svc.GetProviderView(ctx, provider, form.ID)
	if err != nil {
		t.Fatal(err)
	}
	if view.ExecutionDeadline == nil {
		t.Fatal("provider should see deadline")
	}
}

func TestAwaitingRatingQueue(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	orgs := service.NewOrganizationService(store)
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	_, err := orgs.SetRating(ctx, manager, seed.OrgID, domain.RatingRed)
	if err != nil {
		t.Fatal(err)
	}
	queue, err := orgs.ListAwaiting(ctx, manager)
	if err != nil {
		t.Fatal(err)
	}
	if len(queue) != 1 || queue[0].Status != domain.OrgAwaitingProcessing {
		t.Fatalf("queue=%#v", queue)
	}
}

func TestCreateToICOPath(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	if err := seed.ForceOrgNotApproved(store); err != nil {
		t.Fatal(err)
	}
	svc := service.NewFormPaymentService(store, outbox.NewMemoryStore(), seqID())
	enableComplianceActors(t, svc)
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	ico := authz.Principal{AccountID: seed.ICOID, Role: domain.RoleInternalComplianceOfficer}
	form, err := svc.Create(ctx, user, service.CreateInput{})
	if err != nil {
		t.Fatal(err)
	}
	form, err = svc.Transition(ctx, user, form.ID, formpayment.ActionRecognizeComplete)
	if err != nil {
		t.Fatal(err)
	}
	form, err = svc.Transition(ctx, user, form.ID, formpayment.ActionSubmit)
	if err != nil {
		t.Fatal(err)
	}
	if form.Status != formpayment.StatusOrganizationWaitingVerification {
		t.Fatalf("status=%s", form.Status)
	}
	form, err = svc.Transition(ctx, ico, form.ID, formpayment.ActionICOStart)
	if err != nil {
		t.Fatal(err)
	}
	if form.Status != formpayment.StatusOrganizationVerification {
		t.Fatalf("status=%s", form.Status)
	}
}

func TestGetEnrichesPartyNames(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	svc := service.NewFormPaymentService(store, outbox.NewMemoryStore(), seqID())
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	form, err := svc.Create(ctx, user, service.CreateInput{InvoiceAmount: "10", Currency: "USD"})
	if err != nil {
		t.Fatal(err)
	}
	form, err = svc.AssignProvider(ctx, manager, form.ID, seed.ProviderID, true)
	if err != nil {
		t.Fatal(err)
	}
	if form.AccountName != "Ivan Petrov" {
		t.Fatalf("assign response account_name=%q", form.AccountName)
	}
	if form.ManagerName != "Manager Seed" {
		t.Fatalf("assign response manager_name=%q", form.ManagerName)
	}
	if form.ProviderName != "Provider Seed" {
		t.Fatalf("assign response provider_name=%q", form.ProviderName)
	}
	ico := authz.Principal{AccountID: seed.ICOID, Role: domain.RoleInternalComplianceOfficer}
	got, err := svc.Get(ctx, ico, form.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.AccountName != "Ivan Petrov" || got.ManagerName != "Manager Seed" || got.ProviderName != "Provider Seed" {
		t.Fatalf("ico get names: account=%q manager=%q provider=%q", got.AccountName, got.ManagerName, got.ProviderName)
	}
	listed := svc.List(ctx, ico)
	found := false
	for _, item := range listed {
		if item.ID == form.ID {
			found = true
			if item.AccountName != "Ivan Petrov" {
				t.Fatalf("list account_name=%q", item.AccountName)
			}
		}
	}
	if !found {
		t.Fatal("form missing from ico list")
	}
	provider := authz.Principal{AccountID: seed.ProviderID, Role: domain.RoleProvider}
	for _, item := range svc.List(ctx, provider) {
		if item.ID == form.ID && item.AccountName != "" {
			t.Fatalf("provider list must scrub account_name, got %q", item.AccountName)
		}
	}
}

func seqID() func() string {
	n := 0
	return func() string {
		n++
		return "id-" + itoa(n)
	}
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var digits []byte
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}
	return string(digits)
}
