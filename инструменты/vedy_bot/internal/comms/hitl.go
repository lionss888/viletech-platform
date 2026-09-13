package comms

import (
	"strings"
	"unicode"
)

// HitlDecision is manager yes/no on a proposal.
type HitlDecision string

const (
	HitlNone     HitlDecision = ""
	HitlApprove  HitlDecision = "approve"
	HitlDecline  HitlDecision = "decline"
)

var approveWords = []string{"да", "выполнить", "согласен", "согласна", "ок", "okay", "yes", "approve", "делай", "запускай"}
var declineWords = []string{"нет", "отклонить", "не надо", "не нужно", "cancel", "decline", "отмена", "стоп"}

// ParseHitlDecision detects approve/decline in stripped text.
// Long free-form intakes are ignored so "ок, нужно добавить…" stays a new request.
func ParseHitlDecision(stripped string) HitlDecision {
	t := strings.ToLower(strings.TrimSpace(stripped))
	if t == "" {
		return HitlNone
	}
	fields := strings.FieldsFunc(t, func(r rune) bool {
		return unicode.IsSpace(r) || r == ',' || r == '.' || r == '!' || r == '?'
	})
	if len(fields) > 6 {
		return HitlNone
	}
	// Prefer decline if both somehow present with "не выполнять".
	if strings.Contains(t, "не выполнять") || strings.Contains(t, "не надо выполнять") {
		return HitlDecline
	}
	for _, w := range declineWords {
		if hasWord(t, w) {
			return HitlDecline
		}
	}
	for _, w := range approveWords {
		if hasWord(t, w) {
			return HitlApprove
		}
	}
	return HitlNone
}

func hasWord(text, word string) bool {
	if text == word {
		return true
	}
	if strings.HasPrefix(text, word+" ") || strings.HasSuffix(text, " "+word) || strings.Contains(text, " "+word+" ") {
		return true
	}
	// Single-token short replies.
	fields := strings.FieldsFunc(text, func(r rune) bool {
		return unicode.IsSpace(r) || r == ',' || r == '.' || r == '!' || r == '?'
	})
	for _, f := range fields {
		if f == word {
			return true
		}
	}
	return false
}
