package console

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/viletech/tools/intake/internal/agent"
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

type fakeMediaOut struct {
	deletedChat int64
	deletedMsg  int64
}

func (f *fakeMediaOut) SendPhoto(context.Context, int64, string, []byte, string) (int64, error) {
	return 1, nil
}
func (f *fakeMediaOut) SendDocument(context.Context, int64, string, []byte, string) (int64, error) {
	return 1, nil
}
func (f *fakeMediaOut) SendVideo(context.Context, int64, string, []byte, string) (int64, error) {
	return 1, nil
}
func (f *fakeMediaOut) DeleteMessage(_ context.Context, chatID, messageID int64) error {
	f.deletedChat = chatID
	f.deletedMsg = messageID
	return nil
}

func TestConsoleThreadUsesThreadStore(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	st := store.New(home)
	_ = st.AppendThread(store.ThreadMsg{
		Direction: "out", Text: "mirror outbound", MessageID: 42, ChatID: -100, Kind: "mirror",
	})
	s := &Server{Token: "secret", Store: st}
	req := httptest.NewRequest(http.MethodGet, "/api/thread?limit=10", nil)
	req.Header.Set("Authorization", "Bearer secret")
	rr := httptest.NewRecorder()
	s.auth(s.handleThread)(rr, req)
	if rr.Code != 200 {
		t.Fatalf("thread status %d %s", rr.Code, rr.Body.String())
	}
	var payload struct {
		Items []store.ThreadMsg `json:"items"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if len(payload.Items) != 1 || payload.Items[0].Direction != "out" {
		t.Fatalf("want outbound thread item, got %+v", payload.Items)
	}
	if !strings.Contains(payload.Items[0].Text, "mirror outbound") {
		t.Fatalf("text=%q", payload.Items[0].Text)
	}
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
	_ = st.AppendThread(store.ThreadMsg{Direction: "in", Text: "hello", ChatID: -100, MessageID: 1})
	s := &Server{
		Token:     "secret",
		Pipeline:  p,
		Store:     st,
		Cards:     p.Cards,
		Workspace: p.Workspace,
		Agent:     &agent.Runner{Store: st, Workspace: p.Workspace},
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/thread", s.auth(s.handleThread))
	mux.HandleFunc("POST /api/messages", s.auth(s.handleMessages))
	mux.HandleFunc("POST /api/to-cursor", s.auth(s.handleToCursor))
	mux.HandleFunc("POST /api/agent", s.auth(s.handleAgentStart))
	mux.HandleFunc("GET /api/agent/", s.auth(s.handleAgentGet))

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

	body, _ = json.Marshal(map[string]any{"mode": "analyze_chat", "message_ids": []string{}})
	req = httptest.NewRequest(http.MethodPost, "/api/agent", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer secret")
	req.Header.Set("Content-Type", "application/json")
	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusAccepted {
		t.Fatalf("agent start %d %s", rr.Code, rr.Body.String())
	}
	var job agent.Job
	_ = json.Unmarshal(rr.Body.Bytes(), &job)
	if job.ID == "" {
		t.Fatal("empty job id")
	}
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		req = httptest.NewRequest(http.MethodGet, "/api/agent/"+job.ID, nil)
		req.Header.Set("Authorization", "Bearer secret")
		rr = httptest.NewRecorder()
		mux.ServeHTTP(rr, req)
		_ = json.Unmarshal(rr.Body.Bytes(), &job)
		if job.Status == "done" {
			if job.Result == "" {
				t.Fatal("empty result")
			}
			return
		}
		time.Sleep(50 * time.Millisecond)
	}
	t.Fatalf("job not done: %+v", job)
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

func TestHITLAndMgmtDoneAndDelete(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	st := store.New(home)
	cards := card.NewStore(home)
	c := &card.Card{
		ID:     "card-1",
		Status: card.StatusAwaitingApprove,
		ChatID: -100,
		Summary: "sum",
		Proposal: "prop",
	}
	if err := cards.Save(c); err != nil {
		t.Fatal(err)
	}
	fm := &fakeMessenger{}
	mo := &fakeMediaOut{}
	p := &pipeline.Pipeline{
		Store:     st,
		Cards:     cards,
		Messenger: fm,
		MediaOut:  mo,
		ChatIDs:   map[int64]struct{}{-100: {}},
		BotUser:   "bot",
		WithHITL:  true,
		Workspace: t.TempDir(),
	}
	s := &Server{Token: "tok", Pipeline: p, Store: st, Cards: cards, Workspace: p.Workspace}

	body, _ := json.Marshal(map[string]any{"card_id": "card-1", "approve": true, "mirror_to_tg": true})
	req := httptest.NewRequest(http.MethodPost, "/api/hitl", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer tok")
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	s.auth(s.handleHITL)(rr, req)
	if rr.Code != 200 {
		t.Fatalf("hitl %d %s", rr.Code, rr.Body.String())
	}

	body, _ = json.Marshal(map[string]any{
		"title": "Стороны сделки",
		"body":  "org-gate закрыт\nклиент видит статус\nvitest зелёный",
		"next":  "пилот",
	})
	req = httptest.NewRequest(http.MethodPost, "/api/mgmt/done", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer tok")
	req.Header.Set("Content-Type", "application/json")
	rr = httptest.NewRecorder()
	s.auth(s.handleMgmtDone)(rr, req)
	if rr.Code != 200 {
		t.Fatalf("mgmt %d %s", rr.Code, rr.Body.String())
	}
	var mgmt map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &mgmt)
	text, _ := mgmt["text"].(string)
	if strings.Contains(strings.ToLower(text), "org-gate") || strings.Contains(strings.ToLower(text), "vitest") {
		t.Fatalf("tech leak in mgmt text: %q", text)
	}
	if !strings.Contains(text, "Приёмка") {
		t.Fatalf("missing acceptance: %q", text)
	}

	body, _ = json.Marshal(map[string]any{"message_id": 99, "chat_id": int64(-100)})
	req = httptest.NewRequest(http.MethodPost, "/api/tg/delete", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer tok")
	req.Header.Set("Content-Type", "application/json")
	rr = httptest.NewRecorder()
	s.auth(s.handleTGDelete)(rr, req)
	if rr.Code != 200 {
		t.Fatalf("delete %d %s", rr.Code, rr.Body.String())
	}
	if mo.deletedMsg != 99 || mo.deletedChat != -100 {
		t.Fatalf("delete not called: %+v", mo)
	}
}

func TestMountUIStaticServesIndexAndAPIUnaffected(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "index.html"), []byte("<!doctype html><title>spa</title>"), 0o644); err != nil {
		t.Fatal(err)
	}
	st := store.New(t.TempDir())
	s := &Server{Token: "secret", Store: st, StaticDir: dir}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("GET /api/thread", s.auth(s.handleThread))
	if err := s.mountUI(mux); err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != 200 || !strings.Contains(rr.Body.String(), "spa") {
		t.Fatalf("spa index: %d %s", rr.Code, rr.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/thread", nil)
	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("api without token want 401 got %d", rr.Code)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/thread", nil)
	req.Header.Set("Authorization", "Bearer secret")
	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("api with token: %d %s", rr.Code, rr.Body.String())
	}
}

func TestMountUISPAUpstreamProxiesNonAPI(t *testing.T) {
	t.Parallel()
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte("<html>nitro-spa</html>"))
	}))
	t.Cleanup(upstream.Close)
	st := store.New(t.TempDir())
	s := &Server{Token: "secret", Store: st, SPAUpstream: upstream.URL}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/thread", s.auth(s.handleThread))
	if err := s.mountUI(mux); err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != 200 || !strings.Contains(rr.Body.String(), "nitro-spa") {
		t.Fatalf("proxy spa: %d %s", rr.Code, rr.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/thread", nil)
	rr = httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("api want 401 got %d body=%s", rr.Code, rr.Body.String())
	}
}

