package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/viletech/vdp/manager-ops/internal/adapters/telegram"
	"github.com/viletech/vdp/manager-ops/internal/behavior"
	"github.com/viletech/vdp/manager-ops/internal/roster"
	"github.com/viletech/vdp/shared/managerops"
)

// Server exposes manager-ops HTTP surface for platform integration.
type Server struct {
	Roster          *roster.Service
	Behavior        *behavior.Service
	HubSharedSecret string
}

// Handler returns the mux.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", s.handleHealth)
	mux.HandleFunc("POST /v1/events", s.withS2S(s.handleIngest))
	mux.HandleFunc("POST /v1/roster/sync", s.withS2S(s.handleSync))
	mux.HandleFunc("PUT /v1/consent/{accountID}", s.withS2S(s.handleConsent))
	mux.HandleFunc("GET /v1/scores/{accountID}", s.withS2S(s.handleScore))
	mux.HandleFunc("POST /v1/nudges", s.withS2S(s.handleNudge))
	mux.HandleFunc("POST /v1/telegram/webhook", s.handleTelegramWebhook)
	mux.HandleFunc("POST /telegram/webhook", s.handleTelegramWebhook)
	return mux
}

func (s *Server) withS2S(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if s.HubSharedSecret == "" {
			next(w, r)
			return
		}
		got := r.Header.Get("X-VDP-S2S")
		if got == "" {
			got = r.Header.Get("X-Hub-Shared-Secret")
		}
		if got != s.HubSharedSecret {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":   "ok",
		"service":  "manager-ops",
		"contours": []string{"roster", "behavior"},
	})
}

func (s *Server) handleIngest(w http.ResponseWriter, r *http.Request) {
	var e managerops.Event
	if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	status, err := s.Behavior.Ingest(r.Context(), e)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": status})
}

func (s *Server) handleSync(w http.ResponseWriter, r *http.Request) {
	var req managerops.SyncRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	n, err := s.Roster.SyncChat(r.Context(), req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "members": n})
}

func (s *Server) handleConsent(w http.ResponseWriter, r *http.Request) {
	accountID := r.PathValue("accountID")
	var body struct {
		Enabled bool `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if err := s.Roster.SetConsent(r.Context(), accountID, body.Enabled); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "account_id": accountID, "enabled": body.Enabled})
}

func (s *Server) handleScore(w http.ResponseWriter, r *http.Request) {
	accountID := r.PathValue("accountID")
	period := r.URL.Query().Get("period")
	if period == "" {
		http.Error(w, "period required", http.StatusBadRequest)
		return
	}
	sc, ok, err := s.Behavior.Score(r.Context(), accountID, period)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if !ok {
		writeJSON(w, http.StatusOK, map[string]any{"status": "empty", "account_id": accountID, "period": period})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"status": "ok", "account_id": sc.AccountID, "period": sc.Period,
		"events": sc.Events, "score": sc.Score,
	})
}

func (s *Server) handleNudge(w http.ResponseWriter, r *http.Request) {
	var body struct {
		AccountID string `json:"account_id"`
		ChatID    string `json:"chat_id"`
		Text      string `json:"text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if err := s.Behavior.Nudge(r.Context(), body.AccountID, body.ChatID, body.Text); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "accepted"})
}

func (s *Server) handleTelegramWebhook(w http.ResponseWriter, r *http.Request) {
	var update map[string]any
	if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	e, ok := telegram.EventFromUpdate(update)
	if !ok {
		writeJSON(w, http.StatusOK, map[string]any{"status": "ignored"})
		return
	}
	status, err := s.Behavior.Ingest(r.Context(), e)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": status})
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}
