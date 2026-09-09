package estimate

import (
	"fmt"
	"math"
	"unicode/utf8"
)

// TodosPerHour is the calendar orient from notes/ориентир-скорости-2026-08-25 (~3.8).
const TodosPerHour = 3.8

// Result is a size heuristic for manager-facing timelines.
type Result struct {
	Todos          int
	Hours          float64
	ManagerPhrase  string
	EngineerNote   string
}

// FromSignals maps class/size heuristics to hours using TodosPerHour.
func FromSignals(class string, chars, words int) Result {
	todos := 3
	switch class {
	case "noise", "test":
		todos = 1
	case "confused", "gap":
		todos = 2
	case "bug":
		todos = 4
	case "change":
		todos = 6
	}
	if chars > 200 || words > 40 {
		todos += 2
	}
	if chars > 400 || words > 80 {
		todos += 3
	}
	if utf8.RuneCountInString(class) == 0 {
		todos = 3
	}
	if todos < 1 {
		todos = 1
	}
	hours := float64(todos) / TodosPerHour
	return Result{
		Todos:         todos,
		Hours:         hours,
		ManagerPhrase: phrase(hours),
		EngineerNote:  fmt.Sprintf("orient ~%.1f todo/h; ~%d conditional todos → ~%.1fh", TodosPerHour, todos, hours),
	}
}

func phrase(hours float64) string {
	if hours < 0.75 {
		return "около часа"
	}
	if hours < 1.5 {
		return "около 1–2 рабочих часов"
	}
	if hours < 3.5 {
		return "около половины рабочего дня"
	}
	if hours < 7 {
		return "около одного рабочего дня"
	}
	days := int(math.Ceil(hours / 6.0))
	if days <= 2 {
		return "около 1–2 рабочих дней"
	}
	return fmt.Sprintf("около %d рабочих дней", days)
}
