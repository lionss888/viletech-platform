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

func TestOrganizationProfilePatchSignerFields(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewMemoryStore()
	seed.MustDev(t, store)
	orgs := service.NewOrganizationService(store)
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}

	org, err := orgs.UpdateProfile(ctx, user, seed.OrgID, domain.OrgProfilePatch{
		BusinessForm:   domain.BusinessFormOOO,
		Phone:          "+7-495-000-00-01",
		Email:          "billing@client.example",
		SignerName:     "Ivan Petrov",
		SignerPosition: domain.SignerGeneralDirector,
	})
	if err != nil {
		t.Fatal(err)
	}
	if org.Phone != "+7-495-000-00-01" || org.SignerName != "Ivan Petrov" {
		t.Fatalf("org=%+v", org)
	}

	_, err = orgs.UpdateProfile(ctx, user, seed.OrgID, domain.OrgProfilePatch{
		SignerPosition: domain.SignerOther,
	})
	if err == nil {
		t.Fatal("signer other without text must fail")
	}
}

func TestDocsGeneratePayloadMatrixKeys(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewMemoryStore()
	seed.MustDev(t, store)
	box := outbox.NewMemoryStore()
	forms := service.NewFormPaymentService(store, box, seqID())
	catalog := service.NewCatalogService(store, box, seqID())
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}

	org, _ := store.OrganizationByID(ctx, seed.OrgID)
	org.BusinessForm = domain.BusinessFormOOO
	org.Phone = "+7-495-111"
	org.Email = "org@client.example"
	org.SignerName = "Director"
	org.SignerPosition = domain.SignerGeneralDirector
	_ = store.SaveOrganization(ctx, org)

	cp, err := catalog.CreateCounterparty(ctx, user, "Beneficiary LLC", "US", "999", `[{"uuid":"b1","name":"Main","accounts":[{"uuid":"a1","number":"40802810","currency":"USD","iban":"US00TEST"}]}]`)
	if err != nil {
		t.Fatal(err)
	}

	agent, err := catalog.CreateAgent(ctx, manager, domain.Agent{Name: "PA Agent", INN: "7700000001", SignID: "sig-1", StampID: "stamp-1"})
	if err != nil {
		t.Fatal(err)
	}
	tpl, err := catalog.CreateContractTemplate(ctx, manager, agent.ID, "agency-tpl", "file-tpl-1", domain.ContractTypeAgency)
	if err != nil {
		t.Fatal(err)
	}

	form, err := forms.Create(ctx, user, service.CreateInput{
		InvoiceAmount: "1000", Currency: "USD", Direction: formpayment.DirectionImport,
		ContractNumber: "C-B2", ContractDate: "2026-08-01",
	})
	if err != nil {
		t.Fatal(err)
	}
	form.AgentID = agent.ID
	form.CounterpartyID = cp.ID
	form.PaymentPurpose = "Invoice payment under C-B2"
	if err := store.SaveForm(ctx, form); err != nil {
		t.Fatal(err)
	}

	if err := forms.RequestPaymentOrderGeneration(ctx, manager, form.ID, "import_order"); err != nil {
		t.Fatal(err)
	}
	payload := extractDocsPayload(t, box)
	assertPayloadKeys(t, payload, []string{
		"template_id", "template_file_id", "organization_inn", "organization_name",
		"organization_business_form", "organization_phone", "organization_email",
		"organization_signer_name", "organization_signer_position",
		"agent_name", "agent_signature_file_id", "counterparty_name", "counterparty_banks",
		"payment_purpose", "document_date", "currency", "invoice_amount",
	})
	if payload["template_id"] != tpl.ID {
		t.Fatalf("template_id=%v", payload["template_id"])
	}
	banks, ok := payload["counterparty_banks"].([]service.CounterpartyBank)
	if !ok || len(banks) == 0 {
		t.Fatalf("counterparty_banks=%#v", payload["counterparty_banks"])
	}

	if err := forms.RequestPaymentOrderGeneration(ctx, manager, form.ID, "agent_report"); err != nil {
		t.Fatal(err)
	}
	payload = extractDocsPayload(t, box)
	assertPayloadKeys(t, payload, []string{
		"contract_number", "rate_value", "document_date", "organization_name",
	})
}

func extractDocsPayload(t *testing.T, box *outbox.MemoryStore) map[string]any {
	t.Helper()
	pending, err := box.Pending(context.Background(), 20)
	if err != nil {
		t.Fatal(err)
	}
	for i := len(pending) - 1; i >= 0; i-- {
		if pending[i].EventType == events.TypeDocsGenerate {
			return pending[i].Payload
		}
	}
	t.Fatal("docs.generate not enqueued")
	return nil
}

func assertPayloadKeys(t *testing.T, payload map[string]any, keys []string) {
	t.Helper()
	for _, k := range keys {
		v, ok := payload[k]
		if !ok {
			t.Fatalf("missing payload key %q in %#v", k, payload)
		}
		if s, _ := v.(string); s == "" && v == nil {
			t.Fatalf("empty payload key %q", k)
		}
	}
}
