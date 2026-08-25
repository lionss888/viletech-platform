package httpapi

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/domain/rate"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

func (s *Server) registerRateDocsRoutes() {
	s.mux.HandleFunc("POST /api/v1/forms/{id}/rate/resolve", s.withAuth(s.handleResolveRate))
	s.mux.HandleFunc("POST /api/v1/forms/{id}/commission/calculate", s.withAuth(s.handleCalcCommission))
	s.mux.HandleFunc("POST /api/v1/forms/{id}/docs/generate", s.withAuth(s.handleDocsGenerate))
	s.mux.HandleFunc("POST /api/v1/forms/import/excel", s.withAuth(s.handleTemplateExcelImport))
	s.mux.HandleFunc("GET /api/v1/templates", s.withAuth(s.handleTemplateList))
	s.mux.HandleFunc("GET /api/v1/template", s.withAuth(s.handleTemplateList))
	s.mux.HandleFunc("GET /api/v1/admin/templates", s.withAuth(s.handleTemplateList))
	s.mux.HandleFunc("POST /api/v1/admin/templates", s.withAuth(s.handleTemplateCreate))
	s.mux.HandleFunc("GET /api/v1/admin/templates/{id}", s.withAuth(s.handleTemplateGet))
	s.mux.HandleFunc("PATCH /api/v1/admin/templates/{id}", s.withAuth(s.handleTemplateUpdate))
	s.mux.HandleFunc("DELETE /api/v1/admin/templates/{id}", s.withAuth(s.handleTemplateDelete))
}

func (s *Server) handleResolveRate(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		OverrideRate         *float64 `json:"override_rate"`
		ClientCurrency       string   `json:"client_currency"`
		CounterpartyCurrency string   `json:"counterparty_currency"`
		MarketRate           *float64 `json:"market_rate"`
		MarketSource         string   `json:"market_source"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	var quote *rate.MarketQuote
	if body.MarketRate != nil {
		src := rate.ValueSource(body.MarketSource)
		if src == "" {
			src = rate.SourceOpenExchange
		}
		quote = &rate.MarketQuote{Value: *body.MarketRate, Source: src}
	}
	form, resolved, err := s.forms.ResolveAndSetRate(r.Context(), principal, r.PathValue("id"), body.OverrideRate, body.ClientCurrency, body.CounterpartyCurrency, quote)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"form": form, "resolved": resolved})
}

func (s *Server) handleTemplateList(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.catalog.ListTemplates(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"templates": items})
}

func (s *Server) handleTemplateCreate(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body domain.Template
	_ = json.NewDecoder(r.Body).Decode(&body)
	t, err := s.catalog.SaveTemplate(r.Context(), principal, body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, t)
}

func (s *Server) handleTemplateGet(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	t, err := s.catalog.GetTemplate(r.Context(), r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (s *Server) handleTemplateUpdate(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body domain.Template
	_ = json.NewDecoder(r.Body).Decode(&body)
	t, err := s.catalog.UpdateTemplate(r.Context(), principal, r.PathValue("id"), body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (s *Server) handleTemplateDelete(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if err := s.catalog.DeleteTemplate(r.Context(), principal, r.PathValue("id")); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleTemplateExcelImport(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	ct := r.Header.Get("Content-Type")
	if strings.HasPrefix(ct, "multipart/") {
		if err := r.ParseMultipartForm(16 << 20); err != nil {
			writeError(w, apperrors.ErrInvalidInput)
			return
		}
		templateID := r.FormValue("template_id")
		file, _, err := r.FormFile("file")
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
		forms, err := s.forms.ImportExcelWithTemplate(r.Context(), principal, templateID, data)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, map[string]any{"forms": forms})
		return
	}
	var body struct {
		TemplateID string `json:"template_id"`
		CSV        string `json:"csv"`
		Content    string `json:"content"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	raw := body.CSV
	if raw == "" {
		raw = body.Content
	}
	forms, err := s.forms.ImportExcelWithTemplate(r.Context(), principal, body.TemplateID, []byte(raw))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"forms": forms})
}
