package planfile_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/viletech/tools/vedy_bot/internal/analytics"
	"github.com/viletech/tools/vedy_bot/internal/planfile"
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

func TestDocumentFromAnalytics(t *testing.T) {
	t.Parallel()
	b := analytics.Run("@bot #баг падает кнопка оплаты на экране кабинета", "bot")
	doc := planfile.DocumentFromAnalytics("card-1-2", "awaiting_approve", "sum", "prop", b)
	if doc.CardID != "card-1-2" || doc.Proposal != "prop" {
		t.Fatalf("doc=%+v", doc)
	}
	if doc.Class != b.Class {
		t.Fatalf("class=%q want %q", doc.Class, b.Class)
	}
	if doc.TimelinePhrase != b.Estimate.ManagerPhrase {
		t.Fatalf("timeline=%q", doc.TimelinePhrase)
	}
	if doc.Todos != b.Estimate.Todos {
		t.Fatalf("todos=%d", doc.Todos)
	}
}

func TestParseCursorStyleFixture(t *testing.T) {
	t.Parallel()
	raw := "---\n" +
		"name: AP0 Intake harden\n" +
		"overview: Матрица триггер→HITL/thread, unit на media-only. Модуль инструменты/vedy_bot.\n" +
		"todos:\n" +
		"  - id: ap0-matrix\n" +
		"    content: Зафиксировать матрицу триггер→inbox/HITL vs thread-only + /help copy\n" +
		"    status: completed\n" +
		"  - id: ap0-tests\n" +
		"    content: Unit classify + media-only path; make test green\n" +
		"    status: in_progress\n" +
		"  - id: ap0-readme\n" +
		"    content: README honesty совпадает с поведением\n" +
		"    status: pending\n" +
		"isProject: false\n" +
		"---\n\n" +
		"# AP0 — Harden intake\n\nЦель: матрица.\n"
	got, err := planfile.Parse(raw)
	if err != nil {
		t.Fatal(err)
	}
	if got.Name != "AP0 Intake harden" {
		t.Fatalf("name=%q", got.Name)
	}
	if !strings.Contains(got.Overview, "HITL") {
		t.Fatalf("overview=%q", got.Overview)
	}
	if len(got.Todos) != 3 {
		t.Fatalf("todos=%+v", got.Todos)
	}
	if got.Todos[0].Status != planfile.TodoCompleted || got.Todos[1].Status != planfile.TodoInProgress {
		t.Fatalf("statuses=%+v", got.Todos)
	}
	if !strings.Contains(got.Body, "Harden intake") {
		t.Fatalf("body=%q", got.Body)
	}
}

func TestEncodeParseQuotedOverviewRoundTrip(t *testing.T) {
	t.Parallel()
	orig := planfile.PlanDoc{
		Name:     "quoted",
		Overview: `Единый DTO: class, confidence; "summary" + conflicts`,
		Todos: []planfile.TodoItem{
			{ID: "", Content: "  fill id  ", Status: "bogus"},
			{ID: "keep", Content: "ok", Status: planfile.TodoCancelled},
		},
		IsProject: false,
		Body:      "## Body\n\nline",
		ID:        "rt-1",
	}
	raw, err := planfile.Encode(orig)
	if err != nil {
		t.Fatal(err)
	}
	got, err := planfile.Parse(raw)
	if err != nil {
		t.Fatal(err)
	}
	if got.Overview != orig.Overview {
		t.Fatalf("overview got %q want %q", got.Overview, orig.Overview)
	}
	if got.Todos[0].ID != "todo-1" || got.Todos[0].Status != planfile.TodoPending {
		t.Fatalf("normalized todo0=%+v", got.Todos[0])
	}
	if got.Todos[1].Status != planfile.TodoCancelled {
		t.Fatalf("todo1=%+v", got.Todos[1])
	}
}

func TestHITLWriteMarkdownCursorParity(t *testing.T) {
	t.Parallel()
	ws := t.TempDir()
	path, err := planfile.WriteMarkdown(ws, planfile.DocumentFromAnalytics(
		"card-hitl-1", "awaiting_approve", "кнопка оплаты", "исправить кнопку",
		analytics.Run("@bot #баг падает кнопка", "bot"),
	))
	if err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	got, err := planfile.Parse(string(raw))
	if err != nil {
		t.Fatal(err)
	}
	if got.Name == "" || len(got.Todos) == 0 {
		t.Fatalf("cursor fields missing: %+v", got)
	}
	if !strings.Contains(string(raw), "isProject: false") {
		t.Fatalf("missing isProject in %s", string(raw))
	}
	for _, todo := range got.Todos {
		if todo.ID == "" || todo.Content == "" || !planfile.ValidTodoStatus(todo.Status) {
			t.Fatalf("bad todo %+v", todo)
		}
	}
}

func TestListByCardAllAndFilter(t *testing.T) {
	t.Parallel()
	ws := t.TempDir()
	_, err := planfile.WritePlan(ws, planfile.PlanDoc{
		Name: "a", Overview: "o", CardID: "card-a", ID: "card-a",
		Todos: []planfile.TodoItem{{ID: "t1", Content: "x", Status: planfile.TodoPending}},
	})
	if err != nil {
		t.Fatal(err)
	}
	_, err = planfile.WritePlan(ws, planfile.PlanDoc{
		Name: "b", Overview: "o", CardID: "card-b", ID: "card-b",
		Todos: []planfile.TodoItem{{ID: "t1", Content: "y", Status: planfile.TodoPending}},
	})
	if err != nil {
		t.Fatal(err)
	}
	all, err := planfile.ListByCard(ws, "")
	if err != nil || len(all) != 2 {
		t.Fatalf("all=%d err=%v", len(all), err)
	}
	only, err := planfile.ListByCard(ws, "card-b")
	if err != nil || len(only) != 1 || only[0].CardID != "card-b" {
		t.Fatalf("filter=%+v err=%v", only, err)
	}
}
