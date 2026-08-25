package service_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/domain/rate"
	"github.com/viletech/vdp/core/internal/export"
	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
	"github.com/viletech/vdp/shared/events"
)

func TestResolveRateMarkupAndBankReadonly(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.Dev(store)
	acct, _ := store.AccountByID(ctx, seed.UserID)
	acct.BankRateReadonly = true
	settings, _ := json.Marshal([]rate.Settings{{
		CurrencyScope: "all", MarkupBps: 100, BankReadonly: true,
		Reward: rate.RewardCfg{Mode: rate.RewardSameForAll, SameForAll: &rate.RewardFlat{FeePercentBps: 300}},
	}})
	acct.RateSettingsJSON = string(settings)
	_ = store.SaveAccount(ctx, acct)

	svc := service.NewFormPaymentService(store, outbox.NewMemoryStore(), seqID())
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	form, err := svc.Create(ctx, user, service.CreateInput{InvoiceAmount: "1000", Currency: "USD"})
	if err != nil {
		t.Fatal(err)
	}
	override := 90.0
	_, _, err = svc.ResolveAndSetRate(ctx, user, form.ID, &override, "rub", "usd", nil)
	if err == nil {
		t.Fatal("user must not override bank readonly rate")
	}
	form, resolved, err := svc.ResolveAndSetRate(ctx, manager, form.ID, &override, "rub", "usd", nil)
	if err != nil {
		t.Fatal(err)
	}
	if resolved.MarkupBps != 100 || !resolved.BankReadonly {
		t.Fatalf("resolved=%#v", resolved)
	}
	if form.Rate.Value == "" || form.Rate.Source != string(rate.SourceManual) {
		t.Fatalf("form rate=%#v", form.Rate)
	}
	form, result, err := svc.CalculateAndApplyCommission(ctx, manager, form.ID, "")
	if err != nil {
		t.Fatal(err)
	}
	if result.FeePercentBps != 300 || form.Commission.FeePercent == "" {
		t.Fatalf("commission result=%#v form=%#v", result, form.Commission)
	}
}

func TestPOGEnqueueAttachAndTemplateImportXLSX(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.Dev(store)
	box := outbox.NewMemoryStore()
	svc := service.NewFormPaymentService(store, box, seqID())
	catalog := service.NewCatalogService(store, box, seqID())
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}

	form, err := svc.Create(ctx, user, service.CreateInput{
		InvoiceAmount: "500", Currency: "EUR", Direction: formpayment.DirectionExport,
	})
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now().UTC()
	order := formpayment.Order{
		ID: "ord-1", FormPaymentID: form.ID, Kind: formpayment.OrderKindMain,
		Status: formpayment.StatusSigningOrder, CreatedAt: now, UpdatedAt: now,
	}
	_ = store.SaveOrder(ctx, order)
	form.ActiveOrderID = order.ID
	_ = store.SaveForm(ctx, form)

	if err := svc.RequestPaymentOrderGeneration(ctx, manager, form.ID, ""); err != nil {
		t.Fatal(err)
	}
	pending, _ := box.Pending(ctx, 10)
	foundEvt := false
	for _, e := range pending {
		if e.EventType == events.TypeDocsGenerate {
			foundEvt = true
			break
		}
	}
	if !foundEvt {
		t.Fatal("docs.generate not enqueued")
	}
	form, err = svc.ApplyDocsGenerateResult(ctx, form.ID, map[string]any{
		"storage_key": "docs/export_order.pdf", "status": "success",
	})
	if err != nil {
		t.Fatal(err)
	}
	form.UnpackDocsJSON()
	if form.POGStatus != service.POGSuccess || form.POGFileID == "" {
		t.Fatalf("pog=%s file=%s", form.POGStatus, form.POGFileID)
	}
	if form.POGKind != "export_order" {
		t.Fatalf("kind=%s want export_order", form.POGKind)
	}
	o, err := store.OrderByID(ctx, form.ActiveOrderID)
	if err != nil {
		t.Fatal(err)
	}
	linked := false
	for _, id := range o.FileIDs {
		if id == form.POGFileID {
			linked = true
		}
	}
	if !linked {
		t.Fatalf("active order missing pog file: %#v", o.FileIDs)
	}

	imp, err := catalog.SaveTemplate(ctx, manager, domain.Template{Name: "imp", Direction: "import"})
	if err != nil {
		t.Fatal(err)
	}
	exp, err := catalog.SaveTemplate(ctx, manager, domain.Template{Name: "exp", Direction: "export"})
	if err != nil {
		t.Fatal(err)
	}
	xlsx, err := export.MinimalXLSX("Import", []string{"amount", "currency"}, [][]string{{"111", "GBP"}, {"222", "CHF"}})
	if err != nil {
		t.Fatal(err)
	}
	imported, err := svc.ImportExcelWithTemplate(ctx, user, imp.ID, xlsx)
	if err != nil {
		t.Fatal(err)
	}
	if len(imported) != 2 || imported[0].Status != formpayment.StatusDraft || imported[0].Direction != formpayment.DirectionImport {
		t.Fatalf("import xlsx=%#v", imported)
	}
	csv := []byte("amount,currency\n50,USD\n")
	exported, err := svc.ImportExcelWithTemplate(ctx, user, exp.ID, csv)
	if err != nil {
		t.Fatal(err)
	}
	if len(exported) != 1 || exported[0].Direction != formpayment.DirectionExport || exported[0].Status != formpayment.StatusDraft {
		t.Fatalf("export tpl=%#v", exported)
	}
}
