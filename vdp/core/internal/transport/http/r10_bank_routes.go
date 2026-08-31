package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/service"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

func (s *Server) registerBankRoutes() {
	s.mux.HandleFunc("PUT /api/v1/admin/organizations/{id}/bank-settings", s.withAuth(s.handleAdminBankSettings))
	s.mux.HandleFunc("PATCH /api/v1/admin/organizations/{id}/bank-settings", s.withAuth(s.handleAdminBankSettings))
	s.mux.HandleFunc("POST /api/v1/bank/forms", s.withAuth(s.handleBankCreateForm))
	s.mux.HandleFunc("GET /api/v1/bank/forms", s.withAuth(s.handleBankListForms))
	s.mux.HandleFunc("GET /api/v1/bank/forms/{id}", s.withAuth(s.handleBankGetForm))
}

func (s *Server) handleAdminBankSettings(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body service.BankSettingsInput
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, apperrors.ErrInvalidInput)
		return
	}
	org, err := s.orgs.SetBankSettings(r.Context(), principal, r.PathValue("id"), body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, org)
}

func (s *Server) handleBankCreateForm(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		OrganizationID string                   `json:"organization_id"`
		CounterpartyID string                   `json:"counterparty_id"`
		Amount         string                   `json:"amount"`
		InvoiceAmount  string                   `json:"invoice_amount"`
		Currency       string                   `json:"currency"`
		Direction      formpayment.Direction    `json:"direction"`
		Kind           formpayment.Kind         `json:"kind"`
		ContractNumber string                   `json:"contract_number"`
		ContractDate   string                   `json:"contract_date"`
		CorrelationID  string                   `json:"correlation_id"`
		Purpose        string                   `json:"purpose"`
		Files          []formpayment.DocFileRef `json:"files"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, apperrors.ErrInvalidInput)
		return
	}
	amount := body.Amount
	if amount == "" {
		amount = body.InvoiceAmount
	}
	idem := r.Header.Get("Idempotency-Key")
	if idem == "" {
		idem = r.Header.Get("X-Idempotency-Key")
	}
	resp, replayed, err := s.forms.CreateOrGetBankForm(r.Context(), principal, service.BankCreateInput{
		IdempotencyKey: idem,
		OrganizationID: body.OrganizationID,
		CounterpartyID: body.CounterpartyID,
		Amount:         amount,
		Currency:       body.Currency,
		Direction:      body.Direction,
		Kind:           body.Kind,
		ContractNumber: body.ContractNumber,
		ContractDate:   body.ContractDate,
		FileRefs:       body.Files,
		CorrelationID:  body.CorrelationID,
		Purpose:        body.Purpose,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	if replayed {
		w.Header().Set("X-Idempotent-Replayed", "true")
		writeJSON(w, http.StatusOK, resp)
		return
	}
	writeJSON(w, http.StatusCreated, resp)
}

func (s *Server) handleBankListForms(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.forms.ListBankForms(r.Context(), principal)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleBankGetForm(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	resp, err := s.forms.GetBankForm(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, resp)
}
