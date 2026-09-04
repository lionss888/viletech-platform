package service_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
	"github.com/viletech/vdp/shared/events"
)

func TestBankCreateIdempotentAutoskipAndWebhook(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	box := outbox.NewMemoryStore()
	n := 0
	newID := func() string {
		n++
		return "b" + itoa(n)
	}
	forms := service.NewFormPaymentService(store, box, newID)
	orgs := service.NewOrganizationService(store)
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}
	bank := authz.Principal{AccountID: seed.BankID, Role: domain.RoleBank, OrganizationID: seed.BankOrgID}

	var webhookBodies [][]byte
	var mu sync.Mutex
	wh := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer r.Body.Close()
		buf := make([]byte, 4096)
		n, _ := r.Body.Read(buf)
		mu.Lock()
		webhookBodies = append(webhookBodies, append([]byte(nil), buf[:n]...))
		mu.Unlock()
		if r.Header.Get("X-VDP-Bank-Signature") == "" {
			t.Error("missing signature")
		}
		w.WriteHeader(http.StatusOK)
	}))
	t.Cleanup(wh.Close)

	agent, err := service.NewCatalogService(store, box, newID).CreateAgent(ctx, manager, domain.Agent{Name: "Bank Agent"})
	if err != nil {
		t.Fatal(err)
	}
	_ = store.SaveContract(ctx, domain.Contract{
		ID: "ctr-bank", Type: domain.ContractTypeAgency, OrganizationID: seed.BankOrgID,
		AgentID: agent.ID, Status: domain.ContractStatusAccepted, IsTemplate: false,
	})
	_, err = orgs.SetBankSettings(ctx, manager, seed.BankOrgID, service.BankSettingsInput{
		ClientType: domain.ClientTypeBank, BankFixedCommissionPercent: "2",
		ApplyPlatformMarkup: false, DefaultAgentID: agent.ID,
		BankWebhookURL: wh.URL, BankWebhookSecret: "sekret",
	})
	if err != nil {
		t.Fatal(err)
	}

	first, replayed, err := forms.CreateOrGetBankForm(ctx, bank, service.BankCreateInput{
		IdempotencyKey: "idem-1", OrganizationID: seed.BankOrgID,
		Amount: "1000", Currency: "USD",
	})
	if err != nil || replayed {
		t.Fatalf("create err=%v replayed=%v", err, replayed)
	}
	if first.Channel != formpayment.ChannelBank || first.Status != string(formpayment.StatusFormAccepted) {
		t.Fatalf("autoskip expected form_accepted got %#v", first)
	}
	if first.AgentID != agent.ID {
		t.Fatalf("agent=%s", first.AgentID)
	}
	if first.Commission.FeePercent != "2" {
		t.Fatalf("commission=%#v", first.Commission)
	}

	second, replayed, err := forms.CreateOrGetBankForm(ctx, bank, service.BankCreateInput{
		IdempotencyKey: "idem-1", OrganizationID: seed.BankOrgID,
		Amount: "9999", Currency: "EUR",
	})
	if err != nil || !replayed {
		t.Fatalf("replay err=%v replayed=%v", err, replayed)
	}
	if second.ID != first.ID || second.InvoiceAmount != "1000" {
		t.Fatalf("idempotency broken %#v vs %#v", first, second)
	}

	pub := service.NewHubPublisher(box, "http://127.0.0.1:1", "x", time.Second)
	if err := pub.Flush(ctx); err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		mu.Lock()
		n := len(webhookBodies)
		mu.Unlock()
		if n > 0 {
			break
		}
		time.Sleep(10 * time.Millisecond)
		_ = pub.Flush(ctx)
	}
	mu.Lock()
	defer mu.Unlock()
	if len(webhookBodies) == 0 {
		pending, _ := box.Pending(ctx, 20)
		t.Fatalf("expected webhook delivery, pending=%d", len(pending))
	}
	var payload map[string]any
	_ = json.Unmarshal(webhookBodies[0], &payload)
	if payload["event"] != "status_changed" || payload["correlation_id"] == "" {
		t.Fatalf("webhook payload %#v", payload)
	}
}

func TestBankRBACCannotSeeOtherOrgOrUIForms(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	box := outbox.NewMemoryStore()
	forms := service.NewFormPaymentService(store, box, func() string { return "x" })
	bank := authz.Principal{AccountID: seed.BankID, Role: domain.RoleBank, OrganizationID: seed.BankOrgID}
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}

	uiForm, err := forms.Create(ctx, user, service.CreateInput{InvoiceAmount: "1", Currency: "USD"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := forms.Get(ctx, bank, uiForm.ID); err == nil {
		t.Fatal("bank must not see UI form")
	}

	created, _, err := forms.CreateOrGetBankForm(ctx, bank, service.BankCreateInput{
		IdempotencyKey: "k2", OrganizationID: seed.BankOrgID, Amount: "10", Currency: "USD",
	})
	if err != nil {
		t.Fatal(err)
	}
	otherBank := authz.Principal{AccountID: "other-bank", Role: domain.RoleBank, OrganizationID: "other-org"}
	_ = store.SaveAccount(ctx, domain.Account{ID: "other-bank", Email: "o@b", Role: domain.RoleBank, OrganizationID: "other-org", Active: true})
	_ = store.SaveOrganization(ctx, domain.Organization{
		ID: "other-org", AccountID: "other-bank", Status: domain.OrgApproved, IsActive: true,
		ClientType: domain.ClientTypeBank, BankFixedCommissionPercent: "1",
	})
	if _, err := forms.GetBankForm(ctx, otherBank, created.ID); err == nil {
		t.Fatal("other bank client must not see foreign bank form")
	}
	view := formpayment.ProjectForProvider(formpayment.Form{
		ID: created.ID, Channel: formpayment.ChannelBank, AccountID: seed.BankID,
		OrganizationID: seed.BankOrgID, Status: formpayment.StatusFormAccepted,
	})
	if formpayment.ContainsPII(view) {
		t.Fatal("provider view must not contain PII")
	}
}

func TestBankWebhookSignRequestOnSigningOrder(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	box := outbox.NewMemoryStore()
	forms := service.NewFormPaymentService(store, box, func() string { return "sign1" })
	bank := authz.Principal{AccountID: seed.BankID, Role: domain.RoleBank, OrganizationID: seed.BankOrgID}
	manager := authz.Principal{AccountID: seed.ManagerID, Role: domain.RoleManager}

	org, _ := store.OrganizationByID(ctx, seed.BankOrgID)
	org.BankWebhookURL = "http://example.invalid/hook"
	org.BankWebhookSecret = "s"
	_ = store.SaveOrganization(ctx, org)

	resp, _, err := forms.CreateOrGetBankForm(ctx, bank, service.BankCreateInput{
		IdempotencyKey: "sign-idem", OrganizationID: seed.BankOrgID, Amount: "50", Currency: "USD",
	})
	if err != nil {
		t.Fatal(err)
	}
	form, _ := store.FormByID(ctx, resp.ID)
	form.Status = formpayment.StatusFormAccepted
	_ = store.SaveForm(ctx, form)
	_, err = forms.Transition(ctx, manager, resp.ID, formpayment.ActionManagerSendOrder)
	if err != nil {
		t.Fatal(err)
	}
	pending, _ := box.Pending(ctx, 50)
	found := false
	for _, e := range pending {
		if e.EventType != events.TypeBankWebhook {
			continue
		}
		if ev, _ := e.Payload["event"].(string); ev == "sign_request" {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected sign_request bank webhook, events=%d", len(pending))
	}
}
