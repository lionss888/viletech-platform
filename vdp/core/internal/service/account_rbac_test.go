package service_test

import (
	"context"
	"testing"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/domain/systemcap"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
)

func TestAccountCreateKindAndBusinessOverride(t *testing.T) {
	t.Parallel()
	store := repository.NewMemoryStore()
	seed.MustDev(t, store)
	svc := service.NewAccountService(store)
	root := authz.Principal{AccountID: seed.RootID, Role: domain.RoleRoot, AccountKind: domain.AccountKindAdmin}

	narrow := []string{string(formpayment.CapFormView), string(formpayment.CapManagerOps)}
	acc, err := svc.CreateAdmin(context.Background(), root, service.AccountCreateInput{
		Email:                "mgr2@vdp.local",
		Password:             "pass",
		Role:                 domain.RoleManager,
		AccountKind:          domain.AccountKindUser,
		FullName:             "Mgr Two",
		BusinessCapOverrides: &narrow,
	})
	if err != nil {
		t.Fatal(err)
	}
	if acc["account_kind"] != domain.AccountKindUser {
		t.Fatalf("kind=%v", acc["account_kind"])
	}
	eff, _ := acc["effective_capabilities"].(map[string]any)
	biz, _ := eff["business"].([]string)
	hasPayment := false
	for _, c := range biz {
		if c == string(formpayment.CapManagerPayment) {
			hasPayment = true
		}
	}
	if hasPayment {
		t.Fatal("override should remove manager.payment")
	}

	_, err = svc.CreateAdmin(context.Background(), root, service.AccountCreateInput{
		Email:              "bad@vdp.local",
		Password:           "pass",
		Role:               domain.RoleUser,
		AccountKind:        domain.AccountKindUser,
		SystemCapOverrides: &[]string{string(systemcap.CapAccountsManage)},
	})
	if err == nil {
		t.Fatal("user kind must reject system overrides")
	}
}

func TestProcessConfigExcludesRoot(t *testing.T) {
	t.Parallel()
	store := repository.NewMemoryStore()
	svc := service.NewProcessRoleService(store)
	view, err := svc.GetConfig(context.Background(), authz.Principal{AccountID: "r", Role: domain.RoleRoot})
	if err != nil {
		t.Fatal(err)
	}
	for _, cfg := range view.Snapshot.Roles {
		if cfg.Role == domain.RoleRoot {
			t.Fatal("root must not appear in process roles")
		}
	}
	for _, role := range view.Mandatory {
		if role == domain.RoleRoot {
			t.Fatal("root must not be mandatory process role")
		}
	}
}
