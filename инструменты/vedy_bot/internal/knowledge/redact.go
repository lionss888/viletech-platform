package knowledge

import (
	"regexp"
)

var (
	reEmail  = regexp.MustCompile(`(?i)[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}`)
	rePhone  = regexp.MustCompile(`(?:\+?\d[\d\-\s()]{8,}\d)`)
	reAPIKey = regexp.MustCompile(`(?i)\b(?:key_|crsr_)[A-Za-z0-9_\-]{8,}\b`)
)

// RedactText strips emails, phone-like strings, and API key patterns (crsr_… and key_…).
func RedactText(s string) string {
	s = reEmail.ReplaceAllString(s, "[email]")
	s = rePhone.ReplaceAllString(s, "[phone]")
	s = reAPIKey.ReplaceAllString(s, "[key]")
	return s
}
