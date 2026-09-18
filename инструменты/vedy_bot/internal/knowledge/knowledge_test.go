package knowledge

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"unicode/utf8"
)

func TestRedactText(t *testing.T) {
	t.Parallel()
	in := "contact me@example.com or +79991234567 with key_abc12345XYZ"
	got := RedactText(in)
	if strings.Contains(got, "me@example.com") {
		t.Fatalf("email not redacted: %q", got)
	}
	if strings.Contains(got, "+79991234567") {
		t.Fatalf("phone not redacted: %q", got)
	}
	if strings.Contains(got, "key_abc12345XYZ") {
		t.Fatalf("api key not redacted: %q", got)
	}
	if !strings.Contains(got, "[email]") || !strings.Contains(got, "[phone]") || !strings.Contains(got, "[key]") {
		t.Fatalf("expected placeholders, got %q", got)
	}
}

func TestChunkTextStableIDs(t *testing.T) {
	t.Parallel()
	text := "First paragraph about payments.\n\nSecond paragraph about providers and assignment."
	chunks := ChunkText("docA", text, 40)
	if len(chunks) < 2 {
		t.Fatalf("expected multiple chunks, got %d", len(chunks))
	}
	for i, c := range chunks {
		want := "docA:" + strconv.Itoa(i)
		if c.ID != want {
			t.Fatalf("chunk %d id=%q want %q", i, c.ID, want)
		}
		if c.DocID != "docA" || c.Index != i {
			t.Fatalf("chunk meta %+v", c)
		}
		if c.Text == "" {
			t.Fatal("empty chunk text")
		}
	}
}

func TestIngestSearchHit(t *testing.T) {
	t.Parallel()
	root := t.TempDir()
	st := NewFSStore(root)
	svc := &Service{Embedder: &MockEmbedder{}, Store: st, MaxRunes: 200}
	ctx := context.Background()
	doc, err := svc.IngestText(ctx, "test", "providers", "Manager assigns payment provider for foreign currency transfer.")
	if err != nil {
		t.Fatal(err)
	}
	if doc.ID == "" {
		t.Fatal("empty doc id")
	}
	ret := &CosineRetriever{Embedder: &MockEmbedder{}, Store: st, KeywordBoost: true}
	pack, err := ret.Search(ctx, "assign payment provider", 3)
	if err != nil {
		t.Fatal(err)
	}
	if len(pack.Chunks) == 0 {
		t.Fatal("expected search hit")
	}
	joined := ""
	for _, c := range pack.Chunks {
		joined += c.Text
	}
	if !strings.Contains(strings.ToLower(joined), "provider") {
		t.Fatalf("unexpected pack: %+v", pack)
	}
	formatted := pack.FormatBudget(80)
	if utf8.RuneCountInString(formatted) > 80 {
		t.Fatalf("format budget exceeded: %d", utf8.RuneCountInString(formatted))
	}
}

func TestCloudEmbedderNoKey(t *testing.T) {
	t.Parallel()
	e := &CloudEmbedder{BaseURL: "http://example.invalid/v1", APIKey: "", Model: "m"}
	_, err := e.Embed(context.Background(), []string{"hi"})
	if err == nil {
		t.Fatal("expected error without API key")
	}
	if !strings.Contains(err.Error(), "API key") {
		t.Fatalf("err=%v", err)
	}
	svc := &Service{Embedder: e, Store: NewFSStore(t.TempDir())}
	_, err = svc.IngestText(context.Background(), "s", "t", "body text here")
	if err == nil || !strings.Contains(err.Error(), "API key") {
		t.Fatalf("ingest without key: %v", err)
	}
}

func TestCloudEmbedderHTTP(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/embeddings" {
			http.NotFound(w, r)
			return
		}
		if r.Header.Get("Authorization") != "Bearer test-key" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		var req embedRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		type item struct {
			Embedding []float32 `json:"embedding"`
			Index     int       `json:"index"`
		}
		data := make([]item, len(req.Input))
		for i := range req.Input {
			data[i] = item{Index: i, Embedding: []float32{0.1, 0.2, 0.3}}
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"data": data})
	}))
	t.Cleanup(srv.Close)

	e := &CloudEmbedder{
		BaseURL:    srv.URL,
		APIKey:     "test-key",
		Model:      "text-embedding-3-small",
		HTTPClient: srv.Client(),
	}
	vecs, err := e.Embed(context.Background(), []string{"one", "two"})
	if err != nil {
		t.Fatal(err)
	}
	if len(vecs) != 2 || len(vecs[0]) != 3 {
		t.Fatalf("vecs=%v", vecs)
	}
}

func TestSourcesLoadDirAndVDP(t *testing.T) {
	dir := t.TempDir()
	_ = os.WriteFile(filepath.Join(dir, "a.md"), []byte("# hello"), 0o600)
	_ = os.WriteFile(filepath.Join(dir, "b.txt"), []byte("plain"), 0o600)
	_ = os.WriteFile(filepath.Join(dir, "c.go"), []byte("package x"), 0o600)
	_ = os.WriteFile(filepath.Join(dir, "skip.bin"), []byte{0x00}, 0o600)
	docs, err := LoadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(docs) != 3 {
		t.Fatalf("got %d docs", len(docs))
	}
	title, body := SnapshotThread([]ThreadMessage{{From: "m", Text: "need help"}})
	if title == "" || !strings.Contains(body, "need help") {
		t.Fatalf("snapshot %q %q", title, body)
	}
	export := t.TempDir()
	_ = os.WriteFile(filepath.Join(export, "status.md"), []byte("map"), 0o600)
	_ = os.WriteFile(filepath.Join(export, "x.txt"), []byte("no"), 0o600)
	t.Setenv("INTAKE_VDP_EXPORT_DIR", export)
	vdocs, err := VDPExport()
	if err != nil {
		t.Fatal(err)
	}
	if len(vdocs) != 1 || vdocs[0].Title != "status" {
		t.Fatalf("vdp export=%+v", vdocs)
	}
}
