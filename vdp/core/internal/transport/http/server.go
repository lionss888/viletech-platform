package httpapi

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/domain"
	"github.com/viletech/vdp/core/internal/service"
	"github.com/viletech/vdp/core/pkg/config"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
	"github.com/viletech/vdp/core/pkg/logger"
)

type Server struct {
	cfg      *config.Config
	auth     *service.AuthService
	accounts *service.AccountService
	forms    *service.FormPaymentService
	orgs     *service.OrganizationService
	catalog  *service.CatalogService
	publish  *service.HubPublisher
	events   *service.FormEventBus
	mux      *http.ServeMux
	limiters sync.Map
}

func NewServer(cfg *config.Config, auth *service.AuthService, accounts *service.AccountService, forms *service.FormPaymentService, orgs *service.OrganizationService, catalog *service.CatalogService, publish *service.HubPublisher) *Server {
	bus := service.NewFormEventBus()
	forms.WithEventBus(bus)
	srv := &Server{cfg: cfg, auth: auth, accounts: accounts, forms: forms, orgs: orgs, catalog: catalog, publish: publish, events: bus, mux: http.NewServeMux()}
	srv.routes()
	srv.registerExtendedRoutes()
	return srv
}

func (s *Server) Handler() http.Handler {
	return s.recover(s.metrics(s.rateLimit(s.mux)))
}

func (s *Server) routes() {
	s.mux.HandleFunc("GET /api/v1/health", s.handleHealth)
	s.mux.HandleFunc("POST /api/v1/auth/login", s.handleLogin)
	s.mux.HandleFunc("POST /api/v1/forms", s.withAuth(s.handleCreateForm))
	s.mux.HandleFunc("GET /api/v1/forms", s.withAuth(s.handleListForms))
	s.mux.HandleFunc("GET /api/v1/forms/{id}", s.withAuth(s.handleGetForm))
	s.mux.HandleFunc("POST /api/v1/forms/{id}/actions/{action}", s.withAuth(s.handleTransition))
	s.mux.HandleFunc("POST /api/v1/forms/{id}/deadline", s.withAuth(s.handleDeadline))
	s.mux.HandleFunc("POST /api/v1/forms/{id}/provider", s.withAuth(s.handleAssignProvider))
	s.mux.HandleFunc("POST /api/v1/forms/{id}/agent", s.withAuth(s.handleAssignAgent))
	s.mux.HandleFunc("POST /api/v1/forms/{id}/rate", s.withAuth(s.handleSetRate))
	s.mux.HandleFunc("POST /api/v1/forms/{id}/commission", s.withAuth(s.handleSetCommission))
	s.mux.HandleFunc("GET /api/v1/provider/forms/{id}", s.withAuth(s.handleProviderForm))
	s.mux.HandleFunc("GET /api/v1/organizations/awaiting", s.withAuth(s.handleAwaiting))
	s.mux.HandleFunc("POST /api/v1/organizations/{id}/rating", s.withAuth(s.handleSetRating))
	s.mux.HandleFunc("POST /api/v1/organizations/{id}/approve", s.withAuth(s.handleApproveOrg))
	s.mux.HandleFunc("POST /api/v1/internal/outbox/flush", s.withS2S(s.handleFlush))
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "vdp-core"})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, apperrors.ErrInvalidInput)
		return
	}
	session, err := s.auth.Login(r.Context(), body.Email, body.Password)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, session)
}

func (s *Server) handleCreateForm(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Direction      string `json:"direction"`
		Kind           string `json:"kind"`
		InvoiceAmount  string `json:"invoice_amount"`
		Currency       string `json:"currency"`
		NoDocuments    bool   `json:"no_documents"`
		ContractNumber string `json:"contract_number"`
		ContractDate   string `json:"contract_date"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	form, err := s.forms.Create(r.Context(), principal, service.CreateInput{
		Direction:      parseDir(body.Direction),
		Kind:           parseKind(body.Kind),
		InvoiceAmount:  body.InvoiceAmount,
		Currency:       body.Currency,
		NoDocuments:    body.NoDocuments,
		ContractNumber: body.ContractNumber,
		ContractDate:   body.ContractDate,
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, form)
}

func (s *Server) handleListForms(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	writeJSON(w, http.StatusOK, s.forms.List(r.Context(), principal))
}

func (s *Server) handleGetForm(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	form, err := s.forms.Get(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	if principal.Role == domain.RoleProvider || principal.Role == domain.RoleSeniorProvider {
		writeJSON(w, http.StatusOK, s.mustProviderView(r.Context(), principal, form.ID))
		return
	}
	writeJSON(w, http.StatusOK, form)
}

func (s *Server) handleProviderForm(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	view, err := s.forms.GetProviderView(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (s *Server) handleTransition(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	form, err := s.forms.Transition(r.Context(), principal, r.PathValue("id"), parseAction(r.PathValue("action")))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, form)
}

func (s *Server) handleDeadline(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Deadline string `json:"deadline"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, apperrors.ErrInvalidInput)
		return
	}
	deadline, err := time.Parse(time.RFC3339, body.Deadline)
	if err != nil {
		writeError(w, apperrors.ErrInvalidInput)
		return
	}
	form, err := s.forms.AssignDeadline(r.Context(), principal, r.PathValue("id"), deadline)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, form)
}

func (s *Server) handleAssignProvider(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		ProviderID   string `json:"provider_id"`
		ClientAgreed bool   `json:"client_agreed"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, apperrors.ErrInvalidInput)
		return
	}
	form, err := s.forms.AssignProvider(r.Context(), principal, r.PathValue("id"), body.ProviderID, body.ClientAgreed)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, form)
}

func (s *Server) handleAssignAgent(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		AgentID string `json:"agent_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, apperrors.ErrInvalidInput)
		return
	}
	form, err := s.forms.AssignAgent(r.Context(), principal, r.PathValue("id"), body.AgentID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, form)
}

func (s *Server) handleSetRate(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Value    string `json:"value"`
		Currency string `json:"currency"`
		Source   string `json:"source"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, apperrors.ErrInvalidInput)
		return
	}
	form, err := s.forms.SetRate(r.Context(), principal, r.PathValue("id"), parseRate(body.Value, body.Currency, body.Source))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, form)
}

func (s *Server) handleSetCommission(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		FeeAmount   string `json:"fee_amount"`
		FeePercent  string `json:"fee_percent"`
		FeeCurrency string `json:"fee_currency"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, apperrors.ErrInvalidInput)
		return
	}
	form, err := s.forms.SetCommission(r.Context(), principal, r.PathValue("id"), parseCommission(body.FeeAmount, body.FeePercent, body.FeeCurrency))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, form)
}

func (s *Server) handleAwaiting(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	items, err := s.orgs.ListAwaiting(r.Context(), principal)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleSetRating(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	var body struct {
		Rating string `json:"rating"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, apperrors.ErrInvalidInput)
		return
	}
	org, err := s.orgs.SetRating(r.Context(), principal, r.PathValue("id"), parseRating(body.Rating))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, org)
}

func (s *Server) handleApproveOrg(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	org, err := s.orgs.Approve(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, org)
}

func (s *Server) handleFlush(w http.ResponseWriter, r *http.Request) {
	if s.publish == nil {
		writeJSON(w, http.StatusOK, map[string]string{"status": "noop"})
		return
	}
	if err := s.publish.Flush(r.Context()); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "flushed"})
}

func (s *Server) withAuth(next func(http.ResponseWriter, *http.Request, authz.Principal)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			writeError(w, apperrors.ErrUnauthorized)
			return
		}
		principal, err := s.auth.Parse(strings.TrimPrefix(header, "Bearer "))
		if err != nil {
			writeError(w, err)
			return
		}
		requestID := r.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = newID()
		}
		ctx := logger.WithRequestID(r.Context(), requestID)
		ctx = authz.WithPrincipal(ctx, principal)
		next(w, r.WithContext(ctx), principal)
	}
}

func (s *Server) withS2S(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-VDP-S2S") != s.cfg.HubSharedSecret {
			writeError(w, apperrors.ErrUnauthorized)
			return
		}
		next(w, r)
	}
}

func (s *Server) recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"code": "INTERNAL_ERROR"})
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func (s *Server) metrics(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		logger.FromContext(r.Context(), nil).Info("http",
			"method", r.Method,
			"path", r.URL.Path,
			"latency_ms", time.Since(start).Milliseconds(),
		)
	})
}

func (s *Server) rateLimit(next http.Handler) http.Handler {
	limit := s.cfg.RateLimitPerMinute
	if limit <= 0 {
		limit = 120
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip, _, _ := net.SplitHostPort(r.RemoteAddr)
		if ip == "" {
			ip = r.RemoteAddr
		}
		key := ip + "|" + time.Now().UTC().Format("200601021504")
		val, _ := s.limiters.LoadOrStore(key, new(int))
		count := val.(*int)
		*count++
		if *count > limit {
			w.WriteHeader(http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) mustProviderView(ctx context.Context, principal authz.Principal, id string) any {
	view, err := s.forms.GetProviderView(ctx, principal, id)
	if err != nil {
		return map[string]string{"error": err.Error()}
	}
	return view
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, err error) {
	app, ok := err.(*apperrors.AppError)
	if !ok {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"code": "INTERNAL_ERROR", "message": err.Error()})
		return
	}
	writeJSON(w, app.StatusCode, map[string]string{"code": string(app.Code), "message": app.Message})
}

func newID() string {
	buf := make([]byte, 16)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}
