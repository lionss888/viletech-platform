package httpapi

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/viletech/vdp/hub/internal/adapters/telegram"
	"github.com/viletech/vdp/hub/internal/dispatcher"
	"github.com/viletech/vdp/hub/internal/registry"
	"github.com/viletech/vdp/hub/pkg/config"
	"github.com/viletech/vdp/shared/events"
)

type Server struct {
	cfg      *config.Config
	dispatch *dispatcher.Dispatcher
	plugins  *registry.Registry
	mux      *http.ServeMux
}

func New(cfg *config.Config, dispatch *dispatcher.Dispatcher, plugins *registry.Registry) *Server {
	srv := &Server{cfg: cfg, dispatch: dispatch, plugins: plugins, mux: http.NewServeMux()}
	srv.mux.HandleFunc("GET /api/v1/health", srv.health)
	srv.mux.HandleFunc("POST /api/v1/inbox", srv.withS2S(srv.inbox))
	srv.mux.HandleFunc("POST /telegram/webhook", srv.telegramWebhook)
	return srv
}

func (s *Server) Handler() http.Handler {
	return s.mux
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	names := make([]string, 0)
	for _, plugin := range s.plugins.All() {
		names = append(names, plugin.Name())
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "service": "vdp-hub", "plugins": names})
}

func (s *Server) inbox(w http.ResponseWriter, r *http.Request) {
	var env events.Envelope
	if err := json.NewDecoder(r.Body).Decode(&env); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"code": "VALIDATION_ERROR"})
		return
	}
	result, err := s.dispatch.Handle(r.Context(), env)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"code": "EXTERNAL_SERVICE_ERROR", "message": err.Error()})
		return
	}
	writeJSON(w, http.StatusAccepted, result)
}

func (s *Server) telegramWebhook(w http.ResponseWriter, r *http.Request) {
	timeout := time.Duration(s.cfg.ExternalTimeout) * time.Millisecond
	telegram.HandleWebhook(w, r, s.cfg.CoreURL, s.cfg.SharedSecret, timeout)
}

func (s *Server) withS2S(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-VDP-S2S") != s.cfg.SharedSecret {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"code": "UNAUTHORIZED"})
			return
		}
		next(w, r)
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
