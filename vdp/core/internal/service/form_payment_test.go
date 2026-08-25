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
	seed.Dev(store)
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
	form, err = svc.AssignProvider(ctx, manager, form.ID, seed.ProviderID)
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
	seed.Dev(store)
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
	seed.Dev(store)
	svc := service.NewFormPaymentService(store, outbox.NewMemoryStore(), seqID())
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
