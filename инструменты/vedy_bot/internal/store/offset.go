package store

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// LoadOffset reads last getUpdates offset.
func (s *Store) LoadOffset() (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	path := filepath.Join(s.home, "seen", "offset")
	b, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return 0, nil
		}
		return 0, err
	}
	v := strings.TrimSpace(string(b))
	if v == "" {
		return 0, nil
	}
	return strconv.ParseInt(v, 10, 64)
}

// SaveOffset persists next getUpdates offset.
func (s *Store) SaveOffset(offset int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	path := filepath.Join(s.home, "seen", "offset")
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	return os.WriteFile(path, []byte(strconv.FormatInt(offset, 10)+"\n"), 0o600)
}
