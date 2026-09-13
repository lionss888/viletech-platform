package redact

import (
	"regexp"
	"strings"
)

var (
	reEmail = regexp.MustCompile(`(?i)[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}`)
	rePhone = regexp.MustCompile(`(?:\+?\d[\d\-\s()]{8,}\d)`)
	rePassport = regexp.MustCompile(`(?i)\b(?:passport|паспорт)\s*[:#]?\s*\d{4,}`)
	reINN = regexp.MustCompile(`(?i)\b(?:inn|инн)\s*[:#]?\s*\d{10,12}\b`)
	reCard = regexp.MustCompile(`\b(?:\d[ -]*?){13,19}\b`)
)

// Text masks common PII patterns in free text.
func Text(s string) string {
	s = reEmail.ReplaceAllString(s, "[email]")
	s = rePassport.ReplaceAllString(s, "[passport]")
	s = reINN.ReplaceAllString(s, "[inn]")
	s = reCard.ReplaceAllStringFunc(s, func(m string) string {
		digits := strings.Count(m, "0") + strings.Count(m, "1") + strings.Count(m, "2") +
			strings.Count(m, "3") + strings.Count(m, "4") + strings.Count(m, "5") +
			strings.Count(m, "6") + strings.Count(m, "7") + strings.Count(m, "8") + strings.Count(m, "9")
		if digits < 13 {
			return m
		}
		return "[card]"
	})
	s = rePhone.ReplaceAllString(s, "[phone]")
	return s
}
