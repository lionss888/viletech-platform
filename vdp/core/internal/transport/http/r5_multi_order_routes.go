package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
)

func (s *Server) registerMultiOrderRoutes() {
	s.mux.HandleFunc("GET /api/v1/forms/{id}/orders", s.withAuth(s.handleListOrders))
	s.mux.HandleFunc("GET /api/v1/forms/{id}/orders/active", s.withAuth(s.handleActiveOrder))
	s.mux.HandleFunc("POST /api/v1/forms/{id}/orders/{orderId}/files", s.withAuth(s.handleAttachOrderFile))
	s.mux.HandleFunc("GET /api/v1/provider/form-payment/{id}/active-order", s.withAuth(s.handleProviderActiveOrder))
	// Explicit shipment start from payment_sent / postpay branch (Nest manager shipment/* already via nest paths).
	s.mux.HandleFunc("POST /api/v1/manager/form-payment/{id}/shipment/waiting", s.withAuth(s.handleShipmentWaiting))
}

func (s *Server) handleListOrders(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.forms.ListOrders(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items)})
}

func (s *Server) handleActiveOrder(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	o, err := s.forms.GetActiveOrder(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, o)
}

func (s *Server) handleAttachOrderFile(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		FileID string `json:"file_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	o, err := s.forms.AttachOrderFile(r.Context(), principal, r.PathValue("id"), body.FileID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, o)
}

func (s *Server) handleProviderActiveOrder(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := authz.RequireRoles(principal, domain.RoleProvider, domain.RoleSeniorProvider); err != nil {
		writeError(w, err)
		return
	}
	view, err := s.forms.GetProviderView(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (s *Server) handleShipmentWaiting(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}
	form, err := s.forms.TransitionByNestPath(r.Context(), principal, r.PathValue("id"), "manager", "shipment/waiting")
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, form)
}
