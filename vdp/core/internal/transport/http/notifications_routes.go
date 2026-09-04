package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/viletech/vdp/core/internal/authz"
	"github.com/viletech/vdp/core/internal/service"
	apperrors "github.com/viletech/vdp/core/pkg/errors"
)

func (s *Server) registerNotificationRoutes() {
	s.mux.HandleFunc("POST /api/v1/me/telegram/link", s.withAuth(s.handleTelegramLink))
	s.mux.HandleFunc("POST /api/v1/me/telegram/unlink", s.withAuth(s.handleTelegramUnlink))
	s.mux.HandleFunc("PATCH /api/v1/me/notifications", s.withAuth(s.handleNotifyPrefs))
	s.mux.HandleFunc("GET /api/v1/work-chats", s.withAuth(s.handleListWorkChats))
	s.mux.HandleFunc("POST /api/v1/work-chats/{id}/join", s.withAuth(s.handleJoinWorkChat))
	s.mux.HandleFunc("GET /api/v1/admin/work-chats/joins", s.withAuth(s.handleListJoins))
	s.mux.HandleFunc("POST /api/v1/admin/work-chats/joins/{id}/approve", s.withAuth(s.handleApproveJoin))
	s.mux.HandleFunc("POST /api/v1/admin/work-chats/joins/{id}/reject", s.withAuth(s.handleRejectJoin))
	s.mux.HandleFunc("POST /api/v1/internal/telegram/bind", s.withS2S(s.handleTelegramBindS2S))
	s.mux.HandleFunc("GET /api/v1/forms/{id}/diadoc-status", s.withAuth(s.handleFormDiadocStatus))
}

func (s *Server) handleTelegramLink(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if s.notify == nil {
		writeError(w, apperrors.New(apperrors.ErrCodeInternal, "notifications unavailable"))
		return
	}
	out, err := s.notify.CreateTelegramLink(r.Context(), principal)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (s *Server) handleTelegramUnlink(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if s.notify == nil {
		writeError(w, apperrors.New(apperrors.ErrCodeInternal, "notifications unavailable"))
		return
	}
	acc, err := s.notify.UnlinkTelegram(r.Context(), principal)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, acc.Public())
}

func (s *Server) handleNotifyPrefs(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if s.notify == nil {
		writeError(w, apperrors.New(apperrors.ErrCodeInternal, "notifications unavailable"))
		return
	}
	var body service.NotifyPrefs
	_ = json.NewDecoder(r.Body).Decode(&body)
	acc, err := s.notify.UpdatePrefs(r.Context(), principal, body)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, acc.Public())
}

func (s *Server) handleListWorkChats(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if s.notify == nil {
		writeError(w, apperrors.New(apperrors.ErrCodeInternal, "notifications unavailable"))
		return
	}
	items, err := s.notify.ListWorkChats(r.Context(), principal)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleJoinWorkChat(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if s.notify == nil {
		writeError(w, apperrors.New(apperrors.ErrCodeInternal, "notifications unavailable"))
		return
	}
	join, err := s.notify.RequestJoin(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, join)
}

func (s *Server) handleListJoins(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	if s.notify == nil {
		writeError(w, apperrors.New(apperrors.ErrCodeInternal, "notifications unavailable"))
		return
	}
	items, err := s.notify.ListPendingJoins(r.Context(), principal)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleApproveJoin(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	s.decideJoin(w, r, principal, true)
}

func (s *Server) handleRejectJoin(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	s.decideJoin(w, r, principal, false)
}

func (s *Server) decideJoin(w http.ResponseWriter, r *http.Request, principal authz.Principal, approved bool) {
	if s.notify == nil {
		writeError(w, apperrors.New(apperrors.ErrCodeInternal, "notifications unavailable"))
		return
	}
	join, err := s.notify.DecideJoin(r.Context(), principal, r.PathValue("id"), approved)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, join)
}

func (s *Server) handleTelegramBindS2S(w http.ResponseWriter, r *http.Request) {
	if s.notify == nil {
		writeError(w, apperrors.New(apperrors.ErrCodeInternal, "notifications unavailable"))
		return
	}
	var body struct {
		Code   string `json:"code"`
		ChatID string `json:"chat_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, apperrors.ErrInvalidInput)
		return
	}
	acc, err := s.notify.BindTelegram(r.Context(), body.Code, body.ChatID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "linked", "account_id": acc.ID, "telegram_linked": true})
}

func (s *Server) handleFormDiadocStatus(w http.ResponseWriter, r *http.Request, principal authz.Principal) {
	status, err := s.forms.DiadocStatus(r.Context(), principal, r.PathValue("id"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, status)
}
