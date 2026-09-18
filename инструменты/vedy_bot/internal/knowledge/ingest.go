package knowledge

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// Service ingests sources into Store using Embedder.
type Service struct {
	Embedder Embedder
	Store    Store
	MaxRunes int
}

// IngestText redacts, chunks, embeds, and persists a document.
func (s *Service) IngestText(ctx context.Context, source, title, body string) (Document, error) {
	if s == nil || s.Embedder == nil || s.Store == nil {
		return Document{}, fmt.Errorf("ingest service not configured")
	}
	if err := RequireEmbedderKey(s.Embedder); err != nil {
		return Document{}, err
	}
	source = strings.TrimSpace(source)
	title = strings.TrimSpace(title)
	body = strings.TrimSpace(body)
	if body == "" {
		return Document{}, fmt.Errorf("body required")
	}
	safe := RedactText(body)
	id := makeDocID(source, title, safe)
	doc := Document{
		ID:        id,
		Source:    source,
		Title:     title,
		Body:      safe,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	chunks := ChunkText(id, safe, s.MaxRunes)
	if len(chunks) == 0 {
		return Document{}, fmt.Errorf("no chunks produced")
	}
	texts := make([]string, len(chunks))
	for i, c := range chunks {
		texts[i] = c.Text
	}
	embeddings, err := s.Embedder.Embed(ctx, texts)
	if err != nil {
		return Document{}, err
	}
	if len(embeddings) != len(chunks) {
		return Document{}, fmt.Errorf("embed count mismatch: got %d want %d", len(embeddings), len(chunks))
	}
	if err := s.Store.SaveDoc(ctx, doc); err != nil {
		return Document{}, err
	}
	if err := s.Store.SaveChunks(ctx, chunks); err != nil {
		return Document{}, err
	}
	vectors := make([]VectorRecord, len(chunks))
	for i, c := range chunks {
		vectors[i] = VectorRecord{
			ChunkID:   c.ID,
			DocID:     c.DocID,
			Text:      c.Text,
			Embedding: embeddings[i],
		}
	}
	if err := s.Store.SaveVectors(ctx, vectors); err != nil {
		return Document{}, err
	}
	return doc, nil
}

// IngestFile loads a file and ingests its contents.
func (s *Service) IngestFile(ctx context.Context, path string) (Document, error) {
	body, title, err := LoadFile(path)
	if err != nil {
		return Document{}, err
	}
	return s.IngestText(ctx, "file:"+filepath.Clean(path), title, body)
}

func makeDocID(source, title, body string) string {
	h := sha256.Sum256([]byte(source + "\n" + title + "\n" + body))
	return hex.EncodeToString(h[:16])
}

// Ensure CloudEmbedder empty key fails at ingest (honest error path).
func RequireEmbedderKey(e Embedder) error {
	if ce, ok := e.(*CloudEmbedder); ok {
		if strings.TrimSpace(ce.APIKey) == "" {
			return fmt.Errorf("embedding API key required")
		}
	}
	return nil
}

// LoadFileBytes is used by sources; kept here for IngestFile dependency without cycle.
func readFileLimited(path string, maxBytes int64) ([]byte, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil {
		return nil, err
	}
	if maxBytes > 0 && info.Size() > maxBytes {
		return nil, fmt.Errorf("file too large: %d bytes (max %d)", info.Size(), maxBytes)
	}
	return os.ReadFile(path)
}
