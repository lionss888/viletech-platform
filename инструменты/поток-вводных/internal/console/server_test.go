package console

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/viletech/tools/intake/internal/card"
	"github.com/viletech/tools/intake/internal/pipeline"
	"github.com/viletech/tools/intake/internal/store"
)

type fakeMessenger struct {
	last string
	id   int64
}

func (f *fakeMessenger) SendMessage(_ context.Context, _, _ int64, text string) (int64, error) {
	f.last = text
	f.id++
	return f.id, nil
}

func TestConsoleThreadAndMessage(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	st := store.New(home)
	fm := &fakeMessenger{}
	p := &pipeline.Pipeline{
		Store:     st,
		Cards:     card.NewStore(home),
		Messenger: fm,
		ChatIDs:   map[int64]struct{}{-100: {}},
		BotUser:   "vdp_intake_bot",
		WithHITL:  true,
		Workspace: t.TempDir(),
	}
	_ = st.AppendInbox(store.Record{Text: "hello", Kind: "intake", Source: "telegram", ChatID: -100})
	s := &Server{
		Token:     "secret",
		Pipeline:  p,
		Store:     st,
		Cards:     p.Cards,
		Workspace: p.Workspace,
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/thread", s.auth(s.handleThread))
	mux.HandleFunc("POST /api/messages", s.auth(s.handleMessages))
	mux.HandleFunc("POST /api/to-cursor", s.auth(s.handleToCursor))

	req := httptest.NewRequest(http.MethodGet, "/api/thread?limit=10", nil)
	req.Header.Set("Authorization", "Bearer secret")
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("thread status %d %s", rr.Code, rr.Body.String())
	}

	body, _ := json.Marshal(map[string]any{
		"text": "#тест console intake please", "as_intake": true, "mirror_to_tg": true,
	})
	req = httptest.NewRequest(http.MethodPost, "/api/messages", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer secret")
	req.Header.Set("Content-Type", "application/json")
	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("messages status %d %s", rr.Code, rr.Body.String())
	}
	if fm.last == "" {
		t.Fatal("expected mirror send")
	}

	body, _ = json.Marshal(map[string]any{"text": "do the thing", "mode": "prompt"})
	req = httptest.NewRequest(http.MethodPost, "/api/to-cursor", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer secret")
	req.Header.Set("Content-Type", "application/json")
	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("to-cursor %d %s", rr.Code, rr.Body.String())
	}
	var out map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &out)
	path, _ := out["path"].(string)
	if path == "" || filepath.Ext(path) != ".md" {
		t.Fatalf("path=%v", out)
	}
}

func TestUploadMIME(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	st := store.New(home)
	s := &Server{
		Token:     "t",
		Store:     st,
		Pipeline:  &pipeline.Pipeline{Store: st, ChatIDs: map[int64]struct{}{-1: {}}},
		MaxUpload: 1 << 20,
		AllowMIME: defaultMIME(),
	}
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	part, err := w.CreateFormFile("file", "note.md")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = io.WriteString(part, "# hello")
	_ = w.Close()
	req := httptest.NewRequest(http.MethodPost, "/api/upload", &buf)
	req.Header.Set("Authorization", "Bearer t")
	req.Header.Set("Content-Type", w.FormDataContentType())
	rr := httptest.NewRecorder()
	s.auth(s.handleUpload)(rr, req)
	if rr.Code != 200 {
		t.Fatalf("upload %d %s", rr.Code, rr.Body.String())
	}
}

func TestAuthRequired(t *testing.T) {
	t.Parallel()
	s := &Server{Token: "x", Store: store.New(t.TempDir())}
	req := httptest.NewRequest(http.MethodGet, "/api/thread", nil)
	rr := httptest.NewRecorder()
	s.auth(s.handleThread)(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("code=%d", rr.Code)
	}
}
