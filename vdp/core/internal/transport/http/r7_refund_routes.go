package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
)

func (s *Server) registerRefundRoutes() {
	s.mux.HandleFunc("GET /api/v1/forms/{id}/refund", s.withAuth(s.handleGetRefund))
	s.mux.HandleFunc("GET /api/v1/manager/form-payment/{id}/refund", s.withAuth(s.handleGetRefund))
	s.mux.HandleFunc("POST /api/v1/forms/{id}/refund/init", s.withAuth(s.handleInitRefund))
	s.mux.HandleFunc("POST /api/v1/manager/form-payment/{id}/refund/init", s.withAuth(s.handleInitRefund))
	s.mux.HandleFunc("POST /api/v1/forms/{id}/refund/file", s.withAuth(s.handleAttachRefundFile))
	s.mux.HandleFunc("POST /api/v1/manager/form-payment/{id}/refund/file", s.withAuth(s.handleAttachRefundFile))
	s.mux.HandleFunc("POST /api/v1/forms/{id}/refund/sent", s.withAuth(s.handleConfirmRefundSent))
	s.mux.HandleFunc("POST /api/v1/manager/form-payment/{id}/refund/sent", s.withAuth(s.handleConfirmRefundSent))
	// Nest-compatible PUT aliases already via nest map; explicit start/stop/cancel convenience:
	s.mux.HandleFunc("POST /api/v1/forms/{id}/refund/start", s.withAuth(s.handleRefundAction("start")))
	s.mux.HandleFunc("POST /api/v1/forms/{id}/refund/stop", s.withAuth(s.handleRefundAction("stop")))
	s.mux.HandleFunc("POST /api/v1/forms/{id}/refund/cancel", s.withAuth(s.handleRefundAction("cancel")))
}

func (s *Server) handleGetRefund(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	view, err := s.forms.GetRefundProcess(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (s *Server) handleInitRefund(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleTreasurer, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}
	var body struct {
		Amount   string `json:"amount"`
		Currency string `json:"currency"`
		Comment  string `json:"comment"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	form, err := s.forms.InitRefund(r.Context(), principal, r.PathValue("id"), body.Amount, body.Currency, body.Comment)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, form)
}

func (s *Server) handleAttachRefundFile(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		FileID string `json:"file_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	form, err := s.forms.AttachRefundFile(r.Context(), principal, r.PathValue("id"), body.FileID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, form)
}

func (s *Server) handleConfirmRefundSent(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleTreasurer, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}
	var body struct {
		Comment string `json:"comment"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	form, err := s.forms.ConfirmRefundSent(r.Context(), principal, r.PathValue("id"), body.Comment)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, form)
}

func (s *Server) handleRefundAction(suffix string) func(http.ResponseWriter, *http.Request, authz.Principal) {
	return func(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
		if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleTreasurer, domain.RoleRoot); err != nil {
			writeError(w, err)
			return
		}
		form, err := s.forms.TransitionByNestPath(r.Context(), principal, r.PathValue("id"), "manager", "refund/"+suffix)
		if err != nil {
			writeError(w, err)
			return
		}
		_ = formpayment.Status(form.Status)
		writeJSON(w, http.StatusOK, form)
	}
}
