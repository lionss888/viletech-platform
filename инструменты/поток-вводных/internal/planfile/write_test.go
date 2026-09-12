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
	if !strings.HasSuffix(path, ".plan.md") {
		t.Fatalf("want .plan.md path, got %s", path)
	}
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	body := string(b)
	if !strings.Contains(body, "awaiting_approve") || !strings.Contains(body, "кнопка не открывается") {
		t.Fatalf("body=%s", body)
	}
	if !strings.Contains(body, "todos:") || !strings.Contains(body, "status: pending") {
		t.Fatalf("missing todos frontmatter: %s", body)
	}
}

func TestPlanRoundTrip(t *testing.T) {
	t.Parallel()
	ws := t.TempDir()
	orig := planfile.PlanDoc{
		Name:     "demo plan",
		Overview: "short overview",
		Todos: []planfile.TodoItem{
			{ID: "a1", Content: "do one", Status: planfile.TodoPending},
			{ID: "a2", Content: "do two", Status: planfile.TodoCompleted},
		},
		IsProject: false,
		CardID:    "card-9-9",
		Status:    "awaiting_approve",
		Body:      "# Body\n\nHello",
		ID:        "card-9-9",
	}
	path, err := planfile.WritePlan(ws, orig)
	if err != nil {
		t.Fatal(err)
	}
	got, err := planfile.Read(ws, "card-9-9")
	if err != nil {
		t.Fatal(err)
	}
	if got.Name != orig.Name || got.Overview != orig.Overview {
		t.Fatalf("meta mismatch %+v", got)
	}
	if len(got.Todos) != 2 || got.Todos[1].Status != planfile.TodoCompleted {
		t.Fatalf("todos=%+v", got.Todos)
	}
	if !strings.Contains(got.Body, "Hello") {
		t.Fatalf("body=%q", got.Body)
	}
	if got.Path != path {
		t.Fatalf("path=%s want %s", got.Path, path)
	}
}
