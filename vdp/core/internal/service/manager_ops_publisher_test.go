package service_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/outbox"
	"github.com/viletech/vdp/core/internal/repository"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
	"github.com/viletech/vdp/shared/managerops"
)

func TestMapManagerAction(t *testing.T) {
	t.Parallel()
	kind, ok := service.MapManagerAction(formpayment.ActionManagerFormAccept)
	if !ok || kind != managerops.KindApprove {
		t.Fatalf("kind=%s ok=%v", kind, ok)
	}
	_, ok = service.MapManagerAction(formpayment.ActionSubmit)
	if ok {
		t.Fatal("submit should not map")
	}
}

func TestManagerOpsPublisherDoesNotBreakTransition(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	t.Cleanup(srv.Close)
	store := repository.NewStore()
	seed.MustDev(t, store)
	box := outbox.NewMemoryStore()
	forms := service.NewFormPaymentService(store, box, seqID()).
		WithManagerOps(service.NewManagerOpsPublisher(srv.URL, "secret", time.Second))
	user := authz.Principal{AccountID: seed.UserID, Role: domain.RoleUser, OrganizationID: seed.OrgID}
	form, err := forms.Create(context.Background(), user, service.CreateInput{
		InvoiceAmount: "10", Currency: "USD", NoDocuments: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	_, err = forms.Transition(context.Background(), user, form.ID, formpayment.ActionRecognizeComplete)
	if err != nil {
		t.Fatalf("transition must succeed despite manager-ops down: %v", err)
	}
}

func TestManagerOpsPublisherPostsJSON(t *testing.T) {
	t.Parallel()
	var got managerops.Event
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-VDP-S2S") != "sec" {
			t.Fatalf("secret header=%q", r.Header.Get("X-VDP-S2S"))
		}
		_ = json.NewDecoder(r.Body).Decode(&got)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"accepted"}`))
	}))
	t.Cleanup(srv.Close)
	pub := service.NewManagerOpsPublisher(srv.URL, "sec", time.Second)
	err := pub.Publish(context.Background(), managerops.Event{
		IdempotencyKey: "k", AccountID: "a1", Source: managerops.SourceCore,
		Kind: managerops.KindAssign, FormPaymentID: "f1", OccurredAt: time.Now().UTC(),
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.FormPaymentID != "f1" || got.Kind != managerops.KindAssign {
		t.Fatalf("got=%+v", got)
	}
}
