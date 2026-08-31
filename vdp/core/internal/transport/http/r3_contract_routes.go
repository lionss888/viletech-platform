package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

func (s *Server) registerContractRoutes() {
	// Nest site: /contract
	s.mux.HandleFunc("GET /api/v1/contract", s.withAuth(s.handleContractListSite))
	s.mux.HandleFunc("GET /api/v1/contract/full/{organization}", s.withAuth(s.handleContractListByOrg))
	s.mux.HandleFunc("GET /api/v1/contract/count", s.withAuth(s.handleContractCountSite))
	s.mux.HandleFunc("GET /api/v1/contract/one", s.withAuth(s.handleContractOneSite))
	s.mux.HandleFunc("GET /api/v1/contract/one/template", s.withAuth(s.handleContractOneTemplate))
	s.mux.HandleFunc("GET /api/v1/contract/{id}", s.withAuth(s.handleContractGet))
	s.mux.HandleFunc("POST /api/v1/contract", s.withAuth(s.handleContractCreateSite))
	s.mux.HandleFunc("PUT /api/v1/contract/{id}", s.withAuth(s.handleContractUpdate))

	// Nest admin: /admin/contract
	s.mux.HandleFunc("GET /api/v1/admin/contract", s.withAuth(s.handleContractListAdmin))
	s.mux.HandleFunc("GET /api/v1/admin/contract/full", s.withAuth(s.handleContractListAdmin))
	s.mux.HandleFunc("GET /api/v1/admin/contract/count", s.withAuth(s.handleContractCountAdmin))
	s.mux.HandleFunc("POST /api/v1/admin/contract/template", s.withAuth(s.handleContractCreateTemplate))
	s.mux.HandleFunc("POST /api/v1/admin/contract", s.withAuth(s.handleContractCreateAdmin))
	s.mux.HandleFunc("GET /api/v1/admin/contract/{id}", s.withAuth(s.handleContractGet))
	s.mux.HandleFunc("PATCH /api/v1/admin/contract/{id}", s.withAuth(s.handleContractPatchAdmin))
	s.mux.HandleFunc("PUT /api/v1/admin/contract/{id}/accept", s.withAuth(s.handleContractAccept))
	s.mux.HandleFunc("PUT /api/v1/admin/contract/{id}/reject", s.withAuth(s.handleContractReject))
	s.mux.HandleFunc("PUT /api/v1/admin/contract/{id}/type", s.withAuth(s.handleContractChangeType))

	// Nest treasurer (read-only list)
	s.mux.HandleFunc("GET /api/v1/treasurer/contract", s.withAuth(s.handleContractListAdmin))
	s.mux.HandleFunc("GET /api/v1/treasurer/contract/full", s.withAuth(s.handleContractListAdmin))
	s.mux.HandleFunc("GET /api/v1/admin/treasurer/contract", s.withAuth(s.handleContractListAdmin))
	s.mux.HandleFunc("GET /api/v1/admin/treasurer/contract/full", s.withAuth(s.handleContractListAdmin))

	// Form: manual attach + on-behalf (Nest-aligned paths)
	s.mux.HandleFunc("POST /api/v1/manager/form-payment/{id}/contract/attach", s.withAuth(s.handleManualAttachContract))
	s.mux.HandleFunc("POST /api/v1/manager/form-payment/{id}/contract/manual-attach", s.withAuth(s.handleManualAttachContract))
	s.mux.HandleFunc("PUT /api/v1/forms/{id}/on-behalf", s.withAuth(s.handleSetOnBehalf))
	s.mux.HandleFunc("PATCH /api/v1/forms/{id}/on-behalf", s.withAuth(s.handleSetOnBehalf))
	s.mux.HandleFunc("GET /api/v1/forms/{id}/on-behalf/required", s.withAuth(s.handleOnBehalfRequired))
	s.mux.HandleFunc("GET /api/v1/organizations/{id}/contracts", s.withAuth(s.handleOrgContractsHistory))
	s.mux.HandleFunc("GET /api/v1/organization/{id}/contracts", s.withAuth(s.handleOrgContractsHistory))
	s.mux.HandleFunc("GET /api/v1/admin/organizations/{id}/contracts", s.withAuth(s.handleOrgContractsHistory))
	s.mux.HandleFunc("GET /api/v1/agents/{id}/contract-templates", s.withAuth(s.handleAgentTemplates))
	s.mux.HandleFunc("POST /api/v1/forms/{id}/contract/resolve", s.withAuth(s.handleResolveContractBranch))
	s.mux.HandleFunc("POST /api/v1/forms/{id}/contract/attach", s.withAuth(s.handleManualAttachContract))

	// Legacy aliases
	s.mux.HandleFunc("POST /api/v1/contracts", s.withAuth(s.handleContractCreateSite))
	s.mux.HandleFunc("GET /api/v1/contracts", s.withAuth(s.handleContractListSite))
}

func (s *Server) handleContractListSite(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	orgID := principal.OrganizationID
	if orgID == "" {
		orgID = r.URL.Query().Get("organization")
	}
	items, err := s.catalog.ListContractsForOrg(r.Context(), orgID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "hasNext": false})
}

func (s *Server) handleContractListByOrg(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	_ = principal
	items, err := s.catalog.ListContractsForOrg(r.Context(), r.PathValue("organization"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "hasNext": false})
}

func (s *Server) handleContractCountSite(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.catalog.ListContractsForOrg(r.Context(), principal.OrganizationID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"count": len(items)})
}

func (s *Server) handleContractOneSite(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.catalog.ListContractsForOrg(r.Context(), principal.OrganizationID)
	if err != nil {
		writeError(w, err)
		return
	}
	if len(items) == 0 {
		writeError(w, apperrors.ErrResourceNotFound)
		return
	}
	writeJSON(w, http.StatusOK, items[0])
}

func (s *Server) handleContractOneTemplate(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	_ = principal
	agentID := r.URL.Query().Get("agent")
	if agentID == "" {
		agentID = r.URL.Query().Get("agent_id")
	}
	items, err := s.catalog.TemplatesForAgent(r.Context(), agentID)
	if err != nil {
		writeError(w, err)
		return
	}
	if len(items) == 0 {
		writeError(w, apperrors.ErrResourceNotFound)
		return
	}
	writeJSON(w, http.StatusOK, items[0])
}

func (s *Server) handleContractGet(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	_ = principal
	c, err := s.catalog.GetContract(r.Context(), r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (s *Server) handleContractCreateSite(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body domain.Contract
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil && r.ContentLength > 0 {
		writeError(w, apperrors.New(apperrors.ErrCodeValidation, "invalid body"))
		return
	}
	if body.OrganizationID == "" {
		body.OrganizationID = principal.OrganizationID
	}
	c, err := s.catalog.CreateContractFull(r.Context(), principal, body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

func (s *Server) handleContractUpdate(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body domain.Contract
	_ = json.NewDecoder(r.Body).Decode(&body)
	c, err := s.catalog.UpdateContract(r.Context(), principal, r.PathValue("id"), body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (s *Server) handleContractListAdmin(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleRoot, domain.RoleTreasurer); err != nil {
		writeError(w, err)
		return
	}
	items, err := s.catalog.ListContracts(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	agentID := r.URL.Query().Get("agent")
	if agentID == "" {
		agentID = r.URL.Query().Get("agent_id")
	}
	if agentID != "" {
		filtered := make([]domain.Contract, 0)
		for _, c := range items {
			if c.AgentID == agentID {
				filtered = append(filtered, c)
			}
		}
		items = filtered
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "hasNext": false})
}

func (s *Server) handleContractCountAdmin(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}
	items, err := s.catalog.ListContracts(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"count": len(items)})
}

func (s *Server) handleContractCreateTemplate(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		AgentID string              `json:"agent"`
		Agent   string              `json:"agent_id"`
		Name    string              `json:"name"`
		FileID  string              `json:"file"`
		File    string              `json:"file_id"`
		Type    domain.ContractType `json:"type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, apperrors.New(apperrors.ErrCodeValidation, "invalid body"))
		return
	}
	agentID := body.AgentID
	if agentID == "" {
		agentID = body.Agent
	}
	fileID := body.FileID
	if fileID == "" {
		fileID = body.File
	}
	c, err := s.catalog.CreateContractTemplate(r.Context(), principal, agentID, body.Name, fileID, body.Type)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

func (s *Server) handleContractCreateAdmin(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body domain.Contract
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, apperrors.New(apperrors.ErrCodeValidation, "invalid body"))
		return
	}
	c, err := s.catalog.CreateContractFull(r.Context(), principal, body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

func (s *Server) handleContractPatchAdmin(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body domain.Contract
	_ = json.NewDecoder(r.Body).Decode(&body)
	c, err := s.catalog.UpdateContract(r.Context(), principal, r.PathValue("id"), body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (s *Server) handleContractAccept(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	c, err := s.catalog.AcceptContract(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (s *Server) handleContractReject(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Text string `json:"text"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	c, err := s.catalog.RejectContract(r.Context(), principal, r.PathValue("id"), body.Text)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (s *Server) handleContractChangeType(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Type domain.ContractType `json:"type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, apperrors.New(apperrors.ErrCodeValidation, "invalid body"))
		return
	}
	c, err := s.catalog.ChangeContractType(r.Context(), principal, r.PathValue("id"), body.Type)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (s *Server) handleManualAttachContract(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Type       domain.ContractType `json:"type"`
		FileID     string              `json:"file_id"`
		Number     string              `json:"number"`
		AccountRef string              `json:"account_ref"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, apperrors.New(apperrors.ErrCodeValidation, "invalid body"))
		return
	}
	form, c, err := s.forms.ManualAttachContract(r.Context(), principal, r.PathValue("id"), body.Type, body.FileID, body.Number, body.AccountRef)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"form": form, "contract": c})
}

func (s *Server) handleSetOnBehalf(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		OnBehalfOrganizationID string `json:"on_behalf_organization_id"`
		ContractType           string `json:"contract_type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, apperrors.New(apperrors.ErrCodeValidation, "invalid body"))
		return
	}
	form, err := s.forms.SetOnBehalfOrganization(r.Context(), principal, r.PathValue("id"), body.OnBehalfOrganizationID, body.ContractType)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, form)
}

func (s *Server) handleOnBehalfRequired(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	_ = principal
	required, err := s.forms.RequiresOnBehalf(r.Context(), r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"required": required})
}

func (s *Server) handleOrgContractsHistory(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := authz.RequireRoles(principal, domain.RoleManager, domain.RoleRoot, domain.RoleInternalComplianceOfficer, domain.RoleUser); err != nil {
		writeError(w, err)
		return
	}
	items, err := s.catalog.ListContractsForOrg(r.Context(), r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleAgentTemplates(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	_ = principal
	items, err := s.catalog.TemplatesForAgent(r.Context(), r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleResolveContractBranch(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	form, err := s.forms.ResolveContractBranch(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, form)
}
