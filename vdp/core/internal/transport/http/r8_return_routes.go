package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
)

// registerReturnRoutes registers HTTP routes for return-after-execution (новый контур).
func (s *Server) registerReturnRoutes() {
	// Get return episode (all roles)
	s.mux.HandleFunc("GET /api/v1/forms/{id}/return/episode", s.withAuth(s.handleGetReturnEpisode))

	// Provider reports return (stage 1)
	s.mux.HandleFunc("POST /api/v1/forms/{id}/return/report", s.withAuth(s.handleProvReturnReport))

	// Manager clarification (stage 2)
	s.mux.HandleFunc("POST /api/v1/forms/{id}/return/clarify", s.withAuth(s.handleMgrReturnClarify))

	// Client clarification reply (stage 2)
	s.mux.HandleFunc("POST /api/v1/forms/{id}/return/clarify-reply", s.withAuth(s.handleClientReturnClarifyReply))

	// Return to client flow (stage 3)
	s.mux.HandleFunc("POST /api/v1/forms/{id}/return/to-client/rate", s.withAuth(s.handleMgrReturnToClientRate))
	s.mux.HandleFunc("POST /api/v1/forms/{id}/return/to-client/consent", s.withAuth(s.handleClientReturnConsent))
	s.mux.HandleFunc("POST /api/v1/forms/{id}/return/to-client/refuse", s.withAuth(s.handleClientReturnRefuse))
	s.mux.HandleFunc("POST /api/v1/forms/{id}/return/to-client/execute", s.withAuth(s.handleMgrReturnToClientExecute))

	// Repeat payment flow (stage 4)
	s.mux.HandleFunc("POST /api/v1/forms/{id}/return/repeat", s.withAuth(s.handleMgrReturnRepeat))
	s.mux.HandleFunc("POST /api/v1/forms/{id}/return/repeat/execute", s.withAuth(s.handleProvReturnRepeatExecute))
}

// handleProvReturnReport allows provider to report return after payment execution (stage 1).
func (s *Server) handleProvReturnReport(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	// AuthZ: only provider
	if err := authz.AuthorizeRoles(principal, domain.RoleProvider, domain.RoleSeniorProvider, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}

	var body struct {
		Amount   string `json:"amount"`
		Currency string `json:"currency"`
		Reason   string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, err)
		return
	}

	form, err := s.forms.ProvReturnReport(r.Context(), principal, r.PathValue("id"), body.Amount, body.Currency, body.Reason)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, form)
}

// handleMgrReturnClarify allows manager to ask client for clarification (stage 2).
func (s *Server) handleMgrReturnClarify(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	// AuthZ: only manager
	if err := authz.AuthorizeRoles(principal, domain.RoleManager, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}

	var body struct {
		Question string `json:"question"`
		FileID   string `json:"file_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, err)
		return
	}

	form, err := s.forms.MgrReturnClarify(r.Context(), principal, r.PathValue("id"), body.Question, body.FileID)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, form)
}

// handleClientReturnClarifyReply allows client to reply to manager's question (stage 2).
func (s *Server) handleClientReturnClarifyReply(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	// AuthZ: only client (user)
	if err := authz.AuthorizeRoles(principal, domain.RoleUser, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}

	var body struct {
		Answer string `json:"answer"`
		FileID string `json:"file_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, err)
		return
	}

	form, err := s.forms.ClientReturnClarifyReply(r.Context(), principal, r.PathValue("id"), body.Answer, body.FileID)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, form)
}

// handleMgrReturnToClientRate allows manager to set exchange rate (stage 3).
func (s *Server) handleMgrReturnToClientRate(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	// AuthZ: only manager
	if err := authz.AuthorizeRoles(principal, domain.RoleManager, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}

	var body struct {
		Rate string `json:"rate"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, err)
		return
	}

	form, err := s.forms.MgrReturnToClientRate(r.Context(), principal, r.PathValue("id"), body.Rate)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, form)
}

// handleClientReturnConsent allows client to give consent with letter (stage 3).
func (s *Server) handleClientReturnConsent(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	// AuthZ: only client (user)
	if err := authz.AuthorizeRoles(principal, domain.RoleUser, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}

	var body struct {
		ConsentFileID string `json:"consent_file_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, err)
		return
	}

	form, err := s.forms.ClientReturnConsent(r.Context(), principal, r.PathValue("id"), body.ConsentFileID)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, form)
}

// handleClientReturnRefuse allows client to refuse rate with reason (stage 3).
func (s *Server) handleClientReturnRefuse(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	// AuthZ: only client (user)
	if err := authz.AuthorizeRoles(principal, domain.RoleUser, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}

	var body struct {
		Reason string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, err)
		return
	}

	form, err := s.forms.ClientReturnRefuse(r.Context(), principal, r.PathValue("id"), body.Reason)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, form)
}

// handleMgrReturnToClientExecute allows manager to execute RUB payment (stage 3).
func (s *Server) handleMgrReturnToClientExecute(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	// AuthZ: only manager
	if err := authz.AuthorizeRoles(principal, domain.RoleManager, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}

	var body struct {
		RubPaymentFileID string `json:"rub_payment_file_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, err)
		return
	}

	form, err := s.forms.MgrReturnToClientExecute(r.Context(), principal, r.PathValue("id"), body.RubPaymentFileID)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, form)
}

// handleMgrReturnRepeat allows manager to initiate repeat payment (stage 4).
func (s *Server) handleMgrReturnRepeat(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	// AuthZ: only manager
	if err := authz.AuthorizeRoles(principal, domain.RoleManager, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}

	var body struct {
		Comment          string  `json:"comment"`
		NewProviderOrgID *string `json:"new_provider_org_id,omitempty"`
		NewAccountID     *string `json:"new_account_id,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, err)
		return
	}

	// Convert optional pointers to strings
	newProviderOrgID := ""
	if body.NewProviderOrgID != nil {
		newProviderOrgID = *body.NewProviderOrgID
	}
	newAccountID := ""
	if body.NewAccountID != nil {
		newAccountID = *body.NewAccountID
	}

	form, err := s.forms.MgrReturnRepeat(r.Context(), principal, r.PathValue("id"), body.Comment, newProviderOrgID, newAccountID)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, form)
}

// handleProvReturnRepeatExecute allows provider to execute repeat payment (stage 4).
func (s *Server) handleProvReturnRepeatExecute(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	// AuthZ: only assigned provider
	if err := authz.AuthorizeRoles(principal, domain.RoleProvider, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}

	var body struct {
		PaymentFileID string `json:"payment_file_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, err)
		return
	}

	form, err := s.forms.ProvReturnRepeatExecute(r.Context(), principal, r.PathValue("id"), body.PaymentFileID)
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, form)
}

// handleGetReturnEpisode returns the return episode for a form.
func (s *Server) handleGetReturnEpisode(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	form, err := s.forms.Get(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}

	episode := form.ReturnEpisode.VisibleTo(principal.Role)
	if !episode.Active {
		writeJSON(w, http.StatusOK, map[string]interface{}{"active": false})
		return
	}

	writeJSON(w, http.StatusOK, episode)
}
