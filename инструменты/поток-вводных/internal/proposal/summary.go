package proposal

import (
	"strings"
	"unicode/utf8"

	"github.com/viletech/tools/intake/internal/normalize"
)

// Summary builds a short manager-facing proposal line from intake text.
func Summary(raw, bot, class string) string {
	text := strings.TrimSpace(normalize.StripTrigger(raw, bot))
	text = stripHashtags(text)
	text = collapse(text)
	if text == "" {
		return defaultByClass(class)
	}
	// Keep first sentence-ish, max ~180 runes.
	cut := text
	for _, sep := range []string{". ", "! ", "? ", "\n"} {
		if i := strings.Index(cut, sep); i > 20 {
			cut = cut[:i]
			break
		}
	}
	if utf8.RuneCountInString(cut) > 180 {
		r := []rune(cut)
		cut = string(r[:180]) + "…"
	}
	verb := "сделать"
	switch class {
	case "bug":
		verb = "исправить"
	case "test":
		verb = "проверить"
	case "confused":
		verb = "прояснить"
	case "gap":
		verb = "закрыть пробел"
	}
	return verb + ": " + cut
}

func defaultByClass(class string) string {
	switch class {
	case "bug":
		return "разобрать и исправить описанную ошибку"
	case "test":
		return "провести проверку связи и зафиксировать результат"
	case "confused":
		return "прояснить сценарий и предложить понятный следующий шаг"
	case "gap":
		return "закрыть описанный пробел в процессе"
	default:
		return "выполнить описанную доработку по согласованному объёму"
	}
}

func stripHashtags(s string) string {
	fields := strings.Fields(s)
	var keep []string
	for _, f := range fields {
		if strings.HasPrefix(f, "#") {
			continue
		}
		keep = append(keep, f)
	}
	return strings.Join(keep, " ")
}

func collapse(s string) string {
	return strings.Join(strings.Fields(s), " ")
}
