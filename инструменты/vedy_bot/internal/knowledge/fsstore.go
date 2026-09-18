package knowledge

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
)

// FSStore persists knowledge under root (typically INTAKE_HOME/knowledge).
type FSStore struct {
	mu   sync.Mutex
	root string
}

// NewFSStore creates a filesystem store at root.
func NewFSStore(root string) *FSStore {
	return &FSStore{root: root}
}

// Root returns the knowledge directory.
func (s *FSStore) Root() string {
	if s == nil {
		return ""
	}
	return s.root
}

// SaveDoc writes docs/{id}/meta.json + body.md and appends manifest.jsonl.
func (s *FSStore) SaveDoc(_ context.Context, doc Document) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if doc.ID == "" {
		return fmt.Errorf("document id required")
	}
	dir := filepath.Join(s.root, "docs", sanitizePath(doc.ID))
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	meta := Document{
		ID:        doc.ID,
		Source:    doc.Source,
		Title:     doc.Title,
		CreatedAt: doc.CreatedAt,
	}
	metaBytes, err := json.MarshalIndent(meta, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(dir, "meta.json"), metaBytes, 0o600); err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(dir, "body.md"), []byte(doc.Body), 0o600); err != nil {
		return err
	}
	if err := os.MkdirAll(s.root, 0o700); err != nil {
		return err
	}
	f, err := os.OpenFile(filepath.Join(s.root, "manifest.jsonl"), os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	defer f.Close()
	return json.NewEncoder(f).Encode(meta)
}

// SaveChunks writes docs/{docID}/chunks.json (grouped by doc).
func (s *FSStore) SaveChunks(_ context.Context, chunks []Chunk) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	byDoc := map[string][]Chunk{}
	for _, c := range chunks {
		byDoc[c.DocID] = append(byDoc[c.DocID], c)
	}
	for docID, list := range byDoc {
		dir := filepath.Join(s.root, "docs", sanitizePath(docID))
		if err := os.MkdirAll(dir, 0o700); err != nil {
			return err
		}
		b, err := json.MarshalIndent(list, "", "  ")
		if err != nil {
			return err
		}
		if err := os.WriteFile(filepath.Join(dir, "chunks.json"), b, 0o600); err != nil {
			return err
		}
	}
	return nil
}

// SaveVectors writes vectors/{chunkID}.json with embedding float32 array.
func (s *FSStore) SaveVectors(_ context.Context, vectors []VectorRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	dir := filepath.Join(s.root, "vectors")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	for _, v := range vectors {
		if v.ChunkID == "" {
			return fmt.Errorf("chunk_id required")
		}
		name := sanitizePath(v.ChunkID) + ".json"
		b, err := json.MarshalIndent(v, "", "  ")
		if err != nil {
			return err
		}
		if err := os.WriteFile(filepath.Join(dir, name), b, 0o600); err != nil {
			return err
		}
	}
	return nil
}

// ListChunks loads all chunk records from docs/*/chunks.json.
func (s *FSStore) ListChunks(_ context.Context) ([]Chunk, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	docsDir := filepath.Join(s.root, "docs")
	entries, err := os.ReadDir(docsDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var out []Chunk
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		b, err := os.ReadFile(filepath.Join(docsDir, e.Name(), "chunks.json"))
		if err != nil {
			if os.IsNotExist(err) {
				continue
			}
			return nil, err
		}
		var chunks []Chunk
		if err := json.Unmarshal(b, &chunks); err != nil {
			return nil, err
		}
		out = append(out, chunks...)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].DocID != out[j].DocID {
			return out[i].DocID < out[j].DocID
		}
		return out[i].Index < out[j].Index
	})
	return out, nil
}

// LoadVectors loads all vectors/{chunkID}.json files.
func (s *FSStore) LoadVectors(_ context.Context) ([]VectorRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	dir := filepath.Join(s.root, "vectors")
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var out []VectorRecord
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		b, err := os.ReadFile(filepath.Join(dir, e.Name()))
		if err != nil {
			return nil, err
		}
		var v VectorRecord
		if err := json.Unmarshal(b, &v); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ChunkID < out[j].ChunkID })
	return out, nil
}

func sanitizePath(id string) string {
	id = strings.ReplaceAll(id, "/", "_")
	id = strings.ReplaceAll(id, "\\", "_")
	id = strings.ReplaceAll(id, "..", "_")
	return id
}
