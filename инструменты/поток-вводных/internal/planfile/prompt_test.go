package planfile

import (
	"os"
	"strings"
	"testing"
)

func TestWritePrompt(t *testing.T) {
	t.Parallel()
	ws := t.TempDir()
	path, err := WritePrompt(ws, "card-1", "Implement console hybrid")
	if err != nil {
		t.Fatal(err)
	}
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(b), "Implement console hybrid") {
		t.Fatalf("%s", b)
	}
}
