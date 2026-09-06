package httpapi_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestNoRequireRolesInProdPaths ensures AuthZ 2B migration: no legacy RequireRoles call sites.
func TestNoRequireRolesInProdPaths(t *testing.T) {
	t.Parallel()
	roots := []string{
		filepath.Join("..", "..", "service"),
		filepath.Join(".."),
	}
	var hits []string
	for _, root := range roots {
		_ = filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
			if err != nil || info.IsDir() {
				return nil
			}
			if !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
				return nil
			}
			raw, err := os.ReadFile(path)
			if err != nil {
				return nil
			}
			if strings.Contains(string(raw), "RequireRoles(") {
				hits = append(hits, path)
			}
			return nil
		})
	}
	if len(hits) > 0 {
		t.Fatalf("legacy RequireRoles still present: %v", hits)
	}
}
