package knowledge

import "context"

// Document is one ingested knowledge source.
type Document struct {
	ID        string `json:"id"`
	Source    string `json:"source"`
	Title     string `json:"title"`
	Body      string `json:"body,omitempty"`
	CreatedAt string `json:"created_at,omitempty"`
}

// Chunk is a stable slice of a document for embedding.
type Chunk struct {
	ID    string `json:"id"`
	DocID string `json:"doc_id"`
	Index int    `json:"index"`
	Text  string `json:"text"`
}

// VectorRecord persists an embedding for a chunk.
type VectorRecord struct {
	ChunkID   string    `json:"chunk_id"`
	DocID     string    `json:"doc_id,omitempty"`
	Text      string    `json:"text,omitempty"`
	Embedding []float32 `json:"embedding"`
}

// ContextPack is retrieved knowledge for an agent prompt.
type ContextPack struct {
	Summary   string
	Chunks    []Chunk
	Citations []string
	Scores    []float64
}

// Embedder turns texts into dense vectors.
type Embedder interface {
	Embed(ctx context.Context, texts []string) ([][]float32, error)
}

// Store persists documents, chunks, and vectors.
type Store interface {
	SaveDoc(ctx context.Context, doc Document) error
	SaveChunks(ctx context.Context, chunks []Chunk) error
	SaveVectors(ctx context.Context, vectors []VectorRecord) error
	ListChunks(ctx context.Context) ([]Chunk, error)
	LoadVectors(ctx context.Context) ([]VectorRecord, error)
}

// Retriever finds relevant chunks for a query.
type Retriever interface {
	Search(ctx context.Context, query string, topN int) (ContextPack, error)
}
