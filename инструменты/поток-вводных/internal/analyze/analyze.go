package analyze

import (
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/viletech/tools/intake/internal/normalize"
)

// Confidence is a rule-based certainty band.
type Confidence string

const (
	ConfidenceLow    Confidence = "low"
	ConfidenceMedium Confidence = "medium"
	ConfidenceHigh   Confidence = "high"
)

// Result is heuristic analysis of intake text.
type Result struct {
	Class      string
	Confidence Confidence
	Chars      int
	Words      int
	Tags       []string
	Summary    string
	Question   string // non-empty when confidence is low (exactly one)
}

var reHashtag = regexp.MustCompile(`#[\p{L}\p{N}_]+`)

// Analyze classifies free text after trigger strip.
func Analyze(raw string, bot string) Result {
	text := normalize.StripTrigger(raw, bot)
	text = strings.TrimSpace(text)
	tags := reHashtag.FindAllString(text, -1)
	chars := utf8.RuneCountInString(text)
	words := len(strings.Fields(text))
	class := classify(text, tags)
	conf := confidence(chars, words, tags, class)
	res := Result{
		Class:      class,
		Confidence: conf,
		Chars:      chars,
		Words:      words,
		Tags:       tags,
	}
	res.Summary = formatSummary(res)
	if conf == ConfidenceLow {
		res.Question = "Уточните, пожалуйста, одним предложением: это баг, доработка, вопрос по UX или проверка связи?"
	}
	return res
}

func classify(text string, tags []string) string {
	lower := strings.ToLower(text)
	for _, tag := range tags {
		t := strings.ToLower(tag)
		if strings.Contains(t, "тест") || t == "#test" {
			return "test"
		}
		if strings.Contains(t, "bug") || strings.Contains(t, "баг") {
			return "bug"
		}
	}
	switch {
	case strings.Contains(lower, "баг") || strings.Contains(lower, "ошибк") || strings.Contains(lower, "не работ"):
		return "bug"
	case strings.Contains(lower, "доработ") || strings.Contains(lower, "добав") || strings.Contains(lower, "нужно"):
		return "change"
	case strings.Contains(lower, "не понят") || strings.Contains(lower, "как ") || strings.Contains(lower, "почему"):
		return "confused"
	case strings.Contains(lower, "пробел") || strings.Contains(lower, "нет ") || strings.Contains(lower, "gap"):
		return "gap"
	case strings.Contains(lower, "тест") || strings.Contains(lower, "провер"):
		return "test"
	case utf8.RuneCountInString(text) < 12:
		return "noise"
	default:
		return "change"
	}
}

func confidence(chars, words int, tags []string, class string) Confidence {
	if class == "noise" || chars < 20 || words < 3 {
		return ConfidenceLow
	}
	if len(tags) > 0 && chars >= 40 {
		return ConfidenceHigh
	}
	if chars >= 40 && words >= 6 {
		return ConfidenceMedium
	}
	return ConfidenceLow
}

func formatSummary(r Result) string {
	tagPart := "без тегов"
	if len(r.Tags) > 0 {
		tagPart = strings.Join(r.Tags, " ")
	}
	return "класс=" + r.Class + "; символов=" + itoa(r.Chars) + "; слов=" + itoa(r.Words) + "; теги: " + tagPart
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [16]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}
