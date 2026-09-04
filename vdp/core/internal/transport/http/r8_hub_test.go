package httpapi_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
	"github.com/viletech/vdp/shared/events"
)

func TestR8HubCallbackOCRAndDiadocTransitionOnly(t *testing.T) {
	core, secret, _ := newStack(t)
	user := login(t, core, "user@vdp.local", "user")

	form := postJSON(t, core, user, "/api/v1/forms", map[string]string{"currency": "USD", "invoice_amount": "10"})
	id, _ := form["id"].(string)
	if form["status"] != "creating" {
		t.Fatalf("status=%v", form["status"])
	}

	body, _ := json.Marshal(map[string]any{
		"form_payment_id": id, "action": "ocr_recognized",
		"fields": map[string]any{"contract_number": "OCR-1", "invoice_amount": "999", "currency": "EUR"},
	})
	res := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/internal/hub/callback", bytes.NewReader(body))
	req.Header.Set("X-VDP-S2S", secret)
	req.Header.Set("Content-Type", "application/json")
	core.ServeHTTP(res, req)
	if res.Code != 200 {
		t.Fatalf("ocr callback %d %s", res.Code, res.Body.String())
	}
	got := getJSON(t, core, user, "/api/v1/forms/"+id)
	if got["status"] != "draft" {
		t.Fatalf("after ocr status=%v", got["status"])
	}
	if got["contract_number"] != "OCR-1" || got["currency"] != "EUR" {
		t.Fatalf("fields %#v", got)
	}

	dbody, _ := json.Marshal(map[string]any{"form_payment_id": id, "action": "diadoc_signed", "kind": "report"})
	dres := httptest.NewRecorder()
	dreq := httptest.NewRequest(http.MethodPost, "/api/v1/internal/hub/callback", bytes.NewReader(dbody))
	dreq.Header.Set("X-VDP-S2S", secret)
	dreq.Header.Set("Content-Type", "application/json")
	core.ServeHTTP(dres, dreq)
	if dres.Code != 200 {
		t.Fatalf("diadoc %d %s", dres.Code, dres.Body.String())
	}
	still := getJSON(t, core, user, "/api/v1/forms/"+id)
	if still["status"] != "draft" {
		t.Fatalf("diadoc must not change draft status got=%v", still["status"])
	}
}

func TestR8Hub5xxOutboxRetryFormStatusUnchanged(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	store := repository.NewStore()
	seed.MustDev(t, store)
	box := outbox.NewMemoryStore()
	forms := service.NewFormPaymentService(store, box, func() string { return "f-fail" })
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	form, err := forms.Create(ctx, user, service.CreateInput{InvoiceAmount: "1", Currency: "USD"})
	if err != nil {
		t.Fatal(err)
	}
	before := form.Status
	_ = box.Enqueue(ctx, outbox.Event{
		ID: "e-fail", AggregateID: form.ID, AggregateType: events.AggregateFormPayment,
		EventType: events.TypeTelegramNotify, FormPaymentID: form.ID,
		Payload: map[string]any{"x": 1}, Status: "pending", MaxRetries: 2, CreatedAt: time.Now().UTC(),
	})
	hub := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
	}))
	t.Cleanup(hub.Close)
	pub := service.NewHubPublisher(box, hub.URL, "s", time.Second)
	_ = pub.Flush(ctx)
	_ = pub.Flush(ctx)
	pending, _ := box.Pending(ctx, 10)
	for _, e := range pending {
		if e.ID == "e-fail" {
			t.Fatalf("event should be exhausted/failed, still pending %#v", e)
		}
	}
	got, _ := store.FormByID(ctx, form.ID)
	if got.Status != before {
		t.Fatalf("status changed %s -> %s on hub failure", before, got.Status)
	}
}

func TestR8IntegrationModulesNotStub(t *testing.T) {
	t.Parallel()
	for _, mod := range []string{"telegram", "diadoc", "recognition", "payment", "partner"} {
		for _, row := range nestEndpointParity {
			if row.Module != mod {
				continue
			}
			if row.Status == ParityStub || row.Status == ParityMissing {
				t.Fatalf("%s %s still %s", mod, row.NestPath, row.Status)
			}
		}
	}
}
