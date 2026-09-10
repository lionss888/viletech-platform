package planfile_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/viletech/tools/intake/internal/planfile"
)

func TestWriteMarkdown(t *testing.T) {
	t.Parallel()
	ws := t.TempDir()
	path, err := planfile.WriteMarkdown(ws, planfile.Document{
		CardID:         "card-100-1",
		Status:         "awaiting_approve",
		Class:          "bug",
		Summary:        "кнопка не открывается",
		Proposal:       "исправить: кнопка не открывается",
		TimelinePhrase: "около 1–2 рабочих часов",
		EngineerNote:   "orient test",
	})
	if err != nil {
		t.Fatal(err)
	}
	wantDir := filepath.Join(ws, ".cursor", "plans", "тгбот")
	if filepath.Dir(path) != wantDir {
		t.Fatalf("dir=%s want %s", filepath.Dir(path), wantDir)
	}
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	body := string(b)
	if !strings.Contains(body, "awaiting_approve") || !strings.Contains(body, "кнопка не открывается") {
		t.Fatalf("body=%s", body)
	}
}
