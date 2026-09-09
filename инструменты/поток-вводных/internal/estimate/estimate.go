package estimate

import (
	"fmt"
	"math"
	"strings"
)

// TodosPerHour is the calendar orient from notes/ориентир-скорости-2026-08-25 (~3.8).
const TodosPerHour = 3.8

// Result is a size heuristic for manager-facing timelines.
type Result struct {
	Todos         int
	Hours         float64
	ManagerPhrase string
	EngineerNote  string
}

// FromSignals maps this request's class/size/wording to calendar hours using TodosPerHour.
// Hours are buffered (~25%) so the manager phrase is closer to wall-clock delivery than raw agent tempo.
func FromSignals(class string, chars, words int, text string) Result {
	lower := strings.ToLower(strings.TrimSpace(text))
	todos := baseTodos(class)
	todos += lengthBump(chars, words)
	todos += contentBump(lower, class)
	if todos < 1 {
		todos = 1
	}
	raw := float64(todos) / TodosPerHour
	hours := raw * 1.25 // delivery / clarify / handoff buffer
	if hours < 0.5 {
		hours = 0.5
	}
	return Result{
		Todos:         todos,
		Hours:         hours,
		ManagerPhrase: phrase(hours),
		EngineerNote: fmt.Sprintf(
			"orient ~%.1f todo/h; ~%d conditional todos; raw ~%.1fh +25%% buffer → ~%.1fh; phrase=%s",
			TodosPerHour, todos, raw, hours, phrase(hours),
		),
	}
}

func baseTodos(class string) int {
	switch class {
	case "noise", "test":
		return 1
	case "confused":
		return 2
	case "gap":
		return 3
	case "bug":
		return 4
	case "change":
		return 5
	default:
		return 3
	}
}

func lengthBump(chars, words int) int {
	n := 0
	if chars > 160 || words > 30 {
		n++
	}
	if chars > 320 || words > 60 {
		n += 2
	}
	if chars > 600 || words > 100 {
		n += 2
	}
	return n
}

func contentBump(lower, class string) int {
	n := 0
	// Meta "just make a plan" — light, not a half-day feature.
	if containsAny(lower, "сформируй план", "план работ", "составь план", "оцени срок") &&
		!containsAny(lower, "реализуй", "сделай в кабинете", "почини", "добавь в") {
		if class == "change" || class == "gap" {
			return -2 // pull toward ~1h after buffer
		}
	}
	if containsAny(lower, "копирайт", "подпис", "текст кнопк", "формулировк") &&
		!containsAny(lower, "логик", "статусн", "платёж", "платеж", "роль") {
		n -= 1
	}
	if containsAny(lower, "платёж", "платеж", "провайдер", "комплаенс", "compliance", "банк") {
		n += 3
	}
	if containsAny(lower, "роли", "кабинет", "user", "manager", "provider", "заявк") {
		n += 1
	}
	if containsAny(lower, "интеграц", "api", "webhook", "ocr", "деплой", "миграц") {
		n += 2
	}
	if containsAny(lower, "все роли", "все кабинеты", "сквозн", "e2e", "матриц") {
		n += 3
	}
	if containsAny(lower, "срочно", "блокер", "вчера", "asap") {
		n += 1 // more care / risk, not less time
	}
	return n
}

func containsAny(s string, parts ...string) bool {
	for _, p := range parts {
		if strings.Contains(s, p) {
			return true
		}
	}
	return false
}

func phrase(hours float64) string {
	// Round up to whole working hours so the manager sees a concrete figure for this request.
	h := int(math.Ceil(hours - 1e-9))
	if h < 1 {
		h = 1
	}
	switch {
	case h == 1:
		return "около 1 рабочего часа"
	case h <= 8:
		return fmt.Sprintf("около %d рабочих часов", h)
	case h <= 12:
		return "около 1.5–2 рабочих дней"
	default:
		days := int(math.Ceil(float64(h) / 6.0))
		if days == 1 {
			return "около 1 рабочего дня"
		}
		return fmt.Sprintf("около %d рабочих дней", days)
	}
}
