package planfile

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// Document is the engineer-facing draft (never linked in manager chat).
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
}

// Dir under workspace: .cursor/plans/тгбот
func Dir(workspace string) string {
	return filepath.Join(workspace, ".cursor", "plans", "тгбот")
}

// WriteMarkdown creates/updates the eng draft. Returns absolute path (for logs only).
func WriteMarkdown(workspace string, doc Document) (string, error) {
	if strings.TrimSpace(workspace) == "" {
		return "", fmt.Errorf("workspace required")
	}
	dir := Dir(workspace)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	name := doc.CardID
	if name == "" {
		name = fmt.Sprintf("card-%d", time.Now().Unix())
	}
	name = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		return '-'
	}, name)
	path := filepath.Join(dir, name+".md")
	var b strings.Builder
	b.WriteString("---\n")
	b.WriteString("name: tgbot ")
	b.WriteString(name)
	b.WriteString("\n")
	b.WriteString("status: ")
	b.WriteString(doc.Status)
	b.WriteString("\n")
	b.WriteString("card_id: ")
	b.WriteString(doc.CardID)
	b.WriteString("\n")
	b.WriteString("updated: ")
	b.WriteString(time.Now().UTC().Format(time.RFC3339))
	b.WriteString("\n---\n\n")
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
	b.WriteString("## Шаги черновика\n\n")
	steps := doc.Steps
	if len(steps) == 0 {
		steps = defaultSteps(doc.Class)
	}
	for i, s := range steps {
		b.WriteString(fmt.Sprintf("%d. %s\n", i+1, s))
	}
	b.WriteString("\n")
	b.WriteString("Черновик для eng. Оценка срока — ориентир по скорости команды; автозапуск работ из чата не выполняется.\n")
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
