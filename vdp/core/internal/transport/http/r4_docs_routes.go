package httpapi

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/export"
	"github.com/viletech/vdp/core/internal/service"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

const maxUploadPDFBytes = 15 * 1024 * 1024 // TZ: invoice/contract PDF up to 15 MB

func (s *Server) registerDocsDomainRoutes() {
	// Counterparty (Nest: /counterparty/*)
	s.mux.HandleFunc("GET /api/v1/counterparty/list", s.withAuth(s.handleCPList))
	s.mux.HandleFunc("GET /api/v1/counterparty/{id}", s.withAuth(s.handleCPGet))
	s.mux.HandleFunc("POST /api/v1/counterparty/create", s.withAuth(s.handleCPCreate))
	s.mux.HandleFunc("POST /api/v1/counterparty/find-or-create", s.withAuth(s.handleCPFindOrCreate))
	s.mux.HandleFunc("PATCH /api/v1/counterparty/{id}", s.withAuth(s.handleCPUpdate))
	s.mux.HandleFunc("DELETE /api/v1/counterparty/{id}", s.withAuth(s.handleCPDelete))
	s.mux.HandleFunc("PATCH /api/v1/counterparty/{id}/bank/{bankUuid}/account", s.withAuth(s.handleCPAddAccount))
	s.mux.HandleFunc("PATCH /api/v1/counterparty/{id}/bank/{bankUuid}/account/{accountUuid}", s.withAuth(s.handleCPUpdateAccount))
	s.mux.HandleFunc("DELETE /api/v1/counterparty/{id}/bank/{bankUuid}/account/{accountUuid}", s.withAuth(s.handleCPRemoveAccount))
	s.mux.HandleFunc("POST /api/v1/counterparty/{id}/form-payment", s.withAuth(s.handleCPLinkForm))
	s.mux.HandleFunc("DELETE /api/v1/counterparty/{id}/form-payment/{formPaymentId}", s.withAuth(s.handleCPUnlinkForm))
	s.mux.HandleFunc("GET /api/v1/counterparty/{id}/requests", s.withAuth(s.handleCPRequests))
	s.mux.HandleFunc("GET /api/v1/counterparty/{id}/requests/xlsx", s.withAuth(s.handleCPRequestsXLSX))
	s.mux.HandleFunc("GET /api/v1/counterparty/{id}/approval-indicator", s.withAuth(s.handleCPApprovalIndicator))
	s.mux.HandleFunc("GET /api/v1/counterparty/{id}/can-skip-compliance", s.withAuth(s.handleCPCanSkip))

	// Comment site / manager / provider
	s.registerCommentRole("comment", domain.CommentKindExternal)
	s.registerCommentRole("manager/comment", domain.CommentKindInternal)
	s.registerCommentRole("provider/comment", domain.CommentKindInternal)

	// File store by role
	s.mux.HandleFunc("POST /api/v1/file-store/upload", s.withAuth(s.handleFileUpload))
	s.mux.HandleFunc("POST /api/v1/file-store/upload/pdf", s.withAuth(s.handleFileUpload))
	s.mux.HandleFunc("GET /api/v1/file-store/preview/private/{id}", s.withAuth(s.handleFilePreview))
	s.mux.HandleFunc("GET /api/v1/file-store/preview/private/contract/{contract}", s.withAuth(s.handleFilePreviewContract))
	s.mux.HandleFunc("GET /api/v1/file-store/preview/private/{form}/{filePath}", s.withAuth(s.handleFilePreviewPath))
	s.mux.HandleFunc("POST /api/v1/admin/file-store/upload", s.withAuth(s.handleFileUpload))
	s.mux.HandleFunc("POST /api/v1/admin/file-store/upload/pdf", s.withAuth(s.handleFileUpload))
	s.mux.HandleFunc("GET /api/v1/admin/file-store/preview/{id}", s.withAuth(s.handleFilePreview))
	s.mux.HandleFunc("POST /api/v1/admin/provider/file-store/upload", s.withAuth(s.handleFileUpload))
	s.mux.HandleFunc("POST /api/v1/admin/provider/file-store/upload/pdf", s.withAuth(s.handleFileUpload))
	s.mux.HandleFunc("GET /api/v1/admin/provider/file-store/preview/private/{form}/{filePath}", s.withAuth(s.handleFilePreviewPath))
	s.mux.HandleFunc("GET /api/v1/1c/file-store/preview/{id}", s.withAuth(s.handleFilePreview))

	// Attach uploaded file to form docs_json
	s.mux.HandleFunc("POST /api/v1/forms/{id}/docs/attach", s.withAuth(s.handleAttachDoc))
	s.mux.HandleFunc("PUT /api/v1/organizations/{id}/organization-card", s.withAuth(s.handleSetOrgCard))
	s.mux.HandleFunc("PUT /api/v1/counterparty/{id}/approval", s.withAuth(s.handleCPSetApproval))

	// Compliance history / clients
	s.mux.HandleFunc("GET /api/v1/admin/compliance-officer/clients", s.withAuth(s.handleCOClients))
	s.mux.HandleFunc("GET /api/v1/admin/compliance-officer/clients/xlsx", s.withAuth(s.handleCOClientsXLSX))
	s.mux.HandleFunc("GET /api/v1/admin/compliance-officer/clients/{id}", s.withAuth(s.handleCOClientGet))
	s.mux.HandleFunc("GET /api/v1/admin/compliance-officer/clients/{id}/requests", s.withAuth(s.handleCOClientRequests))
	s.mux.HandleFunc("GET /api/v1/admin/compliance-officer/clients/{id}/requests/xlsx", s.withAuth(s.handleCOClientRequestsXLSX))
	s.mux.HandleFunc("GET /api/v1/admin/compliance-officer/clients/{id}/organization-card", s.withAuth(s.handleCOOrgCard))
	s.mux.HandleFunc("GET /api/v1/admin/internal-compliance-officer/clients", s.withAuth(s.handleICOClients))
	s.mux.HandleFunc("GET /api/v1/admin/internal-compliance-officer/clients/xlsx", s.withAuth(s.handleICOClientsXLSX))
	s.mux.HandleFunc("GET /api/v1/admin/internal-compliance-officer/clients/{id}", s.withAuth(s.handleICOClientGet))
	s.mux.HandleFunc("GET /api/v1/admin/internal-compliance-officer/clients/{id}/requests", s.withAuth(s.handleICOClientRequests))
	s.mux.HandleFunc("GET /api/v1/admin/internal-compliance-officer/clients/{id}/requests/xlsx", s.withAuth(s.handleICOClientRequestsXLSX))
	s.mux.HandleFunc("GET /api/v1/admin/internal-compliance-officer/clients/{id}/organization-card", s.withAuth(s.handleICOOrgCard))
	s.mux.HandleFunc("GET /api/v1/compliance-history", s.withAuth(s.handleHistoryList))
	s.mux.HandleFunc("GET /api/v1/compliance-history/{formId}", s.withAuth(s.handleHistoryByForm))
}

func (s *Server) registerCommentRole(prefix string, defaultKind domain.CommentKind) {
	base := "/api/v1/" + prefix
	s.mux.HandleFunc("GET "+base, s.withAuth(s.makeCommentList(defaultKind)))
	s.mux.HandleFunc("GET "+base+"/unread", s.withAuth(s.makeCommentUnread(defaultKind)))
	s.mux.HandleFunc("GET "+base+"/entities-with-unread-comments", s.withAuth(s.makeCommentEntities(defaultKind)))
	s.mux.HandleFunc("POST "+base, s.withAuth(s.makeCommentCreate(defaultKind)))
	s.mux.HandleFunc("PATCH "+base+"/{id}", s.withAuth(s.handleCommentPatch))
	s.mux.HandleFunc("PUT "+base+"/mark-as-read", s.withAuth(s.makeCommentMarkRead(defaultKind)))
	if strings.Contains(prefix, "manager") || strings.Contains(prefix, "provider") {
		s.mux.HandleFunc("DELETE "+base+"/{id}", s.withAuth(s.handleCommentDelete))
	}
}

func (s *Server) handleCPList(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.catalog.ListCounterpartiesFor(r.Context(), principal)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items)})
}

func (s *Server) handleCPGet(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	c, err := s.catalog.GetCounterparty(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (s *Server) handleCPCreate(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Name    string          `json:"name"`
		Country string          `json:"country"`
		INN     string          `json:"inn"`
		Banks   json.RawMessage `json:"banks"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	banks := "[]"
	if len(body.Banks) > 0 {
		banks = string(body.Banks)
	}
	c, err := s.catalog.CreateCounterparty(r.Context(), principal, body.Name, body.Country, body.INN, banks)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

func (s *Server) handleCPFindOrCreate(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body map[string]any
	_ = json.NewDecoder(r.Body).Decode(&body)
	name, _ := body["name"].(string)
	inn, _ := body["inn"].(string)
	banksRaw, _ := json.Marshal(body["banks"])
	c, err := s.catalog.FindOrCreateCounterparty(r.Context(), principal, name, inn, string(banksRaw))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (s *Server) handleCPUpdate(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Name    string          `json:"name"`
		Country string          `json:"country"`
		INN     string          `json:"inn"`
		Banks   json.RawMessage `json:"banks"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	banks := ""
	if len(body.Banks) > 0 {
		banks = string(body.Banks)
	}
	c, err := s.catalog.UpdateCounterparty(r.Context(), principal, r.PathValue("id"), body.Name, body.Country, body.INN, banks)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (s *Server) handleCPDelete(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := s.catalog.DeleteCounterparty(r.Context(), principal, r.PathValue("id")); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleCPAddAccount(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body service.CounterpartyBankAccount
	_ = json.NewDecoder(r.Body).Decode(&body)
	c, err := s.catalog.AddBankAccount(r.Context(), principal, r.PathValue("id"), r.PathValue("bankUuid"), body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (s *Server) handleCPUpdateAccount(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body service.CounterpartyBankAccount
	_ = json.NewDecoder(r.Body).Decode(&body)
	c, err := s.catalog.UpdateBankAccount(r.Context(), principal, r.PathValue("id"), r.PathValue("bankUuid"), r.PathValue("accountUuid"), body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (s *Server) handleCPRemoveAccount(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	c, err := s.catalog.RemoveBankAccount(r.Context(), principal, r.PathValue("id"), r.PathValue("bankUuid"), r.PathValue("accountUuid"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (s *Server) handleCPLinkForm(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		FormPaymentID string `json:"formPaymentId"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	c, err := s.catalog.LinkFormPayment(r.Context(), principal, r.PathValue("id"), body.FormPaymentID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (s *Server) handleCPUnlinkForm(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	c, err := s.catalog.UnlinkFormPayment(r.Context(), principal, r.PathValue("id"), r.PathValue("formPaymentId"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (s *Server) handleCPRequests(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.catalog.CounterpartyRequests(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items)})
}

func (s *Server) handleCPRequestsXLSX(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	headers, rows, err := s.catalog.CounterpartyRequestsExportRows(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeXLSX(w, "counterparty-requests", headers, rows)
}

func (s *Server) handleCPApprovalIndicator(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	out, err := s.catalog.CounterpartyApprovalIndicator(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) handleCPCanSkip(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	canSkip, err := s.catalog.CounterpartyCanSkipCompliance(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"canSkip": canSkip})
}

func (s *Server) handleCPSetApproval(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Status  domain.CounterpartyApprovalStatus `json:"status"`
		Comment string                            `json:"comment"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	c, err := s.catalog.SetCounterpartyApproval(r.Context(), principal, r.PathValue("id"), body.Status, body.Comment)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (s *Server) makeCommentList(kind domain.CommentKind) func(http.ResponseWriter, *http.Request, authz.Principal) {
	return func(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
		items, err := s.catalog.ListCommentsFiltered(r.Context(), principal, r.URL.Query().Get("entity_type"), r.URL.Query().Get("entity_id"), []domain.CommentKind{kind})
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"items": items, "hasNext": false})
	}
}

func (s *Server) makeCommentUnread(kind domain.CommentKind) func(http.ResponseWriter, *http.Request, authz.Principal) {
	return func(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
		items, err := s.catalog.ListUnreadComments(r.Context(), principal, kind)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, items)
	}
}

func (s *Server) makeCommentEntities(kind domain.CommentKind) func(http.ResponseWriter, *http.Request, authz.Principal) {
	return func(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
		ids, err := s.catalog.EntitiesWithUnreadComments(r.Context(), principal, kind)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, ids)
	}
}

func (s *Server) makeCommentCreate(kind domain.CommentKind) func(http.ResponseWriter, *http.Request, authz.Principal) {
	return func(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
		var body struct {
			EntityType string   `json:"entity_type"`
			EntityID   string   `json:"entity_id"`
			Entity     string   `json:"entity"`
			Body       string   `json:"body"`
			Text       string   `json:"text"`
			FileIDs    []string `json:"file_ids"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		entityID := body.EntityID
		if entityID == "" {
			entityID = body.Entity
		}
		text := body.Body
		if text == "" {
			text = body.Text
		}
		c, err := s.catalog.CreateCommentTyped(r.Context(), principal, body.EntityType, entityID, text, kind, body.FileIDs)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, c)
	}
}

func (s *Server) makeCommentMarkRead(kind domain.CommentKind) func(http.ResponseWriter, *http.Request, authz.Principal) {
	return func(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
		var body struct {
			Entity string `json:"entity"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		if err := s.catalog.MarkCommentsRead(r.Context(), principal, body.Entity, kind); err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

func (s *Server) handleCommentPatch(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Body string `json:"body"`
		Text string `json:"text"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	text := body.Body
	if text == "" {
		text = body.Text
	}
	c, err := s.catalog.UpdateComment(r.Context(), principal, r.PathValue("id"), text)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (s *Server) handleCommentDelete(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := s.catalog.DeleteComment(r.Context(), principal, r.PathValue("id")); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleFileUpload(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	ct := r.Header.Get("Content-Type")
	if strings.HasPrefix(ct, "multipart/") {
		if err := r.ParseMultipartForm(32 << 20); err != nil {
			writeError(w, apperrors.ErrInvalidInput)
			return
		}
		file, header, err := r.FormFile("file")
		if err != nil {
			writeError(w, apperrors.ErrInvalidInput)
			return
		}
		defer file.Close()
		data, err := io.ReadAll(file)
		if err != nil {
			writeError(w, apperrors.ErrInvalidInput)
			return
		}
		mime := header.Header.Get("Content-Type")
		if strings.Contains(mime, "pdf") || strings.HasSuffix(strings.ToLower(header.Filename), ".pdf") {
			if len(data) > maxUploadPDFBytes {
				writeJSON(w, http.StatusRequestEntityTooLarge, map[string]string{
					"code":    string(apperrors.ErrCodeValidation),
					"message": "pdf file exceeds 15MB limit",
				})
				return
			}
		}
		meta, err := s.catalog.UploadFileBytes(r.Context(), principal, r.FormValue("form_id"), mime, data)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, meta)
		return
	}
	var body struct {
		FormID      string `json:"form_id"`
		StorageKey  string `json:"storage_key"`
		ContentType string `json:"content_type"`
		Content     string `json:"content"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	meta, err := s.catalog.UploadFileBytes(r.Context(), principal, body.FormID, body.ContentType, []byte(body.Content))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, meta)
}

func (s *Server) handleFilePreview(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	id := r.PathValue("id")
	_, ct, data, err := s.catalog.PreviewFile(r.Context(), principal, id)
	if err != nil {
		writeError(w, err)
		return
	}
	w.Header().Set("Content-Type", ct)
	_, _ = w.Write(data)
}

func (s *Server) handleFilePreviewContract(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	_, ct, data, err := s.catalog.PreviewFile(r.Context(), principal, r.PathValue("contract"))
	if err != nil {
		writeError(w, err)
		return
	}
	w.Header().Set("Content-Type", ct)
	_, _ = w.Write(data)
}

func (s *Server) handleFilePreviewPath(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	filePath := r.PathValue("filePath")
	_, ct, data, err := s.catalog.PreviewFile(r.Context(), principal, filePath)
	if err != nil {
		writeError(w, err)
		return
	}
	w.Header().Set("Content-Type", ct)
	_, _ = w.Write(data)
}

func (s *Server) handleAttachDoc(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		FileID string `json:"file_id"`
		Kind   string `json:"kind"`
		Label  string `json:"label"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	form, err := s.catalog.AttachFileToForm(r.Context(), principal, r.PathValue("id"), body.FileID, body.Kind, body.Label)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, form)
}

func (s *Server) handleCOClients(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := authz.RequireRoles(principal, domain.RoleComplianceOfficer, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}
	items, err := s.catalog.ListComplianceClients(r.Context(), principal)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items)})
}

func (s *Server) handleICOClients(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := authz.RequireRoles(principal, domain.RoleInternalComplianceOfficer, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}
	items, err := s.catalog.ListComplianceClients(r.Context(), principal)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items)})
}

func (s *Server) handleCOClientsXLSX(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := authz.RequireRoles(principal, domain.RoleComplianceOfficer, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}
	headers, rows, err := s.catalog.ComplianceClientsExportRows(r.Context(), principal)
	if err != nil {
		writeError(w, err)
		return
	}
	writeXLSX(w, "compliance-clients", headers, rows)
}

func (s *Server) handleICOClientsXLSX(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := authz.RequireRoles(principal, domain.RoleInternalComplianceOfficer, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}
	headers, rows, err := s.catalog.ComplianceClientsExportRows(r.Context(), principal)
	if err != nil {
		writeError(w, err)
		return
	}
	writeXLSX(w, "ico-clients", headers, rows)
}

func (s *Server) handleCOClientGet(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := authz.RequireRoles(principal, domain.RoleComplianceOfficer, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}
	s.writeClientDetails(w, r, principal)
}

func (s *Server) handleICOClientGet(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := authz.RequireRoles(principal, domain.RoleInternalComplianceOfficer, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}
	s.writeClientDetails(w, r, principal)
}

func (s *Server) writeClientDetails(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	details, err := s.catalog.ClientDetails(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, details)
}

func (s *Server) handleCOClientRequests(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := authz.RequireRoles(principal, domain.RoleComplianceOfficer, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}
	s.writeClientRequests(w, r, principal)
}

func (s *Server) handleICOClientRequests(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := authz.RequireRoles(principal, domain.RoleInternalComplianceOfficer, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}
	s.writeClientRequests(w, r, principal)
}

func (s *Server) writeClientRequests(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.catalog.ClientRequests(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items)})
}

func (s *Server) handleCOClientRequestsXLSX(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := authz.RequireRoles(principal, domain.RoleComplianceOfficer, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}
	headers, rows, err := s.catalog.ClientRequestsExportRows(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeXLSX(w, "client-requests", headers, rows)
}

func (s *Server) handleICOClientRequestsXLSX(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := authz.RequireRoles(principal, domain.RoleInternalComplianceOfficer, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}
	headers, rows, err := s.catalog.ClientRequestsExportRows(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeXLSX(w, "ico-client-requests", headers, rows)
}

func (s *Server) handleCOOrgCard(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := authz.RequireRoles(principal, domain.RoleComplianceOfficer, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}
	s.writeOrgCard(w, r, principal)
}

func (s *Server) handleICOOrgCard(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := authz.RequireRoles(principal, domain.RoleInternalComplianceOfficer, domain.RoleRoot); err != nil {
		writeError(w, err)
		return
	}
	s.writeOrgCard(w, r, principal)
}

func (s *Server) writeOrgCard(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	meta, ct, data, err := s.catalog.OrganizationCardFile(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	name := meta.ID
	if name == "" {
		name = "organization-card"
	}
	w.Header().Set("Content-Type", ct)
	w.Header().Set("Content-Disposition", `inline; filename="`+name+`"`)
	_, _ = w.Write(data)
}

func (s *Server) handleSetOrgCard(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		FileID string `json:"file_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	org, err := s.catalog.SetOrganizationCard(r.Context(), principal, r.PathValue("id"), body.FileID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, org)
}

func (s *Server) handleHistoryList(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.catalog.ListFormHistory(r.Context(), principal, "")
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleHistoryByForm(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.catalog.ListFormHistory(r.Context(), principal, r.PathValue("formId"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func writeXLSX(w http.ResponseWriter, sheet string, headers []string, rows [][]string) {
	data, err := export.MinimalXLSX(sheet, headers, rows)
	if err != nil {
		writeError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", `attachment; filename="`+sheet+`.xlsx"`)
	_, _ = w.Write(data)
}

