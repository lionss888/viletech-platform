package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

// Nest singular aliases + R9 leftover treasurer/liquidity/VA/agent routes.
func (s *Server) registerR9ExtendedRoutes() {
	s.mux.HandleFunc("GET /api/v1/liquidity/suggested", s.withAuth(s.handleSuggestedLiquidity))
	s.mux.HandleFunc("POST /api/v1/liquidity/{id}/match", s.withAuth(s.handleMatchLiquidity))
	s.mux.HandleFunc("POST /api/v1/virtual-accounts/{id}/adjust", s.withAuth(s.handleAdjustVA))
	s.mux.HandleFunc("PATCH /api/v1/treasurer-tasks/{id}", s.withAuth(s.handlePatchTT))
	s.mux.HandleFunc("GET /api/v1/treasurer-tasks/{id}", s.withAuth(s.handleGetTT))
	s.mux.HandleFunc("GET /api/v1/agents/{id}", s.withAuth(s.handleGetAgent))
	s.mux.HandleFunc("PATCH /api/v1/agents/{id}", s.withAuth(s.handlePatchAgent))
	s.mux.HandleFunc("PATCH /api/v1/forms/{id}/hs-codes", s.withAuth(s.handleAttachFormHs))
	s.mux.HandleFunc("GET /api/v1/forms/{id}/hs-codes", s.withAuth(s.handleListFormHs))

	// Nest controller path aliases (singular)
	s.mux.HandleFunc("GET /api/v1/agent", s.withAuth(s.handleListAgents))
	s.mux.HandleFunc("POST /api/v1/agent", s.withAuth(s.handleCreateAgent))
	s.mux.HandleFunc("GET /api/v1/hs-code", s.withAuth(s.handleListHs))
	s.mux.HandleFunc("POST /api/v1/hs-code", s.withAuth(s.handleCreateHs))
	s.mux.HandleFunc("GET /api/v1/virtual-account", s.withAuth(s.handleListVA))
	s.mux.HandleFunc("POST /api/v1/virtual-account", s.withAuth(s.handleCreateVA))
	s.mux.HandleFunc("GET /api/v1/treasurer-task", s.withAuth(s.handleListTT))
	s.mux.HandleFunc("POST /api/v1/treasurer-task", s.withAuth(s.handleCreateTT))
	s.mux.HandleFunc("GET /api/v1/socket/events", s.withAuth(s.handleSocketEvents))
}

func (s *Server) handleSuggestedLiquidity(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	_ = principal
	items, err := s.catalog.SuggestedLiquidity(r.Context(), r.URL.Query().Get("direction"), r.URL.Query().Get("currency"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleMatchLiquidity(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		FormID string `json:"form_payment_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	o, err := s.catalog.MatchLiquidityToForm(r.Context(), principal, r.PathValue("id"), body.FormID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, o)
}

func (s *Server) handleAdjustVA(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Delta string `json:"delta"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	a, err := s.catalog.AdjustVirtualAccount(r.Context(), principal, r.PathValue("id"), body.Delta)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, a)
}

func (s *Server) handlePatchTT(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Status   string `json:"status"`
		Assignee string `json:"assignee_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	t, err := s.catalog.UpdateTreasurerTask(r.Context(), principal, r.PathValue("id"), body.Status, body.Assignee)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (s *Server) handleGetTT(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	_ = principal
	t, err := s.catalog.GetTreasurerTask(r.Context(), r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (s *Server) handleGetAgent(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	_ = principal
	a, err := s.catalog.GetAgent(r.Context(), r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, a)
}

func (s *Server) handlePatchAgent(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Name    string `json:"name"`
		INN     string `json:"inn"`
		Active  *bool  `json:"active"`
		StampID string `json:"stamp_file_id"`
		SignID  string `json:"signature_file_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	a, err := s.catalog.UpdateAgent(r.Context(), principal, r.PathValue("id"), domain.Agent{
		Name: body.Name, INN: body.INN, StampID: body.StampID, SignID: body.SignID,
	}, body.Active)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, a)
}

func (s *Server) handleAttachFormHs(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Codes []string `json:"codes"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	form, err := s.forms.AttachHsCodes(r.Context(), principal, r.PathValue("id"), body.Codes)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, form)
}

func (s *Server) handleListFormHs(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	codes, err := s.forms.ListFormHsCodes(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"hs_codes": codes})
}

func (s *Server) handleSocketEvents(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	id := r.URL.Query().Get("form_id")
	if id == "" {
		id = r.URL.Query().Get("formPaymentId")
	}
	if id == "" {
		writeError(w, apperrors.New(apperrors.ErrCodeValidation, "form_id required"))
		return
	}
	r.SetPathValue("id", id)
	s.handleSSE(w, r, principal)
}
