package storage

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// DiskBlobStore persists blob bytes under a root directory (survives process restart).
type DiskBlobStore struct {
	root string
}

// NewDiskBlobStore creates a store rooted at dir; creates the directory if missing.
func NewDiskBlobStore(root string) (*DiskBlobStore, error) {
	root = strings.TrimSpace(root)
	if root == "" {
		return nil, os.ErrInvalid
	}
	if err := os.MkdirAll(root, 0o755); err != nil {
		return nil, err
	}
	abs, err := filepath.Abs(root)
	if err != nil {
		return nil, err
	}
	return &DiskBlobStore{root: abs}, nil
}

func (s *DiskBlobStore) pathFor(key string) (string, error) {
	if key == "" || strings.Contains(key, "..") || strings.ContainsAny(key, "\x00") {
		return "", os.ErrInvalid
	}
	rel := filepath.FromSlash(strings.TrimPrefix(filepath.ToSlash(key), "/"))
	if rel == "" || rel == "." {
		return "", os.ErrInvalid
	}
	full := filepath.Join(s.root, rel)
	if !strings.HasPrefix(full, s.root+string(os.PathSeparator)) {
		return "", os.ErrInvalid
	}
	return full, nil
}

func (s *DiskBlobStore) Put(_ context.Context, key, contentType string, data []byte) error {
	path, err := s.pathFor(key)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	metaPath := path + ".ctype"
	_ = os.WriteFile(metaPath, []byte(contentType), 0o644)
	return os.Rename(tmp, path)
}

func (s *DiskBlobStore) Get(_ context.Context, key string) (string, []byte, error) {
	path, err := s.pathFor(key)
	if err != nil {
		return "", nil, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil, io.EOF
		}
		return "", nil, err
	}
	ct, _ := os.ReadFile(path + ".ctype")
	return string(ct), data, nil
}

func (s *DiskBlobStore) Delete(_ context.Context, key string) error {
	path, err := s.pathFor(key)
	if err != nil {
		return err
	}
	_ = os.Remove(path + ".ctype")
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}
