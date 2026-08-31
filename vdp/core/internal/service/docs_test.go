package service_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/service"
)

func TestDocsCounterpartyBanksAndAttach(t *testing.T) {
	t.Parallel()
	store := repository.NewMemoryStore()
	ids := 0
	catalog := service.NewCatalogService(store, outbox.NewMemoryStore(), func() string {
		ids++
		return fmt.Sprintf("x%d", ids)
	})
	user := authz.Principal{AccountID: "u1", Role: domain.RoleUser, OrganizationID: "o1"}
	banks := `[{"uuid":"b1","name":"Bank","accounts":[]}]`
	cp, err := catalog.CreateCounterparty(context.Background(), user, "Name", "DE", "1", banks)
	if err != nil {
		t.Fatal(err)
	}
	cp, err = catalog.AddBankAccount(context.Background(), user, cp.ID, "b1", service.CounterpartyBankAccount{Number: "1", Currency: "EUR"})
	if err != nil {
		t.Fatal(err)
	}
	if cp.Banks == "" || cp.Banks == "[]" {
		t.Fatalf("banks empty: %s", cp.Banks)
	}
	file, err := catalog.UploadFileBytes(context.Background(), user, "", "application/pdf", []byte("pdf"))
	if err != nil {
		t.Fatal(err)
	}
	_, _, data, err := catalog.PreviewFile(context.Background(), user, file.ID)
	if err != nil || string(data) != "pdf" {
		t.Fatalf("preview err=%v data=%q", err, data)
	}
}

func TestDocsApprovalIndicatorAndCanSkip(t *testing.T) {
	t.Parallel()
	store := repository.NewMemoryStore()
	ids := 0
	catalog := service.NewCatalogService(store, outbox.NewMemoryStore(), func() string {
		ids++
		return fmt.Sprintf("a%d", ids)
	})
	user := authz.Principal{AccountID: "u1", Role: domain.RoleUser}
	eco := authz.Principal{AccountID: "eco", Role: domain.RoleComplianceOfficer}
	cp, err := catalog.CreateCounterparty(context.Background(), user, "ACME", "DE", "1", "[]")
	if err != nil {
		t.Fatal(err)
	}
	ind, err := catalog.CounterpartyApprovalIndicator(context.Background(), user, cp.ID)
	if err != nil {
		t.Fatal(err)
	}
	if ind["requiresReview"] != true {
		t.Fatalf("pending requires review: %#v", ind)
	}
	skip, err := catalog.CounterpartyCanSkipCompliance(context.Background(), user, cp.ID)
	if err != nil || skip {
		t.Fatalf("pending canSkip=%v err=%v", skip, err)
	}
	if _, err := catalog.SetCounterpartyApproval(context.Background(), eco, cp.ID, domain.CounterpartyApprovalApproved, "ok"); err != nil {
		t.Fatal(err)
	}
	skip, err = catalog.CounterpartyCanSkipCompliance(context.Background(), user, cp.ID)
	if err != nil || !skip {
		t.Fatalf("fresh approved canSkip=%v err=%v", skip, err)
	}
	ind, _ = catalog.CounterpartyApprovalIndicator(context.Background(), user, cp.ID)
	if ind["requiresReview"] != false {
		t.Fatalf("fresh approved should not require review: %#v", ind)
	}
}

func TestFileACLUserCannotPreviewForeignFormFile(t *testing.T) {
	t.Parallel()
	store := repository.NewMemoryStore()
	ids := 0
	catalog := service.NewCatalogService(store, outbox.NewMemoryStore(), func() string {
		ids++
		return fmt.Sprintf("f%d", ids)
	})
	owner := authz.Principal{AccountID: "owner", Role: domain.RoleUser, OrganizationID: "org-a"}
	other := authz.Principal{AccountID: "other", Role: domain.RoleUser, OrganizationID: "org-b"}
	file, err := catalog.UploadFileBytes(context.Background(), owner, "form-foreign", "application/pdf", []byte("secret"))
	if err != nil {
		t.Fatal(err)
	}
	if _, _, _, err := catalog.PreviewFile(context.Background(), other, file.ID); err == nil {
		t.Fatal("foreign user must not preview form file")
	}
	provider := authz.Principal{AccountID: "prov", Role: domain.RoleProvider}
	if _, _, _, err := catalog.PreviewFile(context.Background(), provider, file.ID); err != nil {
		t.Fatalf("provider may preview for ops: %v", err)
	}
}

