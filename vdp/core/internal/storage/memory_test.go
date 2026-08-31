package storage_test

import (
	"context"
	"testing"

	"github.com/viletech/vdp/core/internal/storage"
)

func TestMemoryBlobStoreRoundTrip(t *testing.T) {
	t.Parallel()
	s := storage.NewMemoryBlobStore()
	if err := s.Put(context.Background(), "k", "text/plain", []byte("hello")); err != nil {
		t.Fatal(err)
	}
	ct, data, err := s.Get(context.Background(), "k")
	if err != nil || ct != "text/plain" || string(data) != "hello" {
		t.Fatalf("got ct=%s data=%q err=%v", ct, data, err)
	}
	_ = s.Delete(context.Background(), "k")
	_, _, err = s.Get(context.Background(), "k")
	if err == nil {
		t.Fatal("expected missing")
	}
}
