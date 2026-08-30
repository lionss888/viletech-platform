package service_test

import (
	"context"
	"encoding/json"
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

func TestDocsGeneratePayloadIncludesAgentTemplate(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewMemoryStore()
	seed.Dev(store)
	box := outbox.NewMemoryStore()
	forms := service.NewFormPaymentService(store, box, seqID())
	catalog := service.NewCatalogService(store, box, seqID())
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}

	agent, err := catalog.CreateAgent(ctx, manager, domain.Agent{Name: "PA Agent", INN: "7700000001"})
	if err != nil {
		t.Fatal(err)
	}
	tpl, err := catalog.CreateContractTemplate(ctx, manager, agent.ID, "agency-tpl", "file-tpl-1", domain.ContractTypeAgency)
	if err != nil {
		t.Fatal(err)
	}
	form, err := forms.Create(ctx, user, service.CreateInput{
		InvoiceAmount: "1000", Currency: "USD", Direction: formpayment.DirectionImport,
	})
	if err != nil {
		t.Fatal(err)
	}
	form.AgentID = agent.ID
	if err := store.SaveForm(ctx, form); err != nil {
		t.Fatal(err)
	}
	if err := forms.RequestPaymentOrderGeneration(ctx, manager, form.ID, "payment_order"); err != nil {
		t.Fatal(err)
	}
	pending, err := box.Pending(ctx, 10)
	if err != nil {
		t.Fatal(err)
	}
	var payload map[string]any
	for _, e := range pending {
		if e.EventType != events.TypeDocsGenerate {
			continue
		}
		payload = e.Payload
		break
	}
	if payload == nil {
		t.Fatal("docs.generate not enqueued")
	}
	if payload["template_id"] != tpl.ID {
		t.Fatalf("template_id=%v want %s payload=%#v", payload["template_id"], tpl.ID, payload)
	}
	if payload["template_file_id"] != tpl.FileID {
		t.Fatalf("template_file_id=%v", payload["template_file_id"])
	}
	if payload["organization_inn"] == "" {
		t.Fatalf("missing organization_inn in %#v", payload)
	}
	raw, _ := json.Marshal(payload)
	if !json.Valid(raw) {
		t.Fatalf("invalid json payload %s", raw)
	}
}
