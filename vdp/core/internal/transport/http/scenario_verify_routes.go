package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/repository/seed"
	"github.com/viletech/vdp/core/internal/service"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

func (s *Server) registerScenarioVerifyRoutes() {
	s.mux.HandleFunc("GET /api/v1/admin/scenario-catalog", s.withAuth(s.handleScenarioCatalog))
	s.mux.HandleFunc("GET /api/v1/admin/scenario-policy", s.withAuth(s.handleScenarioPolicy))
	s.mux.HandleFunc("POST /api/v1/admin/scenario-runs", s.withAuth(s.handleScenarioRunsCreate))
	s.mux.HandleFunc("GET /api/v1/admin/scenario-runs", s.withAuth(s.handleScenarioRunsList))
	s.mux.HandleFunc("GET /api/v1/admin/scenario-runs/{id}", s.withAuth(s.handleScenarioRunsGet))
	s.mux.HandleFunc("POST /api/v1/admin/probe-data/wipe", s.withAuth(s.handleProbeDataWipe))
}

func (s *Server) handleScenarioCatalog(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if s.scenarios == nil {
		writeError(w, apperrors.New(apperrors.ErrCodeInternal, "scenario verify not configured"))
		return
	}
	items, err := s.scenarios.Catalog(r.Context(), principal)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleScenarioPolicy(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if s.scenarios == nil {
		writeError(w, apperrors.New(apperrors.ErrCodeInternal, "scenario verify not configured"))
		return
	}
	pol, err := s.scenarios.Policy(r.Context(), principal)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, pol)
}

func (s *Server) handleScenarioRunsCreate(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if s.scenarios == nil {
		writeError(w, apperrors.New(apperrors.ErrCodeInternal, "scenario verify not configured"))
		return
	}
	var body service.StartRunRequest
	_ = json.NewDecoder(r.Body).Decode(&body)
	runs, err := s.scenarios.StartRuns(r.Context(), principal, body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"runs": runs})
}

func (s *Server) handleScenarioRunsList(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if s.scenarios == nil {
		writeError(w, apperrors.New(apperrors.ErrCodeInternal, "scenario verify not configured"))
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	items, err := s.scenarios.ListRuns(r.Context(), principal, limit)
	if err != nil {
		writeError(w, err)
		return
	}
	if items == nil {
		writeJSON(w, http.StatusOK, []struct{}{})
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleScenarioRunsGet(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if s.scenarios == nil {
		writeError(w, apperrors.New(apperrors.ErrCodeInternal, "scenario verify not configured"))
		return
	}
	run, err := s.scenarios.GetRun(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, run)
}

func (s *Server) handleProbeDataWipe(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if s.forms == nil {
		writeError(w, apperrors.New(apperrors.ErrCodeInternal, "forms not configured"))
		return
	}
	env := ""
	if s.cfg != nil {
		env = s.cfg.Environment
	}
	result, err := s.forms.WipeProbeData(r.Context(), principal, seed.ShouldWipeForms(env))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}
