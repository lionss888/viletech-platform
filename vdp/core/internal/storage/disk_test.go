package storage_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/viletech/vdp/core/internal/storage"
)

func TestDiskBlobStoreRoundTrip(t *testing.T) {
	t.Parallel()
	root := t.TempDir()
	s, err := storage.NewDiskBlobStore(root)
	if err != nil {
		t.Fatal(err)
	}
	if err := s.Put(context.Background(), "files/abc-1", "application/pdf", []byte("%PDF")); err != nil {
		t.Fatal(err)
	}
	ct, data, err := s.Get(context.Background(), "files/abc-1")
	if err != nil || ct != "application/pdf" || string(data) != "%PDF" {
		t.Fatalf("got ct=%s data=%q err=%v", ct, data, err)
	}
	if _, err := os.Stat(filepath.Join(root, "files", "abc-1")); err != nil {
		t.Fatalf("blob file missing: %v", err)
	}
	_ = s.Delete(context.Background(), "files/abc-1")
	if _, _, err := s.Get(context.Background(), "files/abc-1"); err == nil {
		t.Fatal("expected missing after delete")
	}
}

func TestDiskBlobStoreRejectsTraversal(t *testing.T) {
	t.Parallel()
	s, err := storage.NewDiskBlobStore(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	if err := s.Put(context.Background(), "../escape", "text/plain", []byte("x")); err == nil {
		t.Fatal("expected traversal reject")
	}
}
