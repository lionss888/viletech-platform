package experience_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/viletech/tools/intake/internal/experience"
)

func TestAppend(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	if err := experience.Append(home, experience.Event{CardID: "card-1", Kind: "proposal", Class: "bug"}); err != nil {
		t.Fatal(err)
	}
	entries, err := os.ReadDir(filepath.Join(home, "experience"))
	if err != nil || len(entries) != 1 {
		t.Fatalf("entries=%v err=%v", entries, err)
	}
	b, _ := os.ReadFile(filepath.Join(home, "experience", entries[0].Name()))
	if !strings.Contains(string(b), `"kind":"proposal"`) {
		t.Fatalf("body=%s", b)
	}
}
