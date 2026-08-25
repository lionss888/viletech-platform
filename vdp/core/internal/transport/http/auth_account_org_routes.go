package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/service"
)

func (s *Server) registerAuthAccountOrgRoutes() {
	// Nest auth-site + aliases
	s.mux.HandleFunc("POST /api/v1/auth/registration", s.handleRegistration)
	s.mux.HandleFunc("POST /api/v1/auth/register", s.handleRegistration) // alias
	s.mux.HandleFunc("POST /api/v1/auth/registration/re-send", s.handleRegistrationResend)
	s.mux.HandleFunc("POST /api/v1/auth/registration/confirm", s.handleRegistrationConfirm)
	s.mux.HandleFunc("POST /api/v1/auth/restore", s.handleRestore)
	s.mux.HandleFunc("POST /api/v1/auth/confirm/restore", s.handleConfirmRestore)
	s.mux.HandleFunc("POST /api/v1/auth/logout", s.withAuth(s.handleLogout))
	s.mux.HandleFunc("POST /api/v1/auth/refresh-token", s.handleRefreshToken)
	s.mux.HandleFunc("POST /api/v1/auth/refresh", s.handleRefreshToken) // alias
	s.mux.HandleFunc("POST /api/v1/1c/auth/login", s.handleLogin)
	s.mux.HandleFunc("POST /api/v1/1c/auth/refresh-token", s.handleRefreshToken)

	// Account role controllers
	s.mux.HandleFunc("GET /api/v1/account", s.withAuth(s.handleAccountMe))
	s.mux.HandleFunc("GET /api/v1/account/full", s.withAuth(s.handleAccountFull))
	s.mux.HandleFunc("PATCH /api/v1/account", s.withAuth(s.handleAccountPatchSelf))
	s.mux.HandleFunc("PATCH /api/v1/manager/account", s.withAuth(s.handleAccountPatchSelf))
	s.mux.HandleFunc("PATCH /api/v1/provider/account", s.withAuth(s.handleAccountPatchSelf))
	s.mux.HandleFunc("PATCH /api/v1/compliance-officer/account", s.withAuth(s.handleAccountPatchSelf))
	s.mux.HandleFunc("GET /api/v1/provider/account/{id}", s.withAuth(s.handleAccountByID))
	s.mux.HandleFunc("GET /api/v1/compliance-officer/account/{id}", s.withAuth(s.handleAccountByID))
	s.mux.HandleFunc("GET /api/v1/treasurer/account/{id}", s.withAuth(s.handleAccountByID))
	s.mux.HandleFunc("GET /api/v1/admin/account", s.withAuth(s.handleAdminAccountList))
	s.mux.HandleFunc("GET /api/v1/admin/account/count", s.withAuth(s.handleAdminAccountCount))
	s.mux.HandleFunc("POST /api/v1/admin/account", s.withAuth(s.handleAdminAccountCreate))
	s.mux.HandleFunc("GET /api/v1/admin/account/{id}", s.withAuth(s.handleAccountByID))
	s.mux.HandleFunc("PATCH /api/v1/admin/account/{id}", s.withAuth(s.handleAdminAccountPatch))

	// Organization site
	s.mux.HandleFunc("GET /api/v1/organization", s.withAuth(s.handleOrgList))
	s.mux.HandleFunc("GET /api/v1/organization/count", s.withAuth(s.handleOrgCount))
	s.mux.HandleFunc("GET /api/v1/organization/invited", s.withAuth(s.handleOrgInvited))
	s.mux.HandleFunc("GET /api/v1/organization/fetch-by-inn", s.withAuth(s.handleOrgFetchINN))
	s.mux.HandleFunc("POST /api/v1/organization", s.withAuth(s.handleOrgCreate))
	s.mux.HandleFunc("GET /api/v1/organization/{id}", s.withAuth(s.handleOrgGet))
	s.mux.HandleFunc("PATCH /api/v1/organization/{id}", s.withAuth(s.handleOrgPatch))
	s.mux.HandleFunc("DELETE /api/v1/organization/{id}", s.withAuth(s.handleOrgDelete))
	s.mux.HandleFunc("PATCH /api/v1/organization/{id}/invite-subaccount", s.withAuth(s.handleOrgInvite))
	s.mux.HandleFunc("PATCH /api/v1/organization/{id}/delete-subaccount", s.withAuth(s.handleOrgDeleteSub))
	s.mux.HandleFunc("PATCH /api/v1/organization/{id}/accept-invite", s.withAuth(s.handleOrgAcceptInvite))
	s.mux.HandleFunc("PATCH /api/v1/organization/{id}/reject-invite", s.withAuth(s.handleOrgRejectInvite))
	s.mux.HandleFunc("PUT /api/v1/organization/{id}/delegate/{delegateTo}", s.withAuth(s.handleOrgDelegate))

	// Manager org
	s.mux.HandleFunc("GET /api/v1/admin/manager/organization", s.withAuth(s.handleOrgList))
	s.mux.HandleFunc("GET /api/v1/admin/manager/organization/count", s.withAuth(s.handleOrgCount))
	s.mux.HandleFunc("POST /api/v1/admin/manager/organization", s.withAuth(s.handleOrgCreate))
	s.mux.HandleFunc("GET /api/v1/admin/manager/organization/{id}", s.withAuth(s.handleOrgGet))
	s.mux.HandleFunc("PATCH /api/v1/admin/manager/organization/{id}", s.withAuth(s.handleOrgPatch))
	s.mux.HandleFunc("DELETE /api/v1/admin/manager/organization/{id}", s.withAuth(s.handleOrgDelete))

	// Provider org
	s.mux.HandleFunc("GET /api/v1/admin/provider/organization", s.withAuth(s.handleProviderOrgList))
	s.mux.HandleFunc("GET /api/v1/admin/provider/organization/count", s.withAuth(s.handleProviderOrgCount))
	s.mux.HandleFunc("POST /api/v1/admin/provider/organization", s.withAuth(s.handleProviderOrgCreate))
	s.mux.HandleFunc("GET /api/v1/admin/provider/organization/{id}", s.withAuth(s.handleOrgGet))
	s.mux.HandleFunc("PATCH /api/v1/admin/provider/organization/{id}", s.withAuth(s.handleOrgPatch))
	s.mux.HandleFunc("DELETE /api/v1/admin/provider/organization/{id}", s.withAuth(s.handleOrgDelete))

	// ICO org
	s.mux.HandleFunc("GET /api/v1/admin/internal-compliance-officer/organization", s.withAuth(s.handleOrgList))
	s.mux.HandleFunc("GET /api/v1/admin/internal-compliance-officer/organization/count", s.withAuth(s.handleOrgCount))
	s.mux.HandleFunc("GET /api/v1/admin/internal-compliance-officer/organization/{id}", s.withAuth(s.handleOrgGet))
	s.mux.HandleFunc("PUT /api/v1/admin/internal-compliance-officer/organization/{id}/approve", s.withAuth(s.handleApproveOrg))
	s.mux.HandleFunc("PUT /api/v1/admin/internal-compliance-officer/organization/{id}/un-approve", s.withAuth(s.handleUnApproveOrg))
	s.mux.HandleFunc("PUT /api/v1/admin/internal-compliance-officer/organization/{id}/block", s.withAuth(s.handleBlockOrg))

	// Plural aliases already used by vdp
	s.mux.HandleFunc("GET /api/v1/organizations", s.withAuth(s.handleOrgList))
	s.mux.HandleFunc("GET /api/v1/organizations/{id}", s.withAuth(s.handleOrgGet))
	s.mux.HandleFunc("PATCH /api/v1/organizations/{id}", s.withAuth(s.handleOrgPatch))
}

func (s *Server) handleRegistration(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		FullName string `json:"full_name"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	code, err := s.auth.Register(r.Context(), body.Email, body.Password, body.FullName)
	if err != nil {
		writeError(w, err)
		return
	}
	// Dev/test: return code (Nest emails it). Production mail wiring is hub/R9.
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "code": code})
}

func (s *Server) handleRegistrationResend(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	code, err := s.auth.ResendRegistration(r.Context(), body.Email)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "code": code})
}

func (s *Server) handleRegistrationConfirm(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
		Code  string `json:"code"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	session, err := s.auth.ConfirmRegistration(r.Context(), body.Email, body.Code)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, session)
}

func (s *Server) handleRestore(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	code, err := s.auth.Restore(r.Context(), body.Email)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "code": code})
}

func (s *Server) handleConfirmRestore(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email       string `json:"email"`
		Code        string `json:"code"`
		NewPassword string `json:"new_password"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	session, err := s.auth.ConfirmRestore(r.Context(), body.Email, body.Code, body.NewPassword)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, session)
}

func (s *Server) handleRefreshToken(w http.ResponseWriter, r *http.Request) {
	var body struct {
		RefreshToken string `json:"refresh_token"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	session, err := s.auth.Refresh(r.Context(), body.RefreshToken)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, session)
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := s.auth.Logout(r.Context(), principal); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleAccountMe(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	acc, err := s.accounts.Me(r.Context(), principal)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, acc.Public())
}

func (s *Server) handleAccountFull(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	acc, err := s.accounts.Me(r.Context(), principal)
	if err != nil {
		writeError(w, err)
		return
	}
	orgs, _ := s.orgs.List(r.Context(), principal)
	writeJSON(w, http.StatusOK, map[string]any{"account": acc.Public(), "organizations": orgs})
}

func (s *Server) handleAccountPatchSelf(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body service.AccountUpdate
	_ = json.NewDecoder(r.Body).Decode(&body)
	acc, err := s.accounts.UpdateSelf(r.Context(), principal, body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, acc.Public())
}

func (s *Server) handleAccountByID(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	acc, err := s.accounts.GetByID(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, acc.Public())
}

func (s *Server) handleAdminAccountList(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.accounts.List(r.Context(), principal)
	if err != nil {
		writeError(w, err)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, a := range items {
		out = append(out, a.Public())
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) handleAdminAccountCount(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	n, err := s.accounts.Count(r.Context(), principal)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]int{"count": n})
}

func (s *Server) handleAdminAccountCreate(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Email    string      `json:"email"`
		Password string      `json:"password"`
		Role     domain.Role `json:"role"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	acc, err := s.accounts.CreateAdmin(r.Context(), principal, body.Email, body.Password, body.Role)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, acc.Public())
}

func (s *Server) handleAdminAccountPatch(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body service.AccountUpdate
	_ = json.NewDecoder(r.Body).Decode(&body)
	acc, err := s.accounts.UpdateByAdmin(r.Context(), principal, r.PathValue("id"), body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, acc.Public())
}

func (s *Server) handleOrgList(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.orgs.List(r.Context(), principal)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleOrgCount(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	n, err := s.orgs.Count(r.Context(), principal)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]int{"count": n})
}

func (s *Server) handleOrgInvited(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.orgs.ListInvited(r.Context(), principal)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleOrgFetchINN(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	data, err := s.orgs.FetchByINN(r.Context(), principal, r.URL.Query().Get("inn"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, data)
}

func (s *Server) handleOrgCreate(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Name    string `json:"name"`
		INN     string `json:"inn"`
		Country string `json:"country"`
		Type    string `json:"type"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	org, err := s.orgs.Create(r.Context(), principal, body.Name, body.INN, body.Country, domain.OrganizationType(body.Type))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, org)
}

func (s *Server) handleOrgGet(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	org, err := s.orgs.Get(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"organization": org, "client_status": org.ClientStatus()})
}

func (s *Server) handleOrgPatch(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Name    string `json:"name"`
		INN     string `json:"inn"`
		Country string `json:"country"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	org, err := s.orgs.Update(r.Context(), principal, r.PathValue("id"), body.Name, body.INN, body.Country)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, org)
}

func (s *Server) handleOrgDelete(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := s.orgs.Delete(r.Context(), principal, r.PathValue("id")); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleOrgInvite(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		AccountID string `json:"account_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	org, err := s.orgs.InviteSubaccount(r.Context(), principal, r.PathValue("id"), body.AccountID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, org)
}

func (s *Server) handleOrgDeleteSub(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		AccountID string `json:"account_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	org, err := s.orgs.DeleteSubaccount(r.Context(), principal, r.PathValue("id"), body.AccountID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, org)
}

func (s *Server) handleOrgAcceptInvite(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	org, err := s.orgs.AcceptInvite(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
	_ = org
}

func (s *Server) handleOrgRejectInvite(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	_, err := s.orgs.RejectInvite(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleOrgDelegate(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	org, err := s.orgs.InviteSubaccount(r.Context(), principal, r.PathValue("id"), r.PathValue("delegateTo"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, org)
}

func (s *Server) handleProviderOrgList(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.orgs.List(r.Context(), principal)
	if err != nil {
		writeError(w, err)
		return
	}
	out := make([]domain.Organization, 0)
	for _, o := range items {
		if o.Type == domain.OrgTypeProvider {
			out = append(out, o)
		}
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) handleProviderOrgCount(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.orgs.List(r.Context(), principal)
	if err != nil {
		writeError(w, err)
		return
	}
	n := 0
	for _, o := range items {
		if o.Type == domain.OrgTypeProvider {
			n++
		}
	}
	writeJSON(w, http.StatusOK, map[string]int{"count": n})
}

func (s *Server) handleProviderOrgCreate(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Name    string `json:"name"`
		INN     string `json:"inn"`
		Country string `json:"country"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	org, err := s.orgs.Create(r.Context(), principal, body.Name, body.INN, body.Country, domain.OrgTypeProvider)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, org)
}
