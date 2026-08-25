package service_test

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
)

func TestR3ThreeContractTypes(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.Dev(store)
	catalog := service.NewCatalogService(store, outbox.NewMemoryStore(), r3ID("ct"))
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}

	agency, err := catalog.CreateContractFull(ctx, user, domain.Contract{
		Type: domain.ContractTypeAgency, OrganizationID: seed.OrgID,
	})
	if err != nil {
		t.Fatal(err)
	}
	sub, err := catalog.CreateContractFull(ctx, user, domain.Contract{
		Type: domain.ContractTypeSubagency, OrganizationID: seed.OrgID, AgentID: "ag-1",
	})
	if err != nil {
		t.Fatal(err)
	}
	svc, err := catalog.CreateContractFull(ctx, manager, domain.Contract{
		Type: domain.ContractTypeServices, AccountRef: seed.ManagerID,
	})
	if err != nil {
		t.Fatal(err)
	}
	if agency.Type != domain.ContractTypeAgency || sub.Type != domain.ContractTypeSubagency || svc.Type != domain.ContractTypeServices {
		t.Fatalf("types agency=%s sub=%s svc=%s", agency.Type, sub.Type, svc.Type)
	}
	if agency.UploadedBy == "" || agency.HistoryJSON == "" {
		t.Fatal("uploadedBy/history required")
	}
	if _, err := catalog.CreateContractFull(ctx, manager, domain.Contract{Type: domain.ContractTypeServices}); err == nil {
		t.Fatal("services without account_ref must fail")
	}
}

func TestR3TemplatesBoundToAgent(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.Dev(store)
	catalog := service.NewCatalogService(store, outbox.NewMemoryStore(), r3ID("tpl"))
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	agent, err := catalog.SaveAgent(ctx, domain.Agent{Name: "PA-1", INN: "7701"})
	if err != nil {
		t.Fatal(err)
	}
	tpl, err := catalog.CreateContractTemplate(ctx, manager, agent.ID, "agency-tpl", "file-1", domain.ContractTypeAgency)
	if err != nil {
		t.Fatal(err)
	}
	if !tpl.IsTemplate || tpl.AgentID != agent.ID || tpl.Status != domain.ContractStatusAccepted {
		t.Fatalf("template=%+v", tpl)
	}
	list, err := catalog.TemplatesForAgent(ctx, agent.ID)
	if err != nil || len(list) != 1 {
		t.Fatalf("templates=%v err=%v", list, err)
	}
	other, _ := catalog.TemplatesForAgent(ctx, "missing-agent")
	if len(other) != 0 {
		t.Fatal("expected empty for other agent")
	}
}

func TestR3ManualAttachAutoConfirm(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.Dev(store)
	box := outbox.NewMemoryStore()
	forms := service.NewFormPaymentService(store, box, r3ID("f"))
	catalog := service.NewCatalogService(store, box, r3ID("c"))
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}

	form, err := forms.Create(ctx, user, service.CreateInput{Currency: "USD", InvoiceAmount: "100", NoDocuments: true})
	if err != nil {
		t.Fatal(err)
	}
	form.Status = formpayment.StatusFormAccepted
	agent, _ := catalog.SaveAgent(ctx, domain.Agent{Name: "PA"})
	form.AgentID = agent.ID
	_ = store.SaveForm(ctx, form)

	updated, contract, err := forms.ManualAttachContract(ctx, manager, form.ID, domain.ContractTypeAgency, "file-x", "D-1", "")
	if err != nil {
		t.Fatal(err)
	}
	if contract.Status != domain.ContractStatusAccepted {
		t.Fatalf("contract status=%s", contract.Status)
	}
	if updated.Status != formpayment.StatusSigningOrder {
		t.Fatalf("form status=%s want signing_order", updated.Status)
	}
	if updated.ContractID != contract.ID {
		t.Fatal("form.contract_id not linked")
	}
	if !strings.Contains(contract.HistoryJSON, "manual_attach_auto_confirm") {
		t.Fatalf("history=%s", contract.HistoryJSON)
	}
}

func TestR3OnBehalfVisibility(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.Dev(store)
	box := outbox.NewMemoryStore()
	forms := service.NewFormPaymentService(store, box, r3ID("ob"))
	catalog := service.NewCatalogService(store, box, r3ID("obc"))
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}

	_ = store.SaveOrganization(ctx, domain.Organization{
		ID: "org-behalf", AccountID: seed.UserID, Name: "Behalf LLC", Status: domain.OrgApproved, IsActive: true,
	})
	form, err := forms.Create(ctx, user, service.CreateInput{Currency: "EUR", InvoiceAmount: "50", NoDocuments: true})
	if err != nil {
		t.Fatal(err)
	}
	sub, err := catalog.CreateContractFull(ctx, manager, domain.Contract{
		Type: domain.ContractTypeSubagency, OrganizationID: seed.OrgID,
	})
	if err != nil {
		t.Fatal(err)
	}
	form.ContractID = sub.ID
	_ = store.SaveForm(ctx, form)

	if _, err := forms.SetOnBehalfOrganization(ctx, user, form.ID, "", string(domain.ContractTypeSubagency)); err == nil {
		t.Fatal("subagency requires on_behalf")
	}
	got, err := forms.SetOnBehalfOrganization(ctx, user, form.ID, "org-behalf", string(domain.ContractTypeSubagency))
	if err != nil {
		t.Fatal(err)
	}
	if got.OnBehalfOrganizationID != "org-behalf" {
		t.Fatalf("on_behalf=%s", got.OnBehalfOrganizationID)
	}
	reqd, err := forms.RequiresOnBehalf(ctx, form.ID)
	if err != nil || !reqd {
		t.Fatalf("required=%v err=%v", reqd, err)
	}

	agency, _ := catalog.CreateContractFull(ctx, manager, domain.Contract{
		Type: domain.ContractTypeAgency, OrganizationID: seed.OrgID,
	})
	form.ContractID = agency.ID
	form.OnBehalfOrganizationID = ""
	_ = store.SaveForm(ctx, form)
	reqd, _ = forms.RequiresOnBehalf(ctx, form.ID)
	if reqd {
		t.Fatal("agency should not require on-behalf")
	}
}

func TestR3ResolveBranchNoContractGoesWaiting(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.Dev(store)
	forms := service.NewFormPaymentService(store, outbox.NewMemoryStore(), r3ID("br"))
	catalog := service.NewCatalogService(store, outbox.NewMemoryStore(), r3ID("bra"))
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	agent, _ := catalog.SaveAgent(ctx, domain.Agent{Name: "PA"})
	form, _ := forms.Create(ctx, user, service.CreateInput{Currency: "USD", InvoiceAmount: "1", NoDocuments: true})
	form.Status = formpayment.StatusFormAccepted
	form.AgentID = agent.ID
	_ = store.SaveForm(ctx, form)
	got, err := forms.ResolveContractBranch(ctx, manager, form.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.Status != formpayment.StatusContractWaiting {
		t.Fatalf("status=%s", got.Status)
	}
}

func TestR3AdminChangeTypeHistory(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.Dev(store)
	catalog := service.NewCatalogService(store, outbox.NewMemoryStore(), r3ID("ch"))
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	c, err := catalog.CreateContractFull(ctx, manager, domain.Contract{
		Type: domain.ContractTypeAgency, OrganizationID: seed.OrgID,
	})
	if err != nil {
		t.Fatal(err)
	}
	updated, err := catalog.ChangeContractType(ctx, manager, c.ID, domain.ContractTypeSubagency)
	if err != nil {
		t.Fatal(err)
	}
	if updated.Type != domain.ContractTypeSubagency {
		t.Fatal(updated.Type)
	}
	var hist []domain.ContractHistoryEntry
	_ = json.Unmarshal([]byte(updated.HistoryJSON), &hist)
	found := false
	for _, e := range hist {
		if e.Action == "change_type" {
			found = true
		}
	}
	if !found {
		t.Fatalf("history=%s", updated.HistoryJSON)
	}
}

func r3ID(prefix string) func() string {
	n := 0
	return func() string {
		n++
		return prefix + "-" + itoa(n)
	}
}
