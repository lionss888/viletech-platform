package planfile

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// TodoStatus matches Cursor plan frontmatter todos.
type TodoStatus string

const (
	TodoPending    TodoStatus = "pending"
	TodoInProgress TodoStatus = "in_progress"
	TodoCompleted  TodoStatus = "completed"
	TodoCancelled  TodoStatus = "cancelled"
)

// TodoItem is one Cursor-compatible plan todo.
type TodoItem struct {
	ID      string     `json:"id"`
	Content string     `json:"content"`
	Status  TodoStatus `json:"status"`
}

// PlanDoc is the Cursor-grade .plan.md model (frontmatter + markdown body).
type PlanDoc struct {
	Name      string     `json:"name"`
	Overview  string     `json:"overview"`
	Todos     []TodoItem `json:"todos"`
	IsProject bool       `json:"isProject"`
	CardID    string     `json:"card_id,omitempty"`
	Status    string     `json:"status,omitempty"`
	Class     string     `json:"class,omitempty"`
	Updated   string     `json:"updated,omitempty"`
	Body      string     `json:"body,omitempty"`
	Path      string     `json:"path,omitempty"`
	ID        string     `json:"id,omitempty"`
}

// Document is the legacy engineer-facing draft input (maps into PlanDoc).
type Document struct {
	CardID         string
	Status         string
	Class          string
	Summary        string
	Proposal       string
	TimelinePhrase string
	Conflicts      []string
	Steps          []string
	EngineerNote   string
	Todos          int
	Hours          float64
	PlanTodos      []TodoItem
}

// Dir under workspace: .cursor/plans/тгбот
func Dir(workspace string) string {
	return filepath.Join(workspace, ".cursor", "plans", "тгбот")
}

func safeName(name string) string {
	return strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		return '-'
	}, name)
}

// PathFor returns absolute path for a plan id (without extension in id).
func PathFor(workspace, id string) string {
	id = safeName(strings.TrimSuffix(id, ".plan.md"))
	id = strings.TrimSuffix(id, ".md")
	return filepath.Join(Dir(workspace), id+".plan.md")
}

// FromDocument builds a Cursor-compatible PlanDoc from HITL document fields.
func FromDocument(doc Document) PlanDoc {
	name := "tgbot " + doc.CardID
	if doc.CardID == "" {
		name = "tgbot draft"
	}
	overview := strings.TrimSpace(doc.Proposal)
	if overview == "" {
		overview = strings.TrimSpace(doc.Summary)
	}
	todos := doc.PlanTodos
	if len(todos) == 0 {
		steps := doc.Steps
		if len(steps) == 0 {
			steps = defaultSteps(doc.Class)
		}
		for i, s := range steps {
			todos = append(todos, TodoItem{
				ID:      fmt.Sprintf("step-%d", i+1),
				Content: s,
				Status:  TodoPending,
			})
		}
	}
	return PlanDoc{
		Name:      name,
		Overview:  overview,
		Todos:     todos,
		IsProject: false,
		CardID:    doc.CardID,
		Status:    doc.Status,
		Class:     doc.Class,
		Updated:   time.Now().UTC().Format(time.RFC3339),
		Body:      buildBody(doc),
		ID:        safeName(doc.CardID),
	}
}

func buildBody(doc Document) string {
	var b strings.Builder
	b.WriteString("# Черновик работ (тгбот)\n\n")
	b.WriteString("Статус HITL: **")
	b.WriteString(doc.Status)
	b.WriteString("**\n\n")
	b.WriteString("## Суть (redact)\n\n")
	b.WriteString(strings.TrimSpace(doc.Summary))
	b.WriteString("\n\n")
	if doc.Class != "" {
		b.WriteString("Класс сигнала: ")
		b.WriteString(doc.Class)
		b.WriteString("\n\n")
	}
	if len(doc.Conflicts) > 0 {
		b.WriteString("## Конфликты\n\n")
		for _, c := range doc.Conflicts {
			b.WriteString("- ")
			b.WriteString(c)
			b.WriteString("\n")
		}
		b.WriteString("\n")
	}
	b.WriteString("## Предложение\n\n")
	b.WriteString(strings.TrimSpace(doc.Proposal))
	b.WriteString("\n\n")
	b.WriteString("## Срок (менеджеру)\n\n")
	b.WriteString(strings.TrimSpace(doc.TimelinePhrase))
	b.WriteString("\n\n")
	if doc.EngineerNote != "" {
		b.WriteString("## Оценка (eng)\n\n")
		b.WriteString(doc.EngineerNote)
		b.WriteString("\n\n")
	}
	b.WriteString("Черновик для eng. Автозапуск работ из чата не выполняется.\n")
	return b.String()
}

// WritePlan writes PlanDoc as `.plan.md` with YAML frontmatter + todos.
func WritePlan(workspace string, doc PlanDoc) (string, error) {
	if strings.TrimSpace(workspace) == "" {
		return "", fmt.Errorf("workspace required")
	}
	if err := os.MkdirAll(Dir(workspace), 0o755); err != nil {
		return "", err
	}
	id := doc.ID
	if id == "" {
		id = safeName(doc.CardID)
	}
	if id == "" {
		id = fmt.Sprintf("card-%d", time.Now().Unix())
	}
	id = safeName(id)
	doc.ID = id
	if doc.Updated == "" {
		doc.Updated = time.Now().UTC().Format(time.RFC3339)
	}
	path := filepath.Join(Dir(workspace), id+".plan.md")
	raw, err := Encode(doc)
	if err != nil {
		return "", err
	}
	if err := os.WriteFile(path, []byte(raw), 0o644); err != nil {
		return "", err
	}
	return path, nil
}

// WriteMarkdown creates/updates the eng draft in Cursor plan format. Returns absolute path.
func WriteMarkdown(workspace string, doc Document) (string, error) {
	return WritePlan(workspace, FromDocument(doc))
}

// Encode serializes PlanDoc to frontmatter + body (stdlib-only YAML subset).
func Encode(doc PlanDoc) (string, error) {
	var b strings.Builder
	b.WriteString("---\n")
	b.WriteString("name: ")
	b.WriteString(yamlScalar(doc.Name))
	b.WriteString("\n")
	b.WriteString("overview: ")
	b.WriteString(yamlScalar(doc.Overview))
	b.WriteString("\n")
	b.WriteString("todos:\n")
	for _, todo := range doc.Todos {
		status := todo.Status
		if status == "" {
			status = TodoPending
		}
		b.WriteString("  - id: ")
		b.WriteString(yamlScalar(todo.ID))
		b.WriteString("\n")
		b.WriteString("    content: ")
		b.WriteString(yamlScalar(todo.Content))
		b.WriteString("\n")
		b.WriteString("    status: ")
		b.WriteString(string(status))
		b.WriteString("\n")
	}
	b.WriteString("isProject: ")
	b.WriteString(strconv.FormatBool(doc.IsProject))
	b.WriteString("\n")
	if doc.CardID != "" {
		b.WriteString("card_id: ")
		b.WriteString(yamlScalar(doc.CardID))
		b.WriteString("\n")
	}
	if doc.Status != "" {
		b.WriteString("status: ")
		b.WriteString(yamlScalar(doc.Status))
		b.WriteString("\n")
	}
	if doc.Class != "" {
		b.WriteString("class: ")
		b.WriteString(yamlScalar(doc.Class))
		b.WriteString("\n")
	}
	if doc.Updated != "" {
		b.WriteString("updated: ")
		b.WriteString(yamlScalar(doc.Updated))
		b.WriteString("\n")
	}
	b.WriteString("---\n\n")
	b.WriteString(strings.TrimSpace(doc.Body))
	b.WriteString("\n")
	return b.String(), nil
}

func yamlScalar(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return `""`
	}
	needsQuote := strings.ContainsAny(s, ":#{}[],&*!|>'\"%@`\n") ||
		strings.HasPrefix(s, "-") ||
		strings.Contains(s, "  ")
	if !needsQuote {
		return s
	}
	escaped := strings.ReplaceAll(s, `\`, `\\`)
	escaped = strings.ReplaceAll(escaped, `"`, `\"`)
	escaped = strings.ReplaceAll(escaped, "\n", `\n`)
	return `"` + escaped + `"`
}

var frontmatterRe = regexp.MustCompile(`(?s)^---\r?\n(.*?)\r?\n---\r?\n?(.*)$`)

// Parse reads Cursor-style plan markdown into PlanDoc.
func Parse(raw string) (PlanDoc, error) {
	raw = strings.TrimLeft(raw, "\ufeff")
	m := frontmatterRe.FindStringSubmatch(raw)
	if m == nil {
		return PlanDoc{}, fmt.Errorf("missing yaml frontmatter")
	}
	doc, err := parseFrontmatter(m[1])
	if err != nil {
		return PlanDoc{}, err
	}
	doc.Body = strings.TrimSpace(m[2])
	for i := range doc.Todos {
		if doc.Todos[i].Status == "" {
			doc.Todos[i].Status = TodoPending
		}
	}
	return doc, nil
}

func parseFrontmatter(fm string) (PlanDoc, error) {
	var doc PlanDoc
	lines := strings.Split(fm, "\n")
	var cur *TodoItem
	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trim := strings.TrimSpace(line)
		if trim == "" || strings.HasPrefix(trim, "#") {
			continue
		}
		if strings.HasPrefix(line, "  - ") || strings.HasPrefix(trim, "- id:") {
			if cur != nil {
				doc.Todos = append(doc.Todos, *cur)
			}
			cur = &TodoItem{Status: TodoPending}
			rest := strings.TrimPrefix(trim, "- ")
			if strings.HasPrefix(rest, "id:") {
				cur.ID = unquote(strings.TrimSpace(strings.TrimPrefix(rest, "id:")))
			}
			continue
		}
		if cur != nil && (strings.HasPrefix(line, "    ") || strings.HasPrefix(line, "\t")) {
			kv := strings.TrimSpace(line)
			key, val, ok := strings.Cut(kv, ":")
			if !ok {
				continue
			}
			val = unquote(strings.TrimSpace(val))
			switch strings.TrimSpace(key) {
			case "id":
				cur.ID = val
			case "content":
				cur.Content = val
			case "status":
				cur.Status = TodoStatus(val)
			}
			continue
		}
		if cur != nil {
			doc.Todos = append(doc.Todos, *cur)
			cur = nil
		}
		key, val, ok := strings.Cut(trim, ":")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		val = unquote(strings.TrimSpace(val))
		switch key {
		case "name":
			doc.Name = val
		case "overview":
			doc.Overview = val
		case "isProject":
			doc.IsProject = val == "true" || val == "yes" || val == "1"
		case "card_id":
			doc.CardID = val
		case "status":
			doc.Status = val
		case "class":
			doc.Class = val
		case "updated":
			doc.Updated = val
		case "todos":
			// list follows
		}
	}
	if cur != nil {
		doc.Todos = append(doc.Todos, *cur)
	}
	return doc, nil
}

func unquote(s string) string {
	if len(s) >= 2 && ((s[0] == '"' && s[len(s)-1] == '"') || (s[0] == '\'' && s[len(s)-1] == '\'')) {
		inner := s[1 : len(s)-1]
		inner = strings.ReplaceAll(inner, `\"`, `"`)
		inner = strings.ReplaceAll(inner, `\n`, "\n")
		return inner
	}
	return s
}

// Read loads a plan by id from workspace.
func Read(workspace, id string) (PlanDoc, error) {
	path := PathFor(workspace, id)
	b, err := os.ReadFile(path)
	if err != nil {
		return PlanDoc{}, err
	}
	doc, err := Parse(string(b))
	if err != nil {
		return PlanDoc{}, err
	}
	doc.Path = path
	doc.ID = safeName(strings.TrimSuffix(filepath.Base(path), ".plan.md"))
	return doc, nil
}

// ListByCard returns plans whose frontmatter card_id matches (or filename contains).
func ListByCard(workspace, cardID string) ([]PlanDoc, error) {
	dir := Dir(workspace)
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var out []PlanDoc
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if strings.HasSuffix(name, ".prompt.md") {
			continue
		}
		if !strings.HasSuffix(name, ".plan.md") && !strings.HasSuffix(name, ".md") {
			continue
		}
		b, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			continue
		}
		doc, err := Parse(string(b))
		if err != nil {
			continue
		}
		id := safeName(strings.TrimSuffix(strings.TrimSuffix(name, ".plan.md"), ".md"))
		doc.ID = id
		doc.Path = filepath.Join(dir, name)
		if cardID == "" || doc.CardID == cardID || strings.Contains(id, safeName(cardID)) {
			out = append(out, doc)
		}
	}
	return out, nil
}

// WritePrompt writes an engineer prompt beside the plan draft.
func WritePrompt(workspace, cardID, instruction string) (string, error) {
	if strings.TrimSpace(workspace) == "" {
		return "", fmt.Errorf("workspace required")
	}
	dir := Dir(workspace)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	name := cardID
	if name == "" {
		name = fmt.Sprintf("prompt-%d", time.Now().Unix())
	}
	name = safeName(name)
	path := filepath.Join(dir, name+".prompt.md")
	var b strings.Builder
	b.WriteString("# Указание агенту (из консоли intake)\n\n")
	b.WriteString("Обновлено: ")
	b.WriteString(time.Now().UTC().Format(time.RFC3339))
	b.WriteString("\n\n")
	b.WriteString(strings.TrimSpace(instruction))
	b.WriteString("\n")
	if err := os.WriteFile(path, []byte(b.String()), 0o644); err != nil {
		return "", err
	}
	return path, nil
}

func defaultSteps(class string) []string {
	switch class {
	case "bug":
		return []string{
			"Воспроизвести описанную ошибку на стенде",
			"Исправить поведение и закрыть проверками",
			"Сообщить менеджеру о готовности к просмотру",
		}
	case "test":
		return []string{
			"Подтвердить канал связи и шаблон ввода",
			"Зафиксировать результат проверки",
		}
	case "confused":
		return []string{
			"Уточнить сценарий у менеджера",
			"Предложить ясный следующий шаг в продукте",
		}
	default:
		return []string{
			"Уточнить объём и критерии готовности",
			"Подготовить изменения по согласованному предложению",
			"Пройти проверки и сообщить о результате менеджеру",
		}
	}
}
