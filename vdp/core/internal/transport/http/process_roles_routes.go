package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/service"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

func (s *Server) registerProcessRoleRoutes() {
	s.mux.HandleFunc("GET /api/v1/process-roles", s.withAuth(s.handleProcessRolesGet))
	s.mux.HandleFunc("PUT /api/v1/admin/process-roles/priorities", s.withAuth(s.handleProcessRolesPriorities))
	s.mux.HandleFunc("PUT /api/v1/admin/process-roles/{role}", s.withAuth(s.handleProcessRolePut))
	s.mux.HandleFunc("PUT /api/v1/admin/system-roles/{role}", s.withAuth(s.handleSystemRolePut))
}

func (s *Server) handleProcessRolesGet(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if s.processRoles == nil {
		writeError(w, apperrors.New(apperrors.ErrCodeInternal, "process roles unavailable"))
		return
	}
	view, err := s.processRoles.GetConfig(r.Context(), principal)
	if err != nil {
		writeError(w, err)
		return
	}
	roles := make([]map[string]any, 0, len(view.Snapshot.Roles))
	for _, cfg := range view.Snapshot.SortedByPriority() {
		roles = append(roles, map[string]any{
			"role":         cfg.Role,
			"enabled":      cfg.Enabled,
			"priority":     cfg.Priority,
			"influence":    cfg.Influence,
			"capabilities": cfg.Capabilities,
			"removable":    cfg.Removable(),
			"mandatory":    cfg.Mandatory,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"version":              view.Snapshot.Version,
		"updated_at":           view.Snapshot.UpdatedAt,
		"updated_by":           view.Snapshot.UpdatedBy,
		"roles":                roles,
		"capabilities":         view.Capabilities,
		"capabilities_catalog": formpayment.CapabilitiesCatalog(),
		"system_capabilities":  view.SystemCapabilities,
		"admin_system_by_role": view.AdminSystemByRole,
		"mandatory_roles":      view.Mandatory,
		"note":                 "Role priority order does not change fixed application methodology stages; admin is outside the business process",
	})
}

func (s *Server) handleProcessRolePut(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if s.processRoles == nil {
		writeError(w, apperrors.New(apperrors.ErrCodeInternal, "process roles unavailable"))
		return
	}
	role, ok := domain.ParseRole(r.PathValue("role"))
	if !ok {
		writeError(w, apperrors.New(apperrors.ErrCodeValidation, "unknown role"))
		return
	}
	var body service.RoleConfigUpdate
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, apperrors.ErrInvalidInput)
		return
	}
	snap, err := s.processRoles.UpdateRole(r.Context(), principal, role, body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"version": snap.Version, "roles": snap.SortedByPriority()})
}

func (s *Server) handleProcessRolesPriorities(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if s.processRoles == nil {
		writeError(w, apperrors.New(apperrors.ErrCodeInternal, "process roles unavailable"))
		return
	}
	var body struct {
		Order []string `json:"order"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, apperrors.ErrInvalidInput)
		return
	}
	ordered := make([]domain.Role, 0, len(body.Order))
	for _, raw := range body.Order {
		role, ok := domain.ParseRole(raw)
		if !ok {
			writeError(w, apperrors.New(apperrors.ErrCodeValidation, "unknown role: "+raw))
			return
		}
		ordered = append(ordered, role)
	}
	snap, err := s.processRoles.UpdatePriorities(r.Context(), principal, ordered)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"version": snap.Version, "roles": snap.SortedByPriority()})
}

func (s *Server) handleSystemRolePut(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if s.processRoles == nil {
		writeError(w, apperrors.New(apperrors.ErrCodeInternal, "process roles unavailable"))
		return
	}
	role, ok := domain.ParseRole(r.PathValue("role"))
	if !ok {
		writeError(w, apperrors.New(apperrors.ErrCodeValidation, "unknown role"))
		return
	}
	var body service.SystemRoleUpdate
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, apperrors.ErrInvalidInput)
		return
	}
	if err := s.processRoles.UpdateSystemRole(r.Context(), principal, role, body); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
