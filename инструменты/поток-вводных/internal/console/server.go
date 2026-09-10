package console

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log/slog"
	"net"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/viletech/tools/intake/internal/card"
	"github.com/viletech/tools/intake/internal/comms"
	"github.com/viletech/tools/intake/internal/pipeline"
	"github.com/viletech/tools/intake/internal/planfile"
	"github.com/viletech/tools/intake/internal/store"
)

// Server is the local operator console HTTP API + embedded UI.
type Server struct {
	Addr       string
	Token      string
	Pipeline   *pipeline.Pipeline
	Store      *store.Store
	Cards      *card.Store
	Workspace  string
	Log        *slog.Logger
	UI         fs.FS
	MaxUpload  int64
	AllowMIME  map[string]struct{}
	httpServer *http.Server
}

// Start serves on Addr (must be loopback). Non-blocking.
func (s *Server) Start() error {
	if s.Addr == "" {
		s.Addr = "127.0.0.1:8787"
	}
	host, _, err := net.SplitHostPort(s.Addr)
	if err != nil {
		return fmt.Errorf("console addr: %w", err)
	}
	if !isAllowedConsoleHost(host) {
		return fmt.Errorf("console bind host not allowed: %s (use 127.0.0.1 or 0.0.0.0 with token)", host)
	}
	if s.MaxUpload <= 0 {
		s.MaxUpload = 25 << 20
	}
	if s.AllowMIME == nil {
		s.AllowMIME = defaultMIME()
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", s.handleHealth)
	mux.HandleFunc("GET /api/thread", s.auth(s.handleThread))
	mux.HandleFunc("GET /api/cards", s.auth(s.handleCards))
	mux.HandleFunc("POST /api/messages", s.auth(s.handleMessages))
	mux.HandleFunc("POST /api/upload", s.auth(s.handleUpload))
	mux.HandleFunc("POST /api/hitl", s.auth(s.handleHITL))
	mux.HandleFunc("POST /api/to-cursor", s.auth(s.handleToCursor))
	mux.HandleFunc("POST /api/tg/delete", s.auth(s.handleTGDelete))
	mux.HandleFunc("POST /api/mgmt/done", s.auth(s.handleMgmtDone))
	mux.HandleFunc("GET /api/media/", s.auth(s.handleMediaGet))
	if s.UI != nil {
		sub, err := fs.Sub(s.UI, "ui")
		if err != nil {
			return fmt.Errorf("console ui: %w", err)
		}
		mux.Handle("/", http.FileServer(http.FS(sub)))
	}
	s.httpServer = &http.Server{
		Addr:              s.Addr,
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       60 * time.Second,
		WriteTimeout:      60 * time.Second,
	}
	ln, err := net.Listen("tcp", s.Addr)
	if err != nil {
		return err
	}
	go func() {
		if err := s.httpServer.Serve(ln); err != nil && err != http.ErrServerClosed {
			if s.Log != nil {
				s.Log.Error("console serve", "err", err)
			}
		}
	}()
	return nil
}

// Shutdown stops the HTTP server.
func (s *Server) Shutdown(ctx context.Context) error {
	if s.httpServer == nil {
		return nil
	}
	return s.httpServer.Shutdown(ctx)
}

func (s *Server) auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if s.Token == "" {
			http.Error(w, "console token not configured", http.StatusServiceUnavailable)
			return
		}
		got := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		got = strings.TrimSpace(got)
		if got == "" {
			got = strings.TrimSpace(r.URL.Query().Get("token"))
		}
		if subtle.ConstantTimeCompare([]byte(got), []byte(s.Token)) != 1 {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleThread(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	recs, err := s.Store.ListInboxRecent(limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": recs})
}

func (s *Server) handleCards(w http.ResponseWriter, _ *http.Request) {
	if s.Cards == nil {
		writeJSON(w, http.StatusOK, map[string]any{"items": []any{}})
		return
	}
	items, err := s.Cards.ListAll()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

type messageReq struct {
	Text       string   `json:"text"`
	MirrorToTG bool     `json:"mirror_to_tg"`
	AsIntake   bool     `json:"as_intake"`
	AttachIDs  []string `json:"attachment_ids"`
}

func (s *Server) handleMessages(w http.ResponseWriter, r *http.Request) {
	var req messageReq
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&req); err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}
	atts := s.resolveAttachments(req.AttachIDs)
	res, err := s.Pipeline.IngestConsole(r.Context(), pipeline.ConsoleIngest{
		Text:        req.Text,
		AsIntake:    req.AsIntake,
		MirrorToTG:  req.MirrorToTG,
		Attachments: atts,
		FromUser:    "console",
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (s *Server) resolveAttachments(ids []string) []store.Attachment {
	if len(ids) == 0 {
		return nil
	}
	// Attachments already on disk from upload; re-list recent and match by id.
	recs, _ := s.Store.ListInboxRecent(200)
	byID := map[string]store.Attachment{}
	for _, rec := range recs {
		for _, a := range rec.Attachments {
			byID[a.ID] = a
		}
	}
	// Also scan media dir filenames for pending uploads tracked via upload response only.
	var out []store.Attachment
	for _, id := range ids {
		if a, ok := byID[id]; ok {
			out = append(out, a)
			continue
		}
		// Lookup media/{id}_*
		matches, _ := filepath.Glob(filepath.Join(s.Store.MediaDir(), id+"_*"))
		if len(matches) == 0 {
			continue
		}
		rel, _ := filepath.Rel(s.Store.Home(), matches[0])
		out = append(out, store.Attachment{
			ID: id, Path: rel, Name: filepath.Base(matches[0]), Source: "upload",
		})
	}
	return out
}

func (s *Server) handleUpload(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(s.MaxUpload + (1 << 20)); err != nil {
		http.Error(w, "multipart too large", http.StatusBadRequest)
		return
	}
	file, hdr, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "file required", http.StatusBadRequest)
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, s.MaxUpload+1))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if int64(len(data)) > s.MaxUpload {
		http.Error(w, "file too large", http.StatusBadRequest)
		return
	}
	mime := hdr.Header.Get("Content-Type")
	if mime == "" {
		mime = http.DetectContentType(data)
	}
	if !s.mimeAllowed(mime, hdr.Filename) {
		http.Error(w, "mime not allowed", http.StatusBadRequest)
		return
	}
	id := fmt.Sprintf("up-%d", time.Now().UnixNano())
	att, err := s.Store.SaveMedia(id, hdr.Filename, data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	att.MIME = mime
	att.Source = "upload"
	writeJSON(w, http.StatusOK, att)
}

type hitlReq struct {
	CardID  string `json:"card_id"`
	Approve bool   `json:"approve"`
	Mirror  bool   `json:"mirror_to_tg"`
}

func (s *Server) handleHITL(w http.ResponseWriter, r *http.Request) {
	var req hitlReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.CardID == "" {
		http.Error(w, "card_id required", http.StatusBadRequest)
		return
	}
	if err := s.Pipeline.ApplyHITLDecision(r.Context(), req.CardID, req.Approve, req.Mirror); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

type toCursorReq struct {
	CardID string `json:"card_id"`
	Text   string `json:"text"`
	Mode   string `json:"mode"` // plan|prompt
}

func (s *Server) handleToCursor(w http.ResponseWriter, r *http.Request) {
	var req toCursorReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}
	if s.Workspace == "" {
		http.Error(w, "workspace not set", http.StatusBadRequest)
		return
	}
	mode := strings.ToLower(strings.TrimSpace(req.Mode))
	if mode == "" {
		mode = "prompt"
	}
	text := strings.TrimSpace(req.Text)
	cardID := strings.TrimSpace(req.CardID)
	if cardID != "" && s.Cards != nil && text == "" {
		c, err := s.Cards.Get(cardID)
		if err == nil {
			text = strings.TrimSpace(c.Proposal)
			if text == "" {
				text = c.Summary
			}
		}
	}
	if text == "" {
		http.Error(w, "text or card_id required", http.StatusBadRequest)
		return
	}
	var path string
	var err error
	if mode == "plan" {
		id := cardID
		if id == "" {
			id = fmt.Sprintf("console-%d", time.Now().Unix())
		}
		path, err = planfile.WriteMarkdown(s.Workspace, planfile.Document{
			CardID:   id,
			Status:   "console",
			Summary:  text,
			Proposal: text,
		})
	} else {
		id := cardID
		if id == "" {
			id = fmt.Sprintf("console-%d", time.Now().Unix())
		}
		path, err = planfile.WritePrompt(s.Workspace, id, text)
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"path": path, "mode": mode})
}

type tgDeleteReq struct {
	ChatID    int64 `json:"chat_id"`
	MessageID int64 `json:"message_id"`
}

func (s *Server) handleTGDelete(w http.ResponseWriter, r *http.Request) {
	var req tgDeleteReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.MessageID == 0 {
		http.Error(w, "message_id required", http.StatusBadRequest)
		return
	}
	if req.ChatID == 0 {
		for id := range s.Pipeline.ChatIDs {
			req.ChatID = id
			break
		}
	}
	if err := s.Pipeline.DeleteTGMessage(r.Context(), req.ChatID, req.MessageID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

type mgmtDoneReq struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	Next  string `json:"next"`
}

func (s *Server) handleMgmtDone(w http.ResponseWriter, r *http.Request) {
	var req mgmtDoneReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}
	title := strings.TrimSpace(req.Title)
	if title == "" {
		title = "Готово"
	}
	body := strings.TrimSpace(req.Body)
	text := "✅ Готово · " + title
	if body != "" {
		text += "\n\n" + body
	}
	text += "\n\nПриёмка: пройдена"
	if strings.TrimSpace(req.Next) != "" {
		text += "\nДальше: " + strings.TrimSpace(req.Next)
	}
	text = comms.SanitizeManager(text)
	res, err := s.Pipeline.IngestConsole(r.Context(), pipeline.ConsoleIngest{
		Text:       text,
		AsIntake:   false,
		MirrorToTG: true,
		FromUser:   "console",
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "tg_message_id": res.TGMessage, "text": text})
}

func (s *Server) handleMediaGet(w http.ResponseWriter, r *http.Request) {
	rel := strings.TrimPrefix(r.URL.Path, "/api/media/")
	rel = filepath.Clean(rel)
	if rel == "." || strings.Contains(rel, "..") {
		http.NotFound(w, r)
		return
	}
	abs := s.Store.AbsMediaPath(filepath.Join("media", rel))
	if abs == "" {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, abs)
}

func (s *Server) mimeAllowed(mime, name string) bool {
	mime = strings.ToLower(strings.TrimSpace(strings.Split(mime, ";")[0]))
	if _, ok := s.AllowMIME[mime]; ok {
		return true
	}
	ext := strings.ToLower(filepath.Ext(name))
	switch ext {
	case ".md", ".txt", ".sh", ".go", ".py", ".ts", ".tsx", ".js", ".json", ".yml", ".yaml",
		".png", ".jpg", ".jpeg", ".gif", ".webp", ".mp4", ".mov", ".webm", ".pdf":
		return true
	}
	return false
}

func defaultMIME() map[string]struct{} {
	list := []string{
		"image/jpeg", "image/png", "image/gif", "image/webp",
		"video/mp4", "video/quicktime", "video/webm",
		"application/pdf", "text/plain", "text/markdown",
		"application/octet-stream",
	}
	m := map[string]struct{}{}
	for _, x := range list {
		m[x] = struct{}{}
	}
	return m
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func isAllowedConsoleHost(host string) bool {
	h := strings.TrimSpace(strings.ToLower(host))
	if h == "localhost" || h == "0.0.0.0" || h == "::" || h == "[::]" {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && (ip.IsLoopback() || ip.IsUnspecified())
}
