package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/formpayment"
	"github.com/viletech/vdp/core/internal/export"
	"github.com/viletech/vdp/core/internal/service"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

var nestFormRoles = []string{"site", "manager", "provider", "eco", "ico", "treasurer", "admin", "1c"}

func (s *Server) registerNestFormPaymentRoutes() {
	for _, role := range nestFormRoles {
		role := role
		base := "/api/v1/" + role + "/form-payment"
		s.mux.HandleFunc("GET "+base, s.withAuth(func(w http.ResponseWriter, r *http.Request, p authz.Principal) {
			s.handleNestFormCollection(w, r, p, role)
		}))
		s.mux.HandleFunc("POST "+base, s.withAuth(func(w http.ResponseWriter, r *http.Request, p authz.Principal) {
			s.handleNestFormCollection(w, r, p, role)
		}))
		s.mux.HandleFunc("GET "+base+"/count", s.withAuth(func(w http.ResponseWriter, r *http.Request, p authz.Principal) {
			if !nestRoleAllowed(p, role) {
				writeError(w, apperrors.New(apperrors.ErrCodeForbidden, "role mismatch"))
				return
			}
			writeJSON(w, http.StatusOK, map[string]int{"count": s.forms.Count(r.Context(), p)})
		}))
		s.mux.HandleFunc("GET "+base+"/xlsx", s.withAuth(func(w http.ResponseWriter, r *http.Request, p authz.Principal) {
			s.handleNestFormSpecialGET(w, r, p, role, "xlsx")
		}))
		s.mux.HandleFunc("GET "+base+"/by-order-accepted", s.withAuth(func(w http.ResponseWriter, r *http.Request, p authz.Principal) {
			s.handleNestFormSpecialGET(w, r, p, role, "by-order-accepted")
		}))
		s.mux.HandleFunc("GET "+base+"/by-order-accepted/count", s.withAuth(func(w http.ResponseWriter, r *http.Request, p authz.Principal) {
			if !nestRoleAllowed(p, role) {
				writeError(w, apperrors.New(apperrors.ErrCodeForbidden, "role mismatch"))
				return
			}
			n := 0
			for _, f := range s.forms.List(r.Context(), p) {
				if f.Status == formpayment.StatusSigningOrderAccepted {
					n++
				}
			}
			writeJSON(w, http.StatusOK, map[string]int{"count": n})
		}))
		s.mux.HandleFunc("GET "+base+"/export/payment-received", s.withAuth(func(w http.ResponseWriter, r *http.Request, p authz.Principal) {
			s.handleNestFormSpecialGET(w, r, p, role, "export/payment-received")
		}))
		s.mux.HandleFunc("POST "+base+"/import", s.withAuth(func(w http.ResponseWriter, r *http.Request, p authz.Principal) {
			if !nestRoleAllowed(p, role) {
				writeError(w, apperrors.New(apperrors.ErrCodeForbidden, "role mismatch"))
				return
			}
			s.handleNestImport(w, r, p)
		}))
		s.mux.HandleFunc("GET "+base+"/{id}", s.withAuth(func(w http.ResponseWriter, r *http.Request, p authz.Principal) {
			s.handleNestFormByID(w, r, p, role)
		}))
		s.mux.HandleFunc("PATCH "+base+"/{id}", s.withAuth(func(w http.ResponseWriter, r *http.Request, p authz.Principal) {
			s.handleNestFormByID(w, r, p, role)
		}))
		s.mux.HandleFunc("PUT "+base+"/{id}/{path...}", s.withAuth(func(w http.ResponseWriter, r *http.Request, p authz.Principal) {
			s.handleNestFormPath(w, r, p, role)
		}))
		s.mux.HandleFunc("PATCH "+base+"/{id}/{path...}", s.withAuth(func(w http.ResponseWriter, r *http.Request, p authz.Principal) {
			s.handleNestFormPath(w, r, p, role)
		}))
		s.mux.HandleFunc("POST "+base+"/{id}/{path...}", s.withAuth(func(w http.ResponseWriter, r *http.Request, p authz.Principal) {
			s.handleNestFormPath(w, r, p, role)
		}))
		s.mux.HandleFunc("DELETE "+base+"/{id}/{path...}", s.withAuth(func(w http.ResponseWriter, r *http.Request, p authz.Principal) {
			s.handleNestFormPath(w, r, p, role)
		}))
		s.mux.HandleFunc("GET "+base+"/{id}/{path...}", s.withAuth(func(w http.ResponseWriter, r *http.Request, p authz.Principal) {
			s.handleNestFormPath(w, r, p, role)
		}))
	}
}

func nestRoleAllowed(principal authz.Principal, nestRole string) bool {
	if principal.Role == domain.RoleRoot {
		return true
	}
	switch nestRole {
	case "site":
		return principal.Role == domain.RoleUser
	case "manager":
		return principal.Role == domain.RoleManager || principal.Role == domain.RoleTreasurer
	case "provider":
		return principal.Role == domain.RoleProvider || principal.Role == domain.RoleSeniorProvider
	case "eco":
		return principal.Role == domain.RoleComplianceOfficer
	case "ico":
		return principal.Role == domain.RoleInternalComplianceOfficer
	case "treasurer":
		return principal.Role == domain.RoleTreasurer
	case "admin":
		return principal.Role == domain.RoleRoot
	case "1c":
		return principal.Role == domain.RoleOneC
	default:
		return false
	}
}

func (s *Server) handleNestFormCollection(w http.ResponseWriter, r *http.Request, principal authz.Principal, nestRole string) {
	if !nestRoleAllowed(principal, nestRole) {
		writeError(w, apperrors.New(apperrors.ErrCodeForbidden, "role mismatch for nest form-payment"))
		return
	}
	switch r.Method {
	case http.MethodGet:
		q := r.URL.Query().Get("view")
		if strings.HasSuffix(r.URL.Path, "/count") || q == "count" {
			writeJSON(w, http.StatusOK, map[string]int{"count": s.forms.Count(r.Context(), principal)})
			return
		}
		writeJSON(w, http.StatusOK, s.forms.List(r.Context(), principal))
	case http.MethodPost:
		if nestRole != "site" && nestRole != "admin" {
			writeError(w, apperrors.New(apperrors.ErrCodeForbidden, "create allowed for site"))
			return
		}
		s.handleCreateForm(w, r, principal)
	default:
		writeError(w, apperrors.New(apperrors.ErrCodeValidation, "method not allowed"))
	}
}

func (s *Server) handleNestFormByID(w http.ResponseWriter, r *http.Request, principal authz.Principal, nestRole string) {
	if !nestRoleAllowed(principal, nestRole) {
		writeError(w, apperrors.New(apperrors.ErrCodeForbidden, "role mismatch for nest form-payment"))
		return
	}
	id := r.PathValue("id")
	switch id {
	case "count":
		writeJSON(w, http.StatusOK, map[string]int{"count": s.forms.Count(r.Context(), principal)})
		return
	case "xlsx", "export", "by-order-accepted":
		s.handleNestFormSpecialGET(w, r, principal, nestRole, id)
		return
	case "import":
		if r.Method == http.MethodPost {
			s.handleNestImport(w, r, principal)
			return
		}
	}
	switch r.Method {
	case http.MethodGet:
		if nestRole == "provider" {
			view, err := s.forms.GetProviderView(r.Context(), principal, id)
			if err != nil {
				writeError(w, err)
				return
			}
			writeJSON(w, http.StatusOK, view)
			return
		}
		s.handleGetForm(w, r, principal)
	case http.MethodPatch:
		s.handleNestPatch(w, r, principal, id, "")
	default:
		writeError(w, apperrors.New(apperrors.ErrCodeValidation, "method not allowed"))
	}
}

func (s *Server) handleNestFormPath(w http.ResponseWriter, r *http.Request, principal authz.Principal, nestRole string) {
	if !nestRoleAllowed(principal, nestRole) {
		writeError(w, apperrors.New(apperrors.ErrCodeForbidden, "role mismatch for nest form-payment"))
		return
	}
	id := r.PathValue("id")
	path := strings.Trim(r.PathValue("path"), "/")
	if id == "count" || id == "xlsx" || id == "by-order-accepted" || strings.HasPrefix(id, "export") {
		s.handleNestFormSpecialGET(w, r, principal, nestRole, id)
		return
	}
	if id == "import" && r.Method == http.MethodPost {
		s.handleNestImport(w, r, principal)
		return
	}
	switch r.Method {
	case http.MethodGet:
		s.handleNestFormGETPath(w, r, principal, id, path)
	case http.MethodPut:
		s.handleNestFormPUT(w, r, principal, nestRole, id, path)
	case http.MethodPatch:
		s.handleNestPatch(w, r, principal, id, path)
	case http.MethodPost:
		s.handleNestFormPOST(w, r, principal, nestRole, id, path)
	case http.MethodDelete:
		s.handleNestFormDELETE(w, r, principal, id, path)
	default:
		writeError(w, apperrors.New(apperrors.ErrCodeValidation, "method not allowed"))
	}
}

func (s *Server) handleNestFormPUT(w http.ResponseWriter, r *http.Request, principal authz.Principal, nestRole, id, path string) {
	if path == "confirm-payment" || strings.HasSuffix(path, "confirm-payment") {
		form, err := s.forms.TransitionByNestPath(r.Context(), principal, id, nestRole, "confirm-payment")
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, form)
		return
	}
	if _, ok := formpayment.NestPathAction(nestRole, path); ok {
		form, err := s.forms.TransitionByNestPath(r.Context(), principal, id, nestRole, path)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, form)
		return
	}
	if _, ok := formpayment.NestMetaPath(nestRole, path); ok {
		form, err := s.forms.ApplyNestMeta(r.Context(), principal, id, nestRole, path)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, form)
		return
	}
	writeError(w, apperrors.New(apperrors.ErrCodeValidation, "unknown nest path: "+path))
}

func (s *Server) handleNestFormPOST(w http.ResponseWriter, r *http.Request, principal authz.Principal, nestRole, id, path string) {
	switch {
	case path == "contract/attach":
		if nestRole != "manager" && nestRole != "admin" {
			writeError(w, apperrors.New(apperrors.ErrCodeForbidden, "manager only"))
			return
		}
		var body struct {
			Type       domain.ContractType `json:"type"`
			FileID     string              `json:"file_id"`
			Number     string              `json:"number"`
			AccountRef string              `json:"account_ref"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		form, c, err := s.forms.ManualAttachContract(r.Context(), principal, id, body.Type, body.FileID, body.Number, body.AccountRef)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"form": form, "contract": c})
	case path == "copy":
		form, err := s.forms.CopyForm(r.Context(), principal, id)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, form)
	case path == "invoices":
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		form, err := s.forms.UpsertInvoice(r.Context(), principal, id, "", body)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, form)
	case path == "analyze-counterparty":
		form, err := s.forms.ApplyNestMeta(r.Context(), principal, id, nestRole, path)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, form)
	case strings.Contains(path, "sign-via-diadoc"):
		form, err := s.forms.ApplyNestMeta(r.Context(), principal, id, nestRole, path)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, form)
	case path == "generate-agent-report" || path == "treasurer-order/upload":
		if path == "generate-agent-report" {
			form, err := s.forms.ApplyNestMeta(r.Context(), principal, id, nestRole, path)
			if err != nil {
				writeError(w, err)
				return
			}
			writeJSON(w, http.StatusOK, form)
			return
		}
		form, err := s.forms.Get(r.Context(), principal, id)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, form)
	default:
		if _, ok := formpayment.NestMetaPath(nestRole, path); ok {
			form, err := s.forms.ApplyNestMeta(r.Context(), principal, id, nestRole, path)
			if err != nil {
				writeError(w, err)
				return
			}
			writeJSON(w, http.StatusOK, form)
			return
		}
		writeError(w, apperrors.New(apperrors.ErrCodeValidation, "unknown nest post path"))
	}
}

func (s *Server) handleNestFormDELETE(w http.ResponseWriter, r *http.Request, principal authz.Principal, id, path string) {
	switch {
	case strings.HasPrefix(path, "files/"):
		fileID := strings.TrimPrefix(path, "files/")
		form, err := s.forms.DeleteFileRef(r.Context(), principal, id, fileID)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, form)
	case strings.HasPrefix(path, "invoices/"):
		uuid := strings.TrimPrefix(path, "invoices/")
		form, err := s.forms.DeleteInvoice(r.Context(), principal, id, uuid)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, form)
	case path == "treasurer-order":
		form, err := s.forms.Get(r.Context(), principal, id)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, form)
	default:
		writeError(w, apperrors.New(apperrors.ErrCodeValidation, "unknown delete path"))
	}
}

func (s *Server) handleNestFormGETPath(w http.ResponseWriter, r *http.Request, principal authz.Principal, id, path string) {
	form, err := s.forms.Get(r.Context(), principal, id)
	if err != nil {
		writeError(w, err)
		return
	}
	switch path {
	case "xlsx":
		writeNestFormsXLSX(w, s.forms.List(r.Context(), principal))
	case "hs-codes":
		writeJSON(w, http.StatusOK, decodeJSONArray(form.InvoiceJSON))
	case "suggested-providers":
		dir := string(form.Direction)
		offers, err := s.catalog.SuggestedLiquidity(r.Context(), dir, form.Currency)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, offers)
	case "sign-method":
		writeJSON(w, http.StatusOK, map[string]string{"sign_method": form.SignMethod})
	case "payment-order/diadoc-status", "report/diadoc-status":
		view, err := s.forms.DiadocStatus(r.Context(), principal, id)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, view)
	default:
		writeJSON(w, http.StatusOK, form)
	}
}

func (s *Server) handleNestFormSpecialGET(w http.ResponseWriter, r *http.Request, principal authz.Principal, nestRole, key string) {
	_ = nestRole
	switch key {
	case "count":
		writeJSON(w, http.StatusOK, map[string]int{"count": s.forms.Count(r.Context(), principal)})
	case "xlsx":
		writeNestFormsXLSX(w, s.forms.List(r.Context(), principal))
	case "by-order-accepted":
		items := make([]formpayment.Form, 0)
		for _, f := range s.forms.List(r.Context(), principal) {
			if f.Status == formpayment.StatusSigningOrderAccepted {
				items = append(items, f)
			}
		}
		writeJSON(w, http.StatusOK, items)
	default:
		if strings.HasPrefix(key, "export") {
			writeJSON(w, http.StatusOK, s.forms.List(r.Context(), principal))
			return
		}
		writeJSON(w, http.StatusOK, s.forms.List(r.Context(), principal))
	}
}

func (s *Server) handleNestPatch(w http.ResponseWriter, r *http.Request, principal authz.Principal, id, path string) {
	if path == "confirm-payment" {
		form, err := s.forms.TransitionByNestPath(r.Context(), principal, id, "treasurer", "confirm-payment")
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, form)
		return
	}
	if strings.HasPrefix(path, "rate") {
		var body struct {
			Value    string `json:"value"`
			Currency string `json:"currency"`
			Source   string `json:"source"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		form, err := s.forms.SetRate(r.Context(), principal, id, parseRate(body.Value, body.Currency, body.Source))
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, form)
		return
	}
	if strings.HasPrefix(path, "invoice/") && strings.HasSuffix(path, "/hs-codes") {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
		return
	}
	if strings.HasPrefix(path, "invoices/") {
		uuid := strings.TrimPrefix(path, "invoices/")
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		form, err := s.forms.UpsertInvoice(r.Context(), principal, id, uuid, body)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, form)
		return
	}
	if path == "sign-method" || path == "form" || path == "" {
		var input service.NestPatchInput
		_ = json.NewDecoder(r.Body).Decode(&input)
		if path == "sign-method" && input.SignMethod == "" {
			var body struct {
				SignMethod string `json:"sign_method"`
			}
			_ = json.NewDecoder(r.Body).Decode(&body)
			input.SignMethod = body.SignMethod
		}
		form, err := s.forms.PatchForm(r.Context(), principal, id, input)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, form)
		return
	}
	writeError(w, apperrors.New(apperrors.ErrCodeValidation, "unknown patch path"))
}

func (s *Server) handleNestImport(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var raw json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		writeError(w, apperrors.New(apperrors.ErrCodeValidation, "invalid import body"))
		return
	}
	var withTpl struct {
		TemplateID string `json:"template_id"`
		CSV        string `json:"csv"`
		Content    string `json:"content"`
		FileID     string `json:"fileId"`
	}
	if err := json.Unmarshal(raw, &withTpl); err == nil && withTpl.TemplateID != "" {
		payload := []byte(withTpl.CSV)
		if len(payload) == 0 {
			payload = []byte(withTpl.Content)
		}
		forms, err := s.forms.ImportExcelWithTemplate(r.Context(), principal, withTpl.TemplateID, payload)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, forms)
		return
	}
	var rows []service.CreateInput
	if err := json.Unmarshal(raw, &rows); err != nil {
		var one service.CreateInput
		if err2 := json.Unmarshal(raw, &one); err2 != nil {
			writeError(w, apperrors.New(apperrors.ErrCodeValidation, "invalid import body"))
			return
		}
		rows = []service.CreateInput{one}
	}
	forms, err := s.forms.ImportCreating(r.Context(), principal, rows)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, forms)
}

func decodeJSONArray(raw string) []any {
	if raw == "" {
		return []any{}
	}
	var out []any
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return []any{}
	}
	return out
}

func writeNestFormsXLSX(w http.ResponseWriter, forms []formpayment.Form) {
	headers := []string{"id", "status", "direction", "currency", "invoice_amount", "updated_at"}
	rows := make([][]string, 0, len(forms))
	for _, f := range forms {
		rows = append(rows, []string{
			f.ID,
			string(f.Status),
			string(f.Direction),
			f.Currency,
			f.InvoiceAmount,
			f.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z"),
		})
	}
	data, err := export.MinimalXLSX("form-payments", headers, rows)
	if err != nil {
		writeError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", `attachment; filename="form-payments.xlsx"`)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}
