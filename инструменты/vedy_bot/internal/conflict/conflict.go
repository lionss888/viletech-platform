package conflict

import (
	"strings"
	"unicode/utf8"
)

// Finding is one plain-language contradiction for the manager.
type Finding struct {
	Plain    string
	Question string
}

// Detect returns rule-based conflicts for the current intake text.
func Detect(class string, tags []string, text string, previous []string) []Finding {
	body := stripTags(strings.TrimSpace(text))
	lower := strings.ToLower(body)
	var out []Finding
	tagBug := hasTag(tags, "баг", "bug")
	tagChange := hasTag(tags, "доработ", "change", "фич")
	tagTest := hasTag(tags, "тест", "test")
	asksFeature := containsAny(lower, "добав", "доработ", "новую функ", "сделать фич", "нужна фич", "кнопк")
	asksBug := containsAny(lower, "ошибк", "не работ", "сломал", "падает")
	asksTest := containsAny(lower, "проверк связи", "проверка связи", "тест связи")

	if tagBug && asksFeature && !asksBug {
		out = append(out, Finding{
			Plain:    "в сообщении тег про ошибку, а по тексту похоже на доработку.",
			Question: "Это исправление ошибки или новая доработка?",
		})
	}
	if (tagChange || class == "change") && asksBug && !asksFeature {
		out = append(out, Finding{
			Plain:    "тег про доработку, а по тексту — про ошибку.",
			Question: "Нужно починить ошибку или сделать доработку?",
		})
	}
	if tagTest && (asksBug || asksFeature) && !asksTest {
		out = append(out, Finding{
			Plain:    "тег про проверку, а текст описывает рабочую задачу.",
			Question: "Это только проверка связи или реальное задание?",
		})
	}
	if class == "noise" || utf8.RuneCountInString(lower) < 12 {
		if containsAny(lower, "план", "сделать", "нужно", "надо") {
			out = append(out, Finding{
				Plain:    "просят план или работу, но текста слишком мало.",
				Question: "Опишите задачу одним-двумя предложениями: что сделать и зачем?",
			})
		}
	}
	for _, prev := range previous {
		p := strings.ToLower(stripTags(strings.TrimSpace(prev)))
		if p == "" {
			continue
		}
		if negates(p, lower) || negates(lower, p) {
			out = append(out, Finding{
				Plain:    "новое сообщение расходится с предыдущим по этой теме.",
				Question: "Какой вариант актуальный — оставить как раньше или как в новом сообщении?",
			})
			break
		}
	}
	return out
}

func stripTags(s string) string {
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

func hasTag(tags []string, parts ...string) bool {
	for _, t := range tags {
		tl := strings.ToLower(t)
		for _, p := range parts {
			if strings.Contains(tl, p) {
				return true
			}
		}
	}
	return false
}

func containsAny(s string, parts ...string) bool {
	for _, p := range parts {
		if strings.Contains(s, p) {
			return true
		}
	}
	return false
}

func negates(older, newer string) bool {
	// "сделать X" then "не делать X" / "не надо"
	if !containsAny(older, "сделать", "нужно", "надо", "добав") {
		return false
	}
	if containsAny(newer, "не делать", "не надо", "не нужно", "отменить", "не делаем") {
		return true
	}
	return false
}
