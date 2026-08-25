package storage

import (
	"context"
	"io"
	"sync"
)

// BlobStore is the file content contract (S3-compatible stub OK for R4).
type BlobStore interface {
	Put(ctx context.Context, key string, contentType string, data []byte) error
	Get(ctx context.Context, key string) (contentType string, data []byte, err error)
	Delete(ctx context.Context, key string) error
}

type MemoryBlobStore struct {
	mu   sync.RWMutex
	data map[string]blob
}

type blob struct {
	contentType string
	bytes       []byte
}

func NewMemoryBlobStore() *MemoryBlobStore {
	return &MemoryBlobStore{data: map[string]blob{}}
}

func (s *MemoryBlobStore) Put(_ context.Context, key, contentType string, data []byte) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := make([]byte, len(data))
	copy(cp, data)
	s.data[key] = blob{contentType: contentType, bytes: cp}
	return nil
}

func (s *MemoryBlobStore) Get(_ context.Context, key string) (string, []byte, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	b, ok := s.data[key]
	if !ok {
		return "", nil, io.EOF
	}
	cp := make([]byte, len(b.bytes))
	copy(cp, b.bytes)
	return b.contentType, cp, nil
}

func (s *MemoryBlobStore) Delete(_ context.Context, key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.data, key)
	return nil
}
