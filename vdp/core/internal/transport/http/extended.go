package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/service"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

func (s *Server) registerExtendedRoutes() {
	s.registerNestFormPaymentRoutes()
	s.registerAuthAccountOrgRoutes()
	s.registerDocsDomainRoutes()
	s.registerRateDocsRoutes()
	s.registerContractRoutes()
	s.registerMultiOrderRoutes()
	s.registerRefundRoutes()
	s.registerR9ExtendedRoutes()
	s.registerBankRoutes()
	s.registerNotificationRoutes()
	s.mux.HandleFunc("POST /api/v1/counterparties", s.withAuth(s.handleCreateCounterparty))
	s.mux.HandleFunc("GET /api/v1/counterparties", s.withAuth(s.handleListCounterparties))
	s.mux.HandleFunc("POST /api/v1/comments", s.withAuth(s.handleCreateComment))
	s.mux.HandleFunc("GET /api/v1/comments", s.withAuth(s.handleListComments))
	s.mux.HandleFunc("POST /api/v1/agents", s.withAuth(s.handleCreateAgent))
	s.mux.HandleFunc("GET /api/v1/agents", s.withAuth(s.handleListAgents))
	s.mux.HandleFunc("POST /api/v1/hs-codes", s.withAuth(s.handleCreateHs))
	s.mux.HandleFunc("GET /api/v1/hs-codes", s.withAuth(s.handleListHs))
	s.mux.HandleFunc("POST /api/v1/currencies", s.withAuth(s.handleCreateCurrency))
	s.mux.HandleFunc("GET /api/v1/currencies", s.withAuth(s.handleListCurrencies))
	s.mux.HandleFunc("PUT /api/v1/configuration/{key}", s.withAuth(s.handleSetConfig))
	s.mux.HandleFunc("GET /api/v1/configuration/{key}", s.withAuth(s.handleGetConfig))
	s.mux.HandleFunc("POST /api/v1/liquidity", s.withAuth(s.handleCreateLiquidity))
	s.mux.HandleFunc("GET /api/v1/liquidity", s.withAuth(s.handleListLiquidity))
	s.mux.HandleFunc("POST /api/v1/virtual-accounts", s.withAuth(s.handleCreateVA))
	s.mux.HandleFunc("GET /api/v1/virtual-accounts", s.withAuth(s.handleListVA))
	s.mux.HandleFunc("POST /api/v1/treasurer-tasks", s.withAuth(s.handleCreateTT))
	s.mux.HandleFunc("GET /api/v1/treasurer-tasks", s.withAuth(s.handleListTT))
	s.mux.HandleFunc("POST /api/v1/organizations/{id}/unblock-requests", s.withAuth(s.handleRequestUnblock))
	s.mux.HandleFunc("GET /api/v1/unblock-requests", s.withAuth(s.handleListUnblock))
	s.mux.HandleFunc("POST /api/v1/unblock-requests/{id}/resolve", s.withAuth(s.handleResolveUnblock))
	s.mux.HandleFunc("POST /api/v1/forms/{id}/confirmation", s.withAuth(s.handleConfirmation))
	s.mux.HandleFunc("PUT /api/v1/forms/{id}/important", s.withAuth(s.handleImportant))
	s.mux.HandleFunc("POST /api/v1/internal/hub/callback", s.withS2S(s.handleHubCallback))
	s.mux.HandleFunc("POST /api/v1/forms/import", s.withAuth(s.handleExcelImport))
	s.mux.HandleFunc("GET /api/v1/sse/forms/{id}", s.withAuth(s.handleSSE))
}

func (s *Server) handleUnApproveOrg(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	org, err := s.orgs.UnApprove(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, org)
}

func (s *Server) handleBlockOrg(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	org, err := s.orgs.Block(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, org)
}

func (s *Server) handleCreateCounterparty(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body domain.Counterparty
	_ = json.NewDecoder(r.Body).Decode(&body)
	c, err := s.catalog.SaveCounterparty(r.Context(), body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

func (s *Server) handleListCounterparties(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.catalog.ListCounterparties(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleCreateComment(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		EntityType string `json:"entity_type"`
		EntityID   string `json:"entity_id"`
		Body       string `json:"body"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	c, err := s.catalog.AddComment(r.Context(), principal, body.EntityType, body.EntityID, body.Body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

func (s *Server) handleListComments(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.catalog.ListComments(r.Context(), r.URL.Query().Get("entity_type"), r.URL.Query().Get("entity_id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleCreateAgent(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body domain.Agent
	_ = json.NewDecoder(r.Body).Decode(&body)
	a, err := s.catalog.CreateAgent(r.Context(), principal, body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, a)
}

func (s *Server) handleListAgents(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.catalog.ListAgents(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleCreateHs(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body domain.HsCode
	_ = json.NewDecoder(r.Body).Decode(&body)
	h, err := s.catalog.CreateHsCode(r.Context(), principal, body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, h)
}

func (s *Server) handleListHs(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.catalog.ListHsCodes(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleCreateCurrency(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body domain.Currency
	_ = json.NewDecoder(r.Body).Decode(&body)
	if err := s.catalog.SaveCurrency(r.Context(), body); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, body)
}

func (s *Server) handleListCurrencies(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.catalog.ListCurrencies(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleSetConfig(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Value string `json:"value"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if err := s.catalog.SetConfig(r.Context(), r.PathValue("key"), body.Value); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"key": r.PathValue("key"), "value": body.Value})
}

func (s *Server) handleGetConfig(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	v, err := s.catalog.GetConfig(r.Context(), r.PathValue("key"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"key": r.PathValue("key"), "value": v})
}

func (s *Server) handleCreateLiquidity(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body domain.LiquidityOffer
	_ = json.NewDecoder(r.Body).Decode(&body)
	o, err := s.catalog.CreateLiquidity(r.Context(), principal, body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, o)
}

func (s *Server) handleListLiquidity(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.catalog.ListLiquidity(r.Context(), r.URL.Query().Get("direction"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleCreateVA(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body domain.VirtualAccount
	_ = json.NewDecoder(r.Body).Decode(&body)
	a, err := s.catalog.CreateVirtualAccount(r.Context(), principal, body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, a)
}

func (s *Server) handleListVA(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.catalog.ListVirtualAccounts(r.Context(), principal.AccountID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleCreateTT(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body domain.TreasurerTask
	_ = json.NewDecoder(r.Body).Decode(&body)
	t, err := s.catalog.CreateTreasurerTaskFull(r.Context(), principal, body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, t)
}

func (s *Server) handleListTT(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.catalog.ListTreasurerTasks(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleRequestUnblock(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	req, err := s.catalog.RequestUnblock(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, req)
}

func (s *Server) handleListUnblock(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.catalog.ListUnblockRequests(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleResolveUnblock(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Approve bool `json:"approve"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	req, err := s.catalog.ResolveUnblock(r.Context(), principal, r.PathValue("id"), body.Approve)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, req)
}

func (s *Server) handleCalcCommission(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Percent string `json:"percent"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	form, result, err := s.forms.CalculateAndApplyCommission(r.Context(), principal, r.PathValue("id"), body.Percent)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"form": form, "commission": result})
}

func (s *Server) handleConfirmation(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Content string `json:"content"`
		FileID  string `json:"file_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	form, err := s.forms.SetConfirmation(r.Context(), principal, r.PathValue("id"), body.Content, body.FileID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, form)
}

func (s *Server) handleDocsGenerate(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Kind string `json:"kind"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if err := s.forms.RequestPaymentOrderGeneration(r.Context(), principal, r.PathValue("id"), body.Kind); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]string{"status": "queued"})
}

func (s *Server) handleImportant(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Important bool `json:"important"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	form, err := s.forms.SetImportant(r.Context(), principal, r.PathValue("id"), body.Important)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, form)
}

func (s *Server) handleHubCallback(w http.ResponseWriter, r *http.Request) {
	var body map[string]any
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, apperrors.ErrInvalidInput)
		return
	}
	formID, _ := body["form_payment_id"].(string)
	action, _ := body["action"].(string)
	if formID == "" {
		writeError(w, apperrors.ErrInvalidInput)
		return
	}
	// Sole integration write path: Transition / field patch via service (hub does not touch core DB).
	form, err := s.forms.ApplyHubCallback(r.Context(), formID, action, body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, form)
}

func (s *Server) handleExcelImport(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Rows []map[string]string `json:"rows"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	created := make([]any, 0, len(body.Rows))
	for _, row := range body.Rows {
		form, err := s.forms.Create(r.Context(), principal, service.CreateInput{
			InvoiceAmount: row["amount"],
			Currency:      row["currency"],
			NoDocuments:   row["no_documents"] == "true",
		})
		if err != nil {
			writeError(w, err)
			return
		}
		form, err = s.forms.Transition(r.Context(), principal, form.ID, parseAction("recognize_complete"))
		if err != nil {
			writeError(w, err)
			return
		}
		created = append(created, form)
	}
	writeJSON(w, http.StatusCreated, map[string]any{"forms": created})
}

func (s *Server) handleSSE(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	formID := r.PathValue("id")
	if _, err := s.forms.Get(r.Context(), principal, formID); err != nil {
		writeError(w, err)
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, apperrors.New(apperrors.ErrCodeInternal, "streaming unsupported"))
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	_, _ = w.Write([]byte("event: connected\ndata: {\"form_payment_id\":\"" + formID + "\"}\n\n"))
	flusher.Flush()
	if s.events == nil {
		return
	}
	ch := s.events.Subscribe(formID)
	defer s.events.Unsubscribe(formID, ch)
	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case ev, ok := <-ch:
			if !ok {
				return
			}
			raw, _ := json.Marshal(ev)
			_, _ = w.Write([]byte("event: " + ev.Type + "\ndata: " + string(raw) + "\n\n"))
			flusher.Flush()
		}
	}
}
